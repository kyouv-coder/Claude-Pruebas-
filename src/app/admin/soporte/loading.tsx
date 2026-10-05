export default function Loading() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl animate-pulse">
      <div className="h-7 w-28 bg-accent-soft rounded-md" />
      <div className="bg-surface border border-border rounded-lg p-5 h-32" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg h-14" />
        ))}
      </div>
    </div>
  );
}
