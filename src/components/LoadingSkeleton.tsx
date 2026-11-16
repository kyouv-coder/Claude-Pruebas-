// Wrapper para los `loading.tsx` de cada sección de /admin (skeletons que
// Next.js muestra mientras el Server Component de la página todavía está
// resolviendo sus datos). Sin esto, un usuario de lector de pantalla no
// recibe ningún aviso de que la página está cargando: las barras grises
// (`animate-pulse`) son puramente visuales, y el contenido real las
// reemplaza en silencio en el árbol de accesibilidad. `role="status"` +
// `aria-live="polite"` hace que se anuncie "Cargando" al entrar a la
// pantalla, y `aria-hidden` en los huesos del skeleton evita que un lector
// de pantalla intente describir divs vacíos sin texto.
export function LoadingSkeleton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}
