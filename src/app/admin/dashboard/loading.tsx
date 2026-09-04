export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-40 bg-accent-soft rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4 h-20" />
        ))}
      </div>
      <div className="bg-surface border border-border rounded-lg p-4 h-64" />
      <div className="bg-surface border border-border rounded-lg p-4 h-64" />
    </div>
  );
}
