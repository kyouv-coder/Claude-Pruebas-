import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  attachSaleInvoice,
  getSaleInvoiceFile,
  resolveYearMonth,
  currentYearMonth,
  sanitizeFileNameForHeader,
  createExpense,
  getMonthlyFinancials,
  getExpensesByCategory,
  getYearlyFinancials,
  getMonthlyTrend,
  getYearlyTrend,
} from "./finance";

// Test de integración contra Postgres real: attachSaleInvoice valida tipo y
// tamaño de archivo, y el aislamiento multi-tenant (no se puede adjuntar un
// comprobante a una venta de otro negocio) depende de la restricción real
// en la base, no se puede probar de forma aislada.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describe("resolveYearMonth", () => {
  it("accepts a valid year/month from query params", () => {
    expect(resolveYearMonth("2026", "3")).toEqual({ year: 2026, month: 3 });
  });

  it("falls back to the current month for an out-of-range month", () => {
    const current = currentYearMonth();
    expect(resolveYearMonth("2026", "13")).toEqual({ year: 2026, month: current.month });
    expect(resolveYearMonth("2026", "0")).toEqual({ year: 2026, month: current.month });
    expect(resolveYearMonth("2026", "-5")).toEqual({ year: 2026, month: current.month });
  });

  it("falls back to the current year for an out-of-range year", () => {
    const current = currentYearMonth();
    expect(resolveYearMonth("1999", "3")).toEqual({ year: current.year, month: 3 });
    expect(resolveYearMonth("2101", "3")).toEqual({ year: current.year, month: 3 });
  });

  it("falls back to the current year/month for missing or non-numeric params", () => {
    const current = currentYearMonth();
    expect(resolveYearMonth(null, null)).toEqual(current);
    expect(resolveYearMonth(undefined, undefined)).toEqual(current);
    expect(resolveYearMonth("abc", "xyz")).toEqual(current);
  });

  it("rejects a non-integer month instead of silently truncating it", () => {
    const current = currentYearMonth();
    expect(resolveYearMonth("2026", "3.5")).toEqual({ year: 2026, month: current.month });
  });
});

describe("sanitizeFileNameForHeader", () => {
  it("strips double quotes that would break out of the Content-Disposition filename param", () => {
    expect(sanitizeFileNameForHeader('foo".pdf')).toBe("foo.pdf");
  });

  it("strips CR/LF that could be used for header injection", () => {
    expect(sanitizeFileNameForHeader("foo\r\nX-Injected: 1.pdf")).toBe("fooX-Injected: 1.pdf");
  });

  it("leaves a normal file name untouched", () => {
    expect(sanitizeFileNameForHeader("comprobante-enero.pdf")).toBe("comprobante-enero.pdf");
  });
});

