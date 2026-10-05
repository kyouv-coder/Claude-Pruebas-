export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-32 bg-accent-soft rounded-md" />
      <div className="bg-surface border border-border rounded-lg p-5 max-w-md h-80" />
    </div>
  );
}
