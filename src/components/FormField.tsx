export function FormField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm text-ink">
        {label}
        {required && <span aria-hidden="true" className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2"
    >
      {message}
    </p>
  );
}

export const inputClass =
  "border border-border rounded-md px-3 py-2 text-sm bg-surface text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent";
