"use client";

import { useActionState, useState } from "react";
import { createPublicBookingAction, type ActionState } from "./actions";
import { getBusyTimesAction, getDayAvailabilityAction, type DayAvailability } from "./availability";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

type Service = { id: string; name: string; durationMinutes: number; price: number };
type Staff = { id: string; name: string };
type Product = { id: string; name: string; price: number; stock: number };

const initialState: ActionState = {};

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function PublicBookingForm({
  slug,
  services,
  staff,
  products,
  ctaLabel,
}: {
  slug: string;
  services: Service[];
  staff: Staff[];
  products: Product[];
  ctaLabel: string;
}) {
  const [state, formAction, pending] = useActionState(createPublicBookingAction, initialState);
  const [selectedStaffId, setSelectedStaffId] = useState(staff.length === 1 ? staff[0].id : "");
  const [selectedDate, setSelectedDate] = useState("");
  const [busyRanges, setBusyRanges] = useState<{ start: string; end: string }[]>([]);
  const [loadingBusy, setLoadingBusy] = useState(false);
  const [dayAvailability, setDayAvailability] = useState<DayAvailability | null>(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  const productRequestsJson = JSON.stringify(
    Object.entries(productQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }))
  );

  function refreshBusyTimes(staffId: string, date: string) {
    if (!staffId || !date) {
      setBusyRanges([]);
      return;
    }
    setLoadingBusy(true);
    getBusyTimesAction(slug, staffId, date)
      .then((ranges) => setBusyRanges(ranges))
      .finally(() => setLoadingBusy(false));
  }

  function refreshDayAvailability(date: string) {
    if (!date) {
      setDayAvailability(null);
      return;
    }
    getDayAvailabilityAction(slug, date).then((info) => setDayAvailability(info));
  }

  if (state.success) {
    return (
      <div className="bg-accent-soft border border-success/30 rounded-lg p-6 text-center">
        <p className="text-ink font-medium">{state.success}</p>
        <p className="text-sm text-muted mt-2">
          Si necesitás cambiar o cancelar, contactá directamente al negocio.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <FormField label="Tu nombre" htmlFor="pbClientName" required>
        <input id="pbClientName" name="clientName" required autoComplete="name" className={inputClass} />
      </FormField>

      <div className="flex gap-2">
        <FormField label="Teléfono" htmlFor="pbClientPhone">
          <input id="pbClientPhone" name="clientPhone" autoComplete="tel" className={inputClass} />
        </FormField>
        <FormField label="Email" htmlFor="pbClientEmail">
          <input
            id="pbClientEmail"
            name="clientEmail"
            type="email"
            autoComplete="email"
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label="Servicio" htmlFor="pbServiceId" required>
        <select id="pbServiceId" name="serviceId" required className={inputClass}>
          <option value="">Elegir…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.durationMinutes} min · {money(s.price)})
            </option>
          ))}
        </select>
      </FormField>

      {staff.length > 1 && (
        <FormField label="Profesional" htmlFor="pbStaffId">
          <select
            id="pbStaffId"
            name="staffId"
            className={inputClass}
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              refreshBusyTimes(e.target.value, selectedDate);
            }}
          >
            <option value="">Sin preferencia</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      )}
      {staff.length === 1 && <input type="hidden" name="staffId" value={staff[0].id} />}

      <div className="flex gap-2">
        <FormField label="Fecha" htmlFor="pbDate" required>
          <input
            id="pbDate"
            name="date"
            type="date"
            required
            className={inputClass}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              refreshBusyTimes(selectedStaffId, e.target.value);
              refreshDayAvailability(e.target.value);
            }}
          />
        </FormField>
        <FormField label="Hora" htmlFor="pbTime" required>
          <input id="pbTime" name="time" type="time" required className={inputClass} />
        </FormField>
      </div>

      {selectedDate && dayAvailability?.configured && (
        <p
          className={`text-xs -mt-1 ${dayAvailability.closed ? "text-danger" : "text-muted"}`}
          role="status"
          aria-live="polite"
        >
          {dayAvailability.closed
            ? "El negocio no atiende ese día."
            : `Horario de atención ese día: ${dayAvailability.openTime}–${dayAvailability.closeTime}.`}
        </p>
      )}

      {selectedStaffId && selectedDate && (
        <p className="text-xs text-muted -mt-1" role="status" aria-live="polite">
          {loadingBusy
            ? "Consultando horarios ocupados…"
            : busyRanges.length === 0
              ? "No hay turnos ocupados ese día para este profesional."
              : `Ocupado ese día: ${busyRanges.map((r) => `${r.start}–${r.end}`).join(", ")}`}
        </p>
      )}

      {products.length > 0 && (
        <fieldset className="flex flex-col gap-2 border border-border rounded-md p-3">
          <legend className="text-xs font-medium text-muted px-1">
            Agregar productos (opcional)
          </legend>
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <label htmlFor={`pbQty-${p.id}`} className="text-ink">
                {p.name} <span className="text-muted">({money(p.price)})</span>
              </label>
              <input
                id={`pbQty-${p.id}`}
                type="number"
                min="0"
                max={p.stock}
                step="1"
                value={productQuantities[p.id] || 0}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(p.stock, Number(e.target.value) || 0));
                  setProductQuantities((prev) => ({ ...prev, [p.id]: value }));
                }}
                className={`${inputClass} w-16 text-center`}
              />
            </div>
          ))}
        </fieldset>
      )}
      <input type="hidden" name="productRequests" value={productRequestsJson} />

      <FormField label="Notas (opcional)" htmlFor="pbNotes">
        <textarea id="pbNotes" name="notes" rows={2} className={inputClass} />
      </FormField>

      <button
        type="submit"
        disabled={pending || services.length === 0}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 mt-2"
      >
        {pending ? "Reservando…" : ctaLabel}
      </button>
    </form>
  );
}
