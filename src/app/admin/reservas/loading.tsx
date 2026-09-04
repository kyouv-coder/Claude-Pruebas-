export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-32 bg-accent-soft rounded-md" />
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="bg-surface border border-border rounded-lg p-5 h-80" />
        <div className="bg-surface border border-border rounded-lg p-5 h-80" />
      </div>
    </div>
  );
}
