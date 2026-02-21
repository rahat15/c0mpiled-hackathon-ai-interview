export default function LoadingSpinner({ text = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      <span className="text-sm text-slate-500">{text}</span>
    </div>
  );
}
