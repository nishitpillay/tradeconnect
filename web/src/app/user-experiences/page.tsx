import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';
import { EXPERIENCE_STORIES } from '@/content/marketing';

export default function UserExperiencesPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_55%,_#f4f7fb_100%)]" />

      <PublicNav />

      <section className="container py-16 md:py-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
            Ten demo customer stories with before and after imagery
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-tight text-slate-950 md:text-7xl">
            User experiences that show how TradeConnect feels in practice.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
            These are demo stories designed to show the kind of before-and-after transformations, customer proof, and
            job outcomes the platform is built to highlight.
          </p>
        </div>
      </section>

      <section className="container pb-20">
        <div className="grid gap-6">
          {EXPERIENCE_STORIES.map((story, index) => (
            <article
              key={story.id}
              className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_25px_60px_-45px_rgba(15,23,42,0.45)]"
            >
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className={`grid gap-0 sm:grid-cols-2 ${index % 2 === 0 ? '' : 'lg:order-2'}`}>
                  <div className="relative min-h-[18rem] overflow-hidden border-b border-slate-200 sm:border-b-0 sm:border-r">
                    <img
                      src={story.beforeImage}
                      alt={`${story.title} before`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-4 top-4 rounded-full bg-slate-950/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                      Before
                    </div>
                  </div>
                  <div className="relative min-h-[18rem] overflow-hidden">
                    <img
                      src={story.afterImage}
                      alt={`${story.title} after`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-4 top-4 rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                      After
                    </div>
                  </div>
                </div>

                <div className={`p-8 md:p-10 ${index % 2 === 0 ? '' : 'lg:order-1'}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      {story.trade}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      {story.location}
                    </span>
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">{story.title}</h2>
                  <p className="mt-4 text-base leading-8 text-slate-600">{story.outcome}</p>

                  <blockquote className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-base leading-8 text-slate-700">“{story.quote}”</p>
                    <footer className="mt-4 text-sm font-semibold text-slate-950">{story.customer}</footer>
                  </blockquote>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/register">
                      <Button className="rounded-full bg-slate-900 px-6 hover:bg-slate-800">
                        Start Similar Project
                      </Button>
                    </Link>
                    <Link href="/pricing">
                      <Button variant="outline" className="rounded-full border-slate-300 px-6 text-slate-800 hover:bg-slate-50">
                        View Pricing
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
