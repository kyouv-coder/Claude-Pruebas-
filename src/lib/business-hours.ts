import { prisma } from "@/lib/prisma";
import { DAY_NAMES, type DayHours } from "@/lib/business-hours-shared";

export type { DayHours };
export { DAY_NAMES };

const DEFAULT_DAY: Omit<DayHours, "dayOfWeek"> = {
  openTime: "09:00",
  closeTime: "19:00",
  closed: false,
};

// Devuelve siempre 7 entradas (una por día), completando con un valor por
// defecto los días que el negocio todavía no configuró explícitamente.
export async function getBusinessHours(businessId: string): Promise<DayHours[]> {
  const rows = await prisma.businessHours.findMany({ where: { businessId } });
  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));

  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    if (row) {
      return { dayOfWeek, openTime: row.openTime, closeTime: row.closeTime, closed: row.closed };
    }
    return { dayOfWeek, ...DEFAULT_DAY, closed: dayOfWeek === 0 };
  });
}

export async function hasConfiguredHours(businessId: string) {
  const count = await prisma.businessHours.count({ where: { businessId } });
  return count > 0;
}

export async function saveBusinessHours(businessId: string, days: DayHours[]) {
  await prisma.$transaction(
    days.map((d) =>
      prisma.businessHours.upsert({
        where: { businessId_dayOfWeek: { businessId, dayOfWeek: d.dayOfWeek } },
        update: { openTime: d.openTime, closeTime: d.closeTime, closed: d.closed },
        create: {
          businessId,
          dayOfWeek: d.dayOfWeek,
          openTime: d.openTime,
          closeTime: d.closeTime,
          closed: d.closed,
        },
      })
    )
  );
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Un negocio que nunca configuró horarios no tiene restricción (comportamiento
// previo a esta feature): solo se valida si explícitamente guardó al menos un día.
export async function checkWithinBusinessHours(
  businessId: string,
  startTime: Date,
  endTime: Date
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const configured = await hasConfiguredHours(businessId);
  if (!configured) return { ok: true };

  if (startTime.toDateString() !== endTime.toDateString()) {
    return { ok: false, reason: "El turno no puede cruzar la medianoche." };
  }

  const dayOfWeek = startTime.getDay();
  const row = await prisma.businessHours.findUnique({
    where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
  });

  if (!row || row.closed) {
    return { ok: false, reason: `El negocio no atiende los ${DAY_NAMES[dayOfWeek].toLowerCase()}.` };
  }

  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  const openMinutes = toMinutes(row.openTime);
  const closeMinutes = toMinutes(row.closeTime);

  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    return {
      ok: false,
      reason: `Fuera del horario de atención (${row.openTime}–${row.closeTime}).`,
    };
  }

  return { ok: true };
}
