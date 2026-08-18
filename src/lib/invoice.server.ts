import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY branded PDF invoice generation for Diamond House orders.
// Uses pdf-lib standard fonts (WinAnsi) so it renders reliably in any serverless
// runtime with no font assets. The document is English (a bookkeeping/courier
// document); customer-facing Marathi copy lives on the site, not the invoice.
if (typeof window !== "undefined") {
  throw new Error("invoice.server.ts must not be imported in the browser bundle");
}

const C = {
  maroon: rgb(0x6e / 255, 0x14 / 255, 0x23 / 255),
  gold: rgb(0xc9 / 255, 0x96 / 255, 0x2c / 255),
  navy: rgb(0x1b / 255, 0x2a / 255, 0x4b / 255),
  ink: rgb(0.17, 0.1, 0.07),
  muted: rgb(0.42, 0.36, 0.29),
  line: rgb(0.89, 0.83, 0.72),
  white: rgb(1, 1, 1),
};

export type InvoicingSettings = {
  prefix: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  gstin: string;
  product_label: string;
};

const DEFAULT_INVOICING: InvoicingSettings = {
  prefix: "DH",
  business_name: "Diamond House",
  business_address: "Behind Mahalaxmi Temple, Jotiba Road, Kolhapur, Maharashtra 416012",
  business_phone: "+91 96 57 130 131",
  business_email: "",
  gstin: "",
  product_label: "Icchapurti Lucky Stone (Blessed)",
};

export async function getInvoicingSettings(admin: SupabaseClient): Promise<InvoicingSettings> {
  try {
    const { data } = await admin
      .from("admin_settings")
      .select("value")
      .eq("key", "invoicing")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<InvoicingSettings>;
    return { ...DEFAULT_INVOICING, ...v };
  } catch {
    return { ...DEFAULT_INVOICING };
  }
}

export type InvoiceOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_pincode: string;
  customer_email: string | null;
  quantity: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
};

// Deterministic, stable, sequential-by-creation invoice number. No DB column /
// counter needed: we count how many orders were created before this one.
export async function computeInvoiceNumber(
  admin: SupabaseClient,
  order: InvoiceOrder,
  prefix: string,
): Promise<string> {
  let seq = 1;
  try {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .lt("created_at", order.created_at);
    seq = (count ?? 0) + 1;
  } catch {
    /* fall back to 1 */
  }
  const year = new Date(order.created_at).getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}

