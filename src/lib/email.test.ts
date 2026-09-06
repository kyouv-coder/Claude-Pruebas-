import { describe, expect, it } from "vitest";
import { escapeHtml, formatBookingsTable, type DailyBooking } from "./email";

describe("escapeHtml", () => {
  it("escapes the characters that matter for HTML injection", () => {
    expect(escapeHtml(`<script>alert('x')</script> & "quotes"`)).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quotes&quot;"
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Camila Rojas")).toBe("Camila Rojas");
  });
});

describe("formatBookingsTable", () => {
  it("escapes client-controlled fields so they can't inject HTML into the email", () => {
    const bookings: DailyBooking[] = [
      {
        time: "10:00",
        clientName: `<img src=x onerror=alert(1)>`,
        clientPhone: `"><script>steal()</script>`,
        serviceName: "Masaje relajante",
        durationMinutes: 60,
        staffName: "Terapeuta",
      },
    ];

    const html = formatBookingsTable(bookings);

    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;steal()&lt;/script&gt;");
  });

  it("renders a friendly message when there are no bookings", () => {
    expect(formatBookingsTable([])).toBe("<p>No hay reservas agendadas para hoy.</p>");
  });
});
