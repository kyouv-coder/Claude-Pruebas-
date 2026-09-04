export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-24 bg-accent-soft rounded-md" />
      <div className="bg-surface border border-border rounded-lg p-5 h-24" />
      <div className="bg-surface border border-border rounded-lg p-5 h-40" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-surface border border-border rounded-lg p-5 h-64" />
        <div className="bg-surface border border-border rounded-lg p-5 h-64" />
      </div>
    </div>
  );
}
