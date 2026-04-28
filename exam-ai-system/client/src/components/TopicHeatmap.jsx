const heatColor = (score = 0) => {
  if (score > 0.75) return "border-mint-300/60 bg-mint-400 text-ink-950";
  if (score > 0.6) return "border-aqua-300/60 bg-aqua-400 text-ink-950";
  if (score > 0.45) return "border-brand-300/60 bg-brand-500 text-white";
  if (score > 0.3) return "border-brand-500/70 bg-brand-700 text-brand-50";
  return "border-white/10 bg-white/5 text-slate-300";
};

const TopicHeatmap = ({ data = [] }) => {
  if (!data.length) {
    return <p className="muted-text">No heatmap data available.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {data.map((item) => (
        <div
          key={item.topic}
          className={`rounded-lg border p-3 text-sm font-medium ${heatColor(item.score)}`}
          title={`Score: ${item.score}`}
        >
          <p className="truncate">{item.topic}</p>
          <p className="mt-1 text-xs opacity-80">Score: {Number(item.score).toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
};

export default TopicHeatmap;
