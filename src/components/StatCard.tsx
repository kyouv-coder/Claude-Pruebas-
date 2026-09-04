export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-display text-2xl text-ink mt-1">{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}
