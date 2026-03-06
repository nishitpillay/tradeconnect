import { execSync } from 'child_process';

function run(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function tryRun(command: string): string | null {
  try {
    return run(command);
  } catch {
    return null;
  }
}

function getBaseRef(): string {
  const ghBaseRef = process.env.GITHUB_BASE_REF;
  if (ghBaseRef) return `origin/${ghBaseRef}`;
  return 'HEAD~1';
}

function hasDiff(baseRef: string, pathspec: string): boolean {
  const output = tryRun(`git diff --name-only ${baseRef}...HEAD -- ${pathspec}`);
  return Boolean(output && output.length > 0);
}

function getVersionAt(ref: string): string | null {
  const content = tryRun(`git show ${ref}:backend/package.json`);
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { version?: string };
    return parsed.version ?? null;
  } catch {
    return null;
  }
}

const baseRef = getBaseRef();
const baseExists = tryRun(`git rev-parse --verify ${baseRef}`);
if (!baseExists) {
  console.log(`Skipping OpenAPI drift check: base ref not found (${baseRef})`);
  process.exit(0);
}

const specChanged = hasDiff(baseRef, 'backend/openapi/openapi.v1.json');
if (!specChanged) {
  console.log('OpenAPI drift check passed: no API contract changes detected.');
  process.exit(0);
}

const baseVersion = getVersionAt(baseRef);
const headVersion = getVersionAt('HEAD');
const versionBumped = Boolean(baseVersion && headVersion && baseVersion !== headVersion);
const changelogUpdated = hasDiff(baseRef, 'backend/CHANGELOG.md');

if (!versionBumped && !changelogUpdated) {
  console.error(
    [
      'OpenAPI changed but neither backend version nor changelog was updated.',
      'Required actions:',
      '- Bump backend/package.json version, OR',
      '- Add a backend/CHANGELOG.md entry describing the API change.',
    ].join('\n')
  );
  process.exit(1);
}

console.log(
  `OpenAPI drift check passed: ${
    versionBumped ? 'version bumped' : 'changelog updated'
  }.`
);

