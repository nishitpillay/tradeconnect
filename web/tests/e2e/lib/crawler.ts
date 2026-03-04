import { Page } from '@playwright/test';

export interface CrawlerOptions {
  startUrl: string;
  maxPages?: number;
  skipPatterns?: RegExp[];
  allowPatterns?: RegExp[];
  onPageVisit?: (url: string, page: Page) => Promise<void>;
  onError?: (url: string, error: Error) => Promise<void>;
}

export interface CrawlResult {
  visited: string[];
  broken: { url: string; error: string }[];
  skipped: string[];
  external: string[];
}

export class SequentialCrawler {
  private visited = new Set<string>();
  private queue: string[] = [];
  private broken: { url: string; error: string }[] = [];
  private skipped: string[] = [];
  private external: string[] = [];
  private page: Page;
  private options: Required<CrawlerOptions>;

  // Default skip patterns for destructive actions and non-navigable links
  private defaultSkipPatterns = [
    /logout/i,
    /sign-out/i,
    /log-out/i,
    /delete/i,
    /remove/i,
    /cancel/i,
    /destroy/i,
    /award/i, // Award job action
    /complete/i, // Complete job action
    /\.pdf$/i,
    /\.zip$/i,
    /\.csv$/i,
    /\.xlsx?$/i,
    /\.docx?$/i,
    /mailto:/i,
    /tel:/i,
    /javascript:/i,
    /#$/,
    /#[^/]*$/,  // Hash-only links
  ];

  constructor(page: Page, options: CrawlerOptions) {
    this.page = page;
    this.options = {
      maxPages: options.maxPages ?? parseInt(process.env.E2E_MAX_PAGES || '200'),
      skipPatterns: [...this.defaultSkipPatterns, ...(options.skipPatterns || [])],
      allowPatterns: options.allowPatterns || [],
      onPageVisit: options.onPageVisit || (async () => {}),
      onError: options.onError || (async () => {}),
      startUrl: options.startUrl,
    };

    this.queue.push(options.startUrl);
  }

  async crawl(): Promise<CrawlResult> {
    console.log(`\n🕷️  Starting sequential crawl from: ${this.options.startUrl}`);
    console.log(`📊 Max pages: ${this.options.maxPages}\n`);

    while (this.queue.length > 0 && this.visited.size < this.options.maxPages) {
      const url = this.queue.shift()!;

      if (this.visited.has(url)) {
        continue;
      }

      await this.visitPage(url);
    }

    console.log(`\n✅ Crawl complete!`);
    console.log(`📄 Visited: ${this.visited.size} pages`);
    console.log(`❌ Broken: ${this.broken.length} links`);
    console.log(`⏭️  Skipped: ${this.skipped.length} links`);
    console.log(`🌐 External: ${this.external.length} links\n`);

    return {
      visited: Array.from(this.visited),
      broken: this.broken,
      skipped: this.skipped,
      external: this.external,
    };
  }

  private async visitPage(url: string): Promise<void> {
    console.log(`\n🔗 Visiting [${this.visited.size + 1}/${this.options.maxPages}]: ${url}`);

    try {
      // Navigate to page
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Check HTTP status
      if (response && !response.ok()) {
        const error = `HTTP ${response.status()} ${response.statusText()}`;
        console.log(`   ❌ ${error}`);
        this.broken.push({ url, error });
        return;
      }

      // Wait for network to settle (important for Next.js SPA)
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // networkidle timeout is acceptable for SPAs with polling/websockets
      }

      // Mark as visited
      this.visited.add(url);

      // Run custom page visit callback (assertions)
      await this.options.onPageVisit(url, this.page);

      console.log(`   ✅ Success`);

      // Extract and queue new links
      await this.extractLinks(url);

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      this.broken.push({ url, error: error.message });
      await this.options.onError(url, error);
    }
  }

  private async extractLinks(currentUrl: string): Promise<void> {
    const baseUrl = new URL(this.options.startUrl);

    // Extract all <a href> links from the page in DOM order
    const links = await this.page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: a.textContent?.trim() || '',
      }))
    );

    console.log(`   🔍 Found ${links.length} links`);

    let queued = 0;

    for (const link of links) {
      const normalizedUrl = this.normalizeUrl(link.href);

      // Skip already visited or queued
      if (this.visited.has(normalizedUrl) || this.queue.includes(normalizedUrl)) {
        continue;
      }

      // Check if external link
      try {
        const linkUrl = new URL(link.href);
        if (linkUrl.origin !== baseUrl.origin) {
          if (!this.external.includes(link.href)) {
            this.external.push(link.href);
          }
          continue;
        }
      } catch {
        // Invalid URL, skip
        continue;
      }

      // Check skip patterns
      if (this.shouldSkip(normalizedUrl)) {
        if (!this.skipped.includes(normalizedUrl)) {
          this.skipped.push(normalizedUrl);
        }
        continue;
      }

      // Check allow patterns (if specified)
      if (this.options.allowPatterns.length > 0) {
        const allowed = this.options.allowPatterns.some((pattern) =>
          pattern.test(normalizedUrl)
        );
        if (!allowed) {
          if (!this.skipped.includes(normalizedUrl)) {
            this.skipped.push(normalizedUrl);
          }
          continue;
        }
      }

      // Add to queue (FIFO - sequential order)
      this.queue.push(normalizedUrl);
      queued++;
    }

    console.log(`   ➕ Queued ${queued} new links`);
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove hash and trailing slash for consistency
      parsed.hash = '';
      let path = parsed.pathname;
      if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      parsed.pathname = path;
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private shouldSkip(url: string): boolean {
    return this.options.skipPatterns.some((pattern) => pattern.test(url));
  }

  getResults(): CrawlResult {
    return {
      visited: Array.from(this.visited),
      broken: this.broken,
      skipped: this.skipped,
      external: this.external,
    };
  }
}
