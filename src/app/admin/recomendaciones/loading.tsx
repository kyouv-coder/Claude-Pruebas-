export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-48 bg-accent-soft rounded-md" />
      <div className="flex flex-col gap-3">
        <div className="bg-surface border border-border rounded-lg h-24" />
        <div className="bg-surface border border-border rounded-lg h-24" />
        <div className="bg-surface border border-border rounded-lg h-24" />
      </div>
    </div>
  );
}
