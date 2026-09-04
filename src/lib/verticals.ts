import type { BusinessType } from "@/generated/prisma";

export type VerticalCopy = {
  label: string;
  tagline: string;
  bookingsNav: string;
  bookingsTitle: string;
  bookingsSubtitle: string;
  newBookingCta: string;
  bookingSingular: string;
  clientLabel: string;
  clientLabelSingular: string;
  serviceLabel: string;
};

const VERTICAL_COPY: Record<BusinessType, VerticalCopy> = {
  SPA: {
    label: "Spa / centro de estética",
    tagline: "Turnos, caja y clientas de tu spa en un solo lugar.",
    bookingsNav: "Reservas",
    bookingsTitle: "Reservas",
    bookingsSubtitle: "Agenda de turnos del spa.",
    newBookingCta: "Nueva reserva",
    bookingSingular: "reserva",
    clientLabel: "Clientes",
    clientLabelSingular: "cliente",
    serviceLabel: "Servicios",
  },
  PELUQUERIA_BARBERIA: {
    label: "Peluquería / barbería",
    tagline: "Turnos, caja y clientes de tu salón en un solo lugar.",
    bookingsNav: "Turnos",
    bookingsTitle: "Turnos",
    bookingsSubtitle: "Agenda de turnos del salón.",
    newBookingCta: "Nuevo turno",
    bookingSingular: "turno",
    clientLabel: "Clientes",
    clientLabelSingular: "cliente",
    serviceLabel: "Servicios",
  },
  RESTAURANTE: {
    label: "Restaurante / gastronomía",
    tagline: "Reservas de mesa, caja y clientes de tu local en un solo lugar.",
    bookingsNav: "Reservas",
    bookingsTitle: "Reservas de mesa",
    bookingsSubtitle: "Agenda de reservas del restaurante.",
    newBookingCta: "Nueva reserva",
    bookingSingular: "reserva",
    clientLabel: "Clientes",
    clientLabelSingular: "cliente",
    serviceLabel: "Servicios",
  },
  PANADERIA_CAFETERIA: {
    label: "Panadería / cafetería",
    tagline: "Pedidos, caja y clientes de tu local en un solo lugar.",
    bookingsNav: "Pedidos",
    bookingsTitle: "Pedidos",
    bookingsSubtitle: "Encargos y pedidos con horario de entrega.",
    newBookingCta: "Nuevo pedido",
    bookingSingular: "pedido",
    clientLabel: "Clientes",
    clientLabelSingular: "cliente",
    serviceLabel: "Productos por encargo",
  },
  TRANSPORTE: {
    label: "Transporte / traslados",
    tagline: "Viajes, caja y pasajeros de tu negocio en un solo lugar.",
    bookingsNav: "Viajes",
    bookingsTitle: "Viajes",
    bookingsSubtitle: "Agenda de viajes y traslados.",
    newBookingCta: "Nuevo viaje",
    bookingSingular: "viaje",
    clientLabel: "Pasajeros",
    clientLabelSingular: "pasajero",
    serviceLabel: "Rutas / servicios",
  },
  OTRO: {
    label: "Otro rubro",
    tagline: "Reservas, caja y clientes de tu negocio en un solo lugar.",
    bookingsNav: "Reservas",
    bookingsTitle: "Reservas",
    bookingsSubtitle: "Agenda de reservas del negocio.",
    newBookingCta: "Nueva reserva",
    bookingSingular: "reserva",
    clientLabel: "Clientes",
    clientLabelSingular: "cliente",
    serviceLabel: "Servicios",
  },
};

export function getVerticalCopy(businessType: BusinessType | undefined | null): VerticalCopy {
  return VERTICAL_COPY[businessType ?? "OTRO"] ?? VERTICAL_COPY.OTRO;
}

export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = (
  Object.keys(VERTICAL_COPY) as BusinessType[]
).map((value) => ({ value, label: VERTICAL_COPY[value].label }));
