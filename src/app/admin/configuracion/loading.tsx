export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-7 w-48 bg-accent-soft rounded-md" />
      <div className="bg-surface border border-border rounded-lg h-64" />
      <div className="bg-surface border border-border rounded-lg h-64" />
    </div>
  );
}
