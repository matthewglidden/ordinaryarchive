export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f3f6fb] px-6 py-16 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.5)] sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.26em] text-slate-500">
            About Ordinary Archive
          </div>
          <a
            href="/"
            className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-500 hover:bg-white hover:text-slate-900"
          >
            Back to search
          </a>
        </div>
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              What’s included
            </div>
            <p className="mt-2 leading-relaxed">
              Your terms and filters show matching grids, whether exact or
              “possible” (in case of typos or partial words).
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              How it works
            </div>
            <p className="mt-2 leading-relaxed">
              All search results take you to grids on their home site. Create
              an account there to track your progress.
            </p>
            <a
              href="https://www.sports-reference.com/immaculate-grid/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Play Today’s Grid
            </a>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Feedback
            </div>
            <p className="mt-2 leading-relaxed">
              Have a search idea or a grid you want to spotlight? Share it with
              the community in Discord.
            </p>
            <a
              href="https://discord.gg/hrWdSCpK"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
            >
              Share Feedback
            </a>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                OE on YT
              </div>
            </div>
            <div className="space-y-2 leading-relaxed">
              <p>
                Two random fans guessing random baseball players and trying not
                to biff the grid.
              </p>
              <a
                href="https://www.youtube.com/@OrdinaryEffort"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-700 transition hover:border-red-300 hover:bg-red-100"
              >
                Ordinary Effort YouTube
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                OE on Discord
              </div>
            </div>
            <div className="space-y-2 leading-relaxed">
              <p>
                A community hub for grid discussion, tips, and Ordinary Effort
                updates.
              </p>
              <a
                href="https://discord.gg/PJCsBt9Z"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
              >
                Join the Discord
              </a>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Heads up
          </div>
          <p className="leading-relaxed">
            Ordinary Archive is an unofficial fan project based on the love of
            baseball, grids, and research. I encourage you to support the owners
            of the Immaculate Grid,{" "}
            <a
              href="https://www.sports-reference.com/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-900 underline underline-offset-4 transition hover:text-slate-700"
            >
              Sports-Reference.com
            </a>
            , by playing their official game and considering a site subscription.
          </p>
        </div>
      </div>
    </div>
  );
}