describeIfDb("createExpense", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Create Expense Business",
        businessType: "SPA",
        slug: `test-create-expense-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rejects a non-finite or non-positive amount instead of storing it as-is", async () => {
    // Number("Infinity") > 0 da true, así que un chequeo con solo `> 0` no
    // alcanza — y guardar Infinity en un campo Decimal tira un error de
    // Prisma sin capturar, no el mensaje amigable que se espera acá.
    await expect(
      createExpense(businessId, { date: new Date(), category: "OTRO", amount: Infinity })
    ).rejects.toThrow(/monto/i);
    await expect(
      createExpense(businessId, { date: new Date(), category: "OTRO", amount: -100 })
    ).rejects.toThrow(/monto/i);
    await expect(
      createExpense(businessId, { date: new Date(), category: "OTRO", amount: 0 })
    ).rejects.toThrow(/monto/i);

    const count = await prisma.expense.count({ where: { businessId } });
    expect(count).toBe(0);
  });

  it("stores a valid expense", async () => {
    const expense = await createExpense(businessId, {
      date: new Date(),
      category: "INSUMOS",
      amount: 5000,
    });
    expect(Number(expense.amount)).toBe(5000);
  });
});

describeIfDb("getMonthlyFinancials / getExpensesByCategory", () => {
  let businessId: string;
  const year = 2027;
  const month = 3;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Monthly Financials Business",
        businessType: "SPA",
        slug: `test-monthly-financials-${Date.now()}`,
      },
    });
    businessId = business.id;

    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-monthly-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });

    // Dos ventas dentro del mes (marzo 2027) y una fuera (febrero), para
    // confirmar que el filtro de fecha excluye la que no corresponde.
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 8000,
        paymentMethod: "CASH",
        createdAt: new Date(year, month - 1, 5),
        items: { create: [{ description: "Venta dentro de mes", quantity: 1, unitPrice: 8000 }] },
      },
    });
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 2000,
        paymentMethod: "CASH",
        createdAt: new Date(year, month - 1, 20),
        items: { create: [{ description: "Otra venta dentro de mes", quantity: 1, unitPrice: 2000 }] },
      },
    });
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 9999,
        paymentMethod: "CASH",
        createdAt: new Date(year, month - 2, 28),
        items: { create: [{ description: "Venta de otro mes", quantity: 1, unitPrice: 9999 }] },
      },
    });

    // Gastos: dos categorías dentro del mes, uno fuera.
    await createExpense(businessId, { date: new Date(year, month - 1, 10), category: "ALQUILER", amount: 3000 });
    await createExpense(businessId, { date: new Date(year, month - 1, 15), category: "INSUMOS", amount: 1000 });
    await createExpense(businessId, { date: new Date(year, month - 1, 15), category: "INSUMOS", amount: 500 });
    await createExpense(businessId, { date: new Date(year, month - 2, 1), category: "ALQUILER", amount: 4000 });
  });

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { businessId } });
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("sums only the revenue, expenses and net of the requested month", async () => {
    const financials = await getMonthlyFinancials(businessId, year, month);
    expect(financials.revenue).toBe(10000); // 8000 + 2000, sin la venta de febrero
    expect(financials.expenses).toBe(4500); // 3000 + 1000 + 500, sin el gasto de febrero
    expect(financials.net).toBe(5500);
    expect(financials.salesCount).toBe(2);
    expect(financials.expensesCount).toBe(3);
  });

  it("groups expenses by category, summed and sorted from highest to lowest", async () => {
    const byCategory = await getExpensesByCategory(businessId, year, month);
    expect(byCategory).toEqual([
      { category: "ALQUILER", label: "Alquiler", amount: 3000 },
      { category: "INSUMOS", label: "Insumos", amount: 1500 },
    ]);
  });
});

describeIfDb("getYearlyFinancials / getMonthlyTrend", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Yearly Financials Business",
        businessType: "SPA",
        slug: `test-yearly-financials-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { businessId } });
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("sums only the sales/expenses of the requested year, not adjacent years", async () => {
    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-yearly-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });

    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 10000,
        paymentMethod: "CASH",
        createdAt: new Date(2027, 5, 1),
        items: { create: [{ description: "Venta 2027", quantity: 1, unitPrice: 10000 }] },
      },
    });
    // Fuera de la ventana del año 2027 (31 de diciembre de 2026): no debe sumar.
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 7777,
        paymentMethod: "CASH",
        createdAt: new Date(2026, 11, 31),
        items: { create: [{ description: "Venta 2026", quantity: 1, unitPrice: 7777 }] },
      },
    });
    await createExpense(businessId, { date: new Date(2027, 2, 1), category: "OTRO", amount: 2000 });

    const financials = await getYearlyFinancials(businessId, 2027);
    expect(financials.revenue).toBe(10000);
    expect(financials.expenses).toBe(2000);
    expect(financials.net).toBe(8000);
    expect(financials.salesCount).toBe(1);
  });

  it("returns one entry per requested month, including the current month's actual revenue", async () => {
    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Trend",
        email: `admin-trend-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 4444,
        paymentMethod: "CASH",
        createdAt: new Date(),
        items: { create: [{ description: "Venta de este mes", quantity: 1, unitPrice: 4444 }] },
      },
    });

    const trend = await getMonthlyTrend(businessId, 3);
    expect(trend).toHaveLength(3);
    const current = currentYearMonth();
    const currentEntry = trend[trend.length - 1];
    expect(currentEntry).toMatchObject({ year: current.year, month: current.month });
    expect(currentEntry.revenue).toBeGreaterThanOrEqual(4444);
  });

  it("returns one entry per requested year, including the current year's actual revenue", async () => {
    // Reusa la venta de $4444 creada en el test anterior (misma fecha "hoy").
    const trend = await getYearlyTrend(businessId, 3);
    expect(trend).toHaveLength(3);
    const currentYear = new Date().getFullYear();
    const currentEntry = trend[trend.length - 1];
    expect(currentEntry).toMatchObject({ year: currentYear, label: String(currentYear) });
    expect(currentEntry.revenue).toBeGreaterThanOrEqual(4444);
  });
});

describeIfDb("attachSaleInvoice", () => {
  let businessId: string;
  let otherBusinessId: string;
  let saleId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Invoice Business",
        businessType: "SPA",
        slug: `test-invoice-${Date.now()}`,
      },
    });
    businessId = business.id;

    const otherBusiness = await prisma.business.create({
      data: {
        name: "Test Invoice Other Business",
        businessType: "SPA",
        slug: `test-invoice-other-${Date.now()}`,
      },
    });
    otherBusinessId = otherBusiness.id;

    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-invoice-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });

    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });

    const sale = await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 10000,
        paymentMethod: "CASH",
        items: { create: [{ description: "Servicio de prueba", quantity: 1, unitPrice: 10000 }] },
      },
    });
    saleId = sale.id;
  });

  afterAll(async () => {
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.business.delete({ where: { id: otherBusinessId } });
    await prisma.$disconnect();
  });

  it("rejects a disallowed file type", async () => {
    await expect(
      attachSaleInvoice(businessId, saleId, {
        name: "comprobante.svg",
        type: "image/svg+xml",
        data: Buffer.from("<svg></svg>"),
      })
    ).rejects.toThrow(/Solo se aceptan/);
  });

  it("rejects a file over the size limit", async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    await expect(
      attachSaleInvoice(businessId, saleId, {
        name: "comprobante.png",
        type: "image/png",
        data: oversized,
      })
    ).rejects.toThrow(/no puede pesar/);
  });

  it("rejects attaching to a sale from another business", async () => {
    await expect(
      attachSaleInvoice(otherBusinessId, saleId, {
        name: "comprobante.png",
        type: "image/png",
        data: Buffer.from("fake-png-bytes"),
      })
    ).rejects.toThrow();
  });

  it("stores a valid invoice and returns it via getSaleInvoiceFile", async () => {
    const data = Buffer.from("fake-png-bytes");
    await attachSaleInvoice(businessId, saleId, {
      name: "comprobante.png",
      type: "image/png",
      data,
    });

    const file = await getSaleInvoiceFile(businessId, saleId);
    expect(file).not.toBeNull();
    expect(file?.mimeType).toBe("image/png");
    expect(file?.fileName).toBe("comprobante.png");
    expect(Buffer.compare(file!.data, data)).toBe(0);
  });

  it("returns null for a sale from another business", async () => {
    const file = await getSaleInvoiceFile(otherBusinessId, saleId);
    expect(file).toBeNull();
  });
});
