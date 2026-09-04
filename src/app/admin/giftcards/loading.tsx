export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-32 bg-accent-soft rounded-md" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-surface border border-border rounded-lg h-20" />
        <div className="bg-surface border border-border rounded-lg h-20" />
        <div className="bg-surface border border-border rounded-lg h-20" />
      </div>
      <div className="bg-surface border border-border rounded-lg h-96" />
    </div>
  );
}
