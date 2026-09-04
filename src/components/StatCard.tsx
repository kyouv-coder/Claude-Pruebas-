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
    <div className="bg-white border rounded-lg p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}
