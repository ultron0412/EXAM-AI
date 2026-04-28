const PlannerCard = ({ planner = [] }) => {
  if (!planner.length) {
    return <p className="muted-text">No planner generated yet.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {planner.map((item) => (
        <div className="rounded-lg border border-aqua-400/20 bg-white/5 p-4" key={item.day}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-aqua-300">
            Day {item.day}
          </p>
          <p className="mt-2 text-lg font-bold text-white">{item.targetHours} hrs</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {(item.topics || []).map((topic) => (
              <li key={`${item.day}-${topic}`}>{topic}</li>
            ))}
          </ul>
          {item.notes ? <p className="mt-3 text-xs leading-5 text-slate-400">{item.notes}</p> : null}
        </div>
      ))}
    </div>
  );
};

export default PlannerCard;
