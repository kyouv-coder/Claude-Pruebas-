// Tipos y constantes sin dependencias de servidor (Prisma), para poder
// importarlos desde componentes "use client" sin arrastrar el cliente de DB
// al bundle del navegador.

export type DayHours = {
  dayOfWeek: number; // 0 = domingo ... 6 = sábado, igual a Date#getDay()
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  closed: boolean;
};

export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
