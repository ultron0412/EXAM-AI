const rowGroups = [
  ["bg-white", "bg-brand-200", "bg-brand-300", "bg-brand-700"],
  ["bg-aqua-400", "bg-sky-500", "bg-brand-600", "bg-brand-800"],
  ["bg-brand-100", "bg-brand-600", "bg-brand-800", "bg-aqua-400"],
  ["bg-brand-800", "bg-sky-700", "bg-teal-600", "bg-mint-500"],
];

const sliderPositions = ["left-[18%]", "left-[34%]", "left-[68%]", "left-[10%]", "left-[84%]"];

const AnalyticsPreview = ({ className = "" }) => (
  <div className={`relative ${className}`} aria-hidden="true">
    <div className="relative mx-auto w-full max-w-xl rounded-lg border border-aqua-400/70 bg-brand-900/[0.55] p-4 shadow-screen">
      <div className="rounded-lg border-2 border-white/80 bg-brand-900/95 shadow-soft">
        <div className="flex h-8 items-center gap-2 border-b-2 border-white/80 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-white" />
          <span className="h-2.5 w-2.5 rounded-full bg-mint-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-700" />
        </div>

        <div className="grid min-h-80 grid-cols-1 gap-0 md:grid-cols-[1fr_14rem]">
          <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div
                className="mx-auto h-40 w-40 rounded-full"
                style={{
                  background:
                    "conic-gradient(#10b981 0 38%, #12d39a 38% 62%, #2f5bdd 62% 100%)",
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full">
                  <span className="h-16 w-16 rounded-full bg-brand-900" />
                </div>
              </div>
              <div className="grid grid-cols-5 overflow-hidden rounded-sm">
                {["bg-brand-800", "bg-sky-700", "bg-teal-700", "bg-teal-600", "bg-mint-500"].map(
                  (color) => (
                    <span className={`h-16 ${color}`} key={color} />
                  ),
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-5">
              {sliderPositions.map((position, index) => (
                <div className="relative h-4 rounded-sm bg-brand-600/90" key={position}>
                  <span className={`absolute top-[-4px] h-6 w-1.5 rounded-sm bg-mint-400 ${position}`} />
                  <span
                    className="absolute bottom-0 left-0 top-0 rounded-sm bg-brand-500/70"
                    style={{ width: `${28 + index * 12}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-white/80 p-5 md:border-l-2 md:border-t-0">
            <div className="space-y-6">
              {rowGroups.map((group, index) => (
                <div className="space-y-2" key={`${group.join("-")}-${index}`}>
                  <div className="grid grid-cols-5 overflow-hidden rounded-sm">
                    {group.map((color, colorIndex) => (
                      <span className={`h-8 ${color}`} key={`${color}-${colorIndex}`} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="h-0.5 w-16 rounded-full bg-aqua-400" />
                    <span className="h-2 w-2 rounded-sm border border-brand-500" />
                    <span className="h-2 w-2 rounded-sm border border-brand-500" />
                    <span className="h-2 w-2 rounded-sm border border-brand-500" />
                  </div>
                </div>
              ))}
              <div className="h-3 overflow-hidden rounded-sm bg-white">
                <span className="block h-full w-4/5 bg-gradient-to-r from-mint-500 to-aqua-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <span className="h-3 w-3 rounded-full bg-brand-600" />
        <span className="h-3 w-3 rounded-full bg-brand-600" />
        <span className="h-3 w-3 rounded-full bg-brand-600" />
        <span className="h-3 w-3 rounded-full bg-brand-500" />
      </div>
    </div>
    <div className="mx-auto h-20 w-64 border-x-2 border-aqua-400/70" />
    <div className="mx-auto h-7 w-80 rounded-t-lg border border-aqua-400/70 bg-brand-900/70" />
    <div className="mx-auto h-px w-96 max-w-full bg-aqua-400/70" />
  </div>
);

export default AnalyticsPreview;
