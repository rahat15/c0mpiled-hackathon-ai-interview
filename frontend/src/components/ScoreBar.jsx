export default function ScoreBar({ label, score, maxScore = 100, color = "auto" }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const colors = {
    brand: "bg-brand-500",
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-rose-500",
  };
  const barColor =
    pct >= 70 ? colors.green : pct >= 40 ? colors.yellow : colors.red;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">
          {score}/{maxScore}
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color === "auto" ? barColor : colors[color] || colors.brand}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
