export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f3f6fb] px-6 py-16 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.5)] sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.26em] text-slate-500">
            Ordinary Archive
          </div>
          <a
            href="/"
            className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-500 hover:bg-white hover:text-slate-900"
          >
            Back to search
          </a>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            About the project
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Ordinary Archive is a living catalog of past Immaculate Grid (Baseball)
            puzzles, built so fans can quickly find grids by team, award, stat,
            birthplace, and position.
          </p>
        </div>
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              What’s included
            </div>
            <p className="mt-2 leading-relaxed">
              Every puzzle is indexed by its row and column labels, making it
              easy to search by franchises, awards, milestones, and more.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              How it updates
            </div>
            <p className="mt-2 leading-relaxed">
              The archive is refreshed weekly from public sources and stays
              static-first—no accounts, no tracking, just the grid history.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            How to use the archive
          </h2>
          <div className="space-y-2 text-base leading-relaxed text-slate-600">
            <p>
              Type a team, award, stat, or birthplace to filter grids. You can
              also click quick filters for positions and “Born in” locations.
            </p>
            <p>
              The archive tries to update daily using the public archive at
              Sports Reference. For the current day’s grid, play directly at
              the source to support the game.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="https://www.sports-reference.com/immaculate-grid/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Play Today’s Grid
            </a>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              OE on YT
            </div>
            <a
              href="https://www.youtube.com/@OrdinaryEffort"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-700 transition hover:border-red-300 hover:bg-red-100"
            >
              Ordinary Effort YouTube
            </a>
          </div>
          <div className="space-y-2 leading-relaxed">
            <p>
              Random fans guessing random baseball players and trying not to
              biff the grid.
            </p>
            <p>NEW episodes every Monday.</p>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              OE on Discord
            </div>
            <a
              href="https://discord.gg/PJCsBt9Z"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
            >
              Join the Discord
            </a>
          </div>
          <div className="space-y-2 leading-relaxed">
            <p>Friendly, spoiler-light grid talk and plenty of deep cuts.</p>
            <p>Keep it respectful, avoid spam, and drop full solves in the spoiler channel.</p>
            <p>Good to go? Let’s get gridding and… Stay Ordinary. 🫡</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Heads up
          </div>
          <p className="leading-relaxed">
            Ordinary Archive is an unofficial fan project and is not affiliated
            with Sports Reference or the official Immaculate Grid game.
          </p>
        </div>
      </div>
    </div>
  );
}