// Keep only WinAnsi-encodable characters (Helvetica). Non-Latin (e.g. Devanagari)
// is dropped; if nothing remains we use the provided fallback.
function latin(s: string | null | undefined, fallback = ""): string {
  const cleaned = (s ?? "")
    .split("")
    .filter((ch) => ch.charCodeAt(0) <= 255)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function money(n: number): string {
  return `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function buildInvoicePdf(
  order: InvoiceOrder,
  biz: InvoicingSettings,
  invoiceNumber: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = page.getWidth();
  const M = 40;

  const text = (s: string, x: number, y: number, size: number, f = font, color = C.ink) =>
    page.drawText(s, { x, y, size, font: f, color });
  const rightText = (
    s: string,
    xRight: number,
    y: number,
    size: number,
    f = font,
    color = C.ink,
  ) => {
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xRight - w, y, size, font: f, color });
  };

  // ── Header band (maroon) with gold brand ──
  page.drawRectangle({ x: 0, y: 792, width: W, height: 50, color: C.maroon });
  page.drawRectangle({ x: 0, y: 788, width: W, height: 4, color: C.gold });
  text(latin(biz.business_name, "Diamond House"), M, 812, 20, bold, C.gold);
  text("Sri Swami Samarth Ashirwadit . Kolhapur", M, 798, 9, font, C.white);
  rightText("TAX INVOICE", W - M, 812, 16, bold, C.white);

  // ── Business + invoice meta ──
  let y = 760;
  text(latin(biz.business_address), M, y, 9, font, C.muted);
  y -= 13;
  const contactBits = [
    biz.business_phone ? `Ph: ${latin(biz.business_phone)}` : "",
    biz.business_email ? `Email: ${latin(biz.business_email)}` : "",
    biz.gstin ? `GSTIN: ${latin(biz.gstin)}` : "",
  ].filter(Boolean);
  if (contactBits.length) {
    text(contactBits.join("   .   "), M, y, 9, font, C.muted);
    y -= 13;
  }

  // Invoice meta box (right)
  const boxX = W - M - 200;
  const boxTop = 760;
  page.drawRectangle({
    x: boxX,
    y: boxTop - 46,
    width: 200,
    height: 52,
    borderColor: C.line,
    borderWidth: 1,
    color: C.white,
  });
  text("Invoice No.", boxX + 10, boxTop - 12, 8, font, C.muted);
  rightText(latin(invoiceNumber), boxX + 190, boxTop - 12, 10, bold, C.navy);
  text("Date", boxX + 10, boxTop - 28, 8, font, C.muted);
  rightText(
    new Date(order.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    boxX + 190,
    boxTop - 28,
    10,
    font,
  );
  text("Order No.", boxX + 10, boxTop - 42, 8, font, C.muted);
  rightText(latin(order.order_number), boxX + 190, boxTop - 42, 9, font);

  // ── Bill To ──
  y = 700;
  text("BILL TO", M, y, 10, bold, C.maroon);
  y -= 16;
  text(latin(order.customer_name, "Customer"), M, y, 12, bold);
  y -= 14;
  const addr = latin(order.customer_address);
  if (addr) {
    // wrap address to ~70 chars
    const words = addr.split(" ");
    let line = "";
    for (const w of words) {
      if ((line + " " + w).length > 70) {
        text(line.trim(), M, y, 9, font, C.muted);
        y -= 12;
        line = w;
      } else line += " " + w;
    }
    if (line.trim()) {
      text(line.trim(), M, y, 9, font, C.muted);
      y -= 12;
    }
  }
  text(
    `Pincode: ${latin(order.customer_pincode)}   Phone: ${latin(order.customer_phone)}`,
    M,
    y,
    9,
    font,
    C.muted,
  );
  y -= 26;

  // ── Items table ──
  const tableTop = y;
  page.drawRectangle({ x: M, y: tableTop - 4, width: W - 2 * M, height: 22, color: C.navy });
  text("ITEM", M + 10, tableTop + 4, 9, bold, C.gold);
  rightText("QTY", M + 360, tableTop + 4, 9, bold, C.gold);
  rightText("RATE", M + 440, tableTop + 4, 9, bold, C.gold);
  rightText("AMOUNT", W - M - 10, tableTop + 4, 9, bold, C.gold);

  const rate =
    order.quantity > 0 ? Number(order.total_amount) / order.quantity : Number(order.total_amount);
  let ry = tableTop - 22;
  text(latin(biz.product_label, "Icchapurti Lucky Stone"), M + 10, ry + 5, 10, font);
  rightText(String(order.quantity), M + 360, ry + 5, 10, font);
  rightText(money(rate), M + 440, ry + 5, 10, font);
  rightText(money(Number(order.total_amount)), W - M - 10, ry + 5, 10, font);
  page.drawLine({ start: { x: M, y: ry }, end: { x: W - M, y: ry }, thickness: 1, color: C.line });

  // ── Totals ──
  ry -= 24;
  rightText("Subtotal", W - M - 120, ry, 10, font, C.muted);
  rightText(money(Number(order.total_amount)), W - M - 10, ry, 10, font);
  ry -= 18;
  rightText("Shipping", W - M - 120, ry, 10, font, C.muted);
  rightText("FREE", W - M - 10, ry, 10, font);
  ry -= 8;
  page.drawRectangle({ x: W - M - 220, y: ry - 26, width: 220, height: 26, color: C.maroon });
  text("TOTAL", W - M - 210, ry - 18, 12, bold, C.gold);
  rightText(money(Number(order.total_amount)), W - M - 10, ry - 18, 13, bold, C.white);

  // Payment status pill
  ry -= 44;
  const payLabel =
    order.payment_method === "cod"
      ? order.payment_status === "paid"
        ? "COD - PAID"
        : "Cash on Delivery"
      : order.payment_status === "paid"
        ? "PAID ONLINE (Razorpay)"
        : "Online - Pending";
  text(`Payment: ${payLabel}`, M, ry, 10, bold, C.navy);

  // ── Footer note ──
  const fY = 90;
  page.drawLine({
    start: { x: M, y: fY + 18 },
    end: { x: W - M, y: fY + 18 },
    thickness: 1,
    color: C.line,
  });
  text(
    "This is a computer-generated invoice for a blessed / ritual item. As a pooja article, it is",
    M,
    fY,
    8,
    font,
    C.muted,
  );
  text(
    "non-returnable and non-refundable. For any help, contact us on the number above. Thank you!",
    M,
    fY - 11,
    8,
    font,
    C.muted,
  );
  rightText("Diamond House, Kolhapur", W - M, fY - 11, 8, bold, C.maroon);

  return await pdf.save();
}

// Convenience: computes the number and builds the PDF for an order.
export async function generateInvoice(
  admin: SupabaseClient,
  order: InvoiceOrder,
): Promise<{ number: string; pdf: Uint8Array; biz: InvoicingSettings }> {
  const biz = await getInvoicingSettings(admin);
  const number = await computeInvoiceNumber(admin, order, biz.prefix || "DH");
  const pdf = await buildInvoicePdf(order, biz, number);
  return { number, pdf, biz };
}
