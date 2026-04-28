import AnalyticsPreview from "./AnalyticsPreview";

const AuthFrame = ({ children, footer, subtitle, title }) => (
  <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="card mx-auto w-full max-w-md p-6">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-aqua-300/60 bg-aqua-400/10 text-sm font-black text-aqua-200">
            EA
          </div>
          <div>
            <p className="eyebrow">Exam AI</p>
            <p className="text-sm text-slate-400">Question prediction workspace</p>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
        </div>

        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-5 border-t border-white/10 pt-4">{footer}</div> : null}
      </section>

      <section className="hidden lg:block">
        <p className="eyebrow mb-4">AI assisted exam analytics</p>
        <AnalyticsPreview />
      </section>
    </div>
  </main>
);

export default AuthFrame;
