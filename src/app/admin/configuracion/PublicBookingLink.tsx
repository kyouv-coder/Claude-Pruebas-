"use client";

export function PublicBookingLink({ url, bookingSingular }: { url: string; bookingSingular: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 max-w-md">
      <p className="text-sm text-muted mb-3">
        Compartí este link con tus clientes — pueden pedir una {bookingSingular}{" "}
        ellos mismos, sin necesitar una cuenta.
      </p>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-paper text-ink font-mono"
      />
    </div>
  );
}
