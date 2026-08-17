import { Resend } from "resend";

// SERVER-ONLY email helpers using Resend. Bilingual (Marathi + English) HTML
// templates in the maroon/gold/navy brand palette. All sends are best-effort:
// a failed email must never block an order from being placed.
if (typeof window !== "undefined") {
  throw new Error("email.server.ts must not be imported in the browser bundle");
}

const BRAND = {
  ivory: "#FBF6EC",
  maroon: "#6E1423",
  gold: "#C9962C",
  goldLight: "#E8C878",
  navy: "#1B2A4B",
};

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  // Resend requires a verified sender domain. If not provided, fall back to
  // Resend's shared test sender which works in sandbox mode.
  if (!from || !/@/.test(from) || /gmai\.com$|@gmail\.com$/i.test(from)) {
    return "Diamond House <onboarding@resend.dev>";
  }
  return `Diamond House <${from}>`;
}

function siteUrl(): string {
  return process.env.SITE_URL || "http://localhost:3000";
}

type OrderLike = {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_pincode: string;
  quantity: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
};

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:${BRAND.ivory};font-family:Georgia,serif;color:#2B1A12;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="text-align:center;padding:20px;background:${BRAND.navy};border-radius:16px 16px 0 0;">
        <div style="color:${BRAND.gold};font-size:20px;letter-spacing:1px;">🪔 Diamond House</div>
        <div style="color:${BRAND.goldLight};font-size:12px;">श्री स्वामी समर्थ आशीर्वादित · कोल्हापूर</div>
      </div>
      <div style="background:#fff;border:1px solid #E4D4B8;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
        <h1 style="color:${BRAND.maroon};font-size:22px;margin:0 0 16px;">${title}</h1>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #E4D4B8;margin:24px 0;">
        <p style="font-size:12px;color:#6b5b4b;">महालक्ष्मी मंदिरामागे, जोतिबा रोड, कोल्हापूर · 📞 96 57 130 131</p>
      </div>
    </div></body></html>`;
}

function orderTable(order: OrderLike): string {
  const method = order.payment_method === "cod" ? "Cash on Delivery (COD)" : "Online (Razorpay)";
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;color:#6b5b4b;">ऑर्डर क्र. / Order No.</td><td style="padding:6px 0;text-align:right;font-weight:bold;">${order.order_number}</td></tr>
    <tr><td style="padding:6px 0;color:#6b5b4b;">ग्राहक / Name</td><td style="padding:6px 0;text-align:right;">${order.customer_name}</td></tr>
    <tr><td style="padding:6px 0;color:#6b5b4b;">फोन / Phone</td><td style="padding:6px 0;text-align:right;">${order.customer_phone}</td></tr>
    <tr><td style="padding:6px 0;color:#6b5b4b;">पत्ता / Address</td><td style="padding:6px 0;text-align:right;">${order.customer_address}, ${order.customer_pincode}</td></tr>
    <tr><td style="padding:6px 0;color:#6b5b4b;">संख्या / Qty</td><td style="padding:6px 0;text-align:right;">${order.quantity}</td></tr>
    <tr><td style="padding:6px 0;color:#6b5b4b;">पेमेंट / Payment</td><td style="padding:6px 0;text-align:right;">${method}</td></tr>
    <tr><td style="padding:10px 0;color:${BRAND.maroon};font-weight:bold;">एकूण / Total</td><td style="padding:10px 0;text-align:right;color:${BRAND.maroon};font-weight:bold;font-size:18px;">₹${order.total_amount}</td></tr>
  </table>`;
}

async function send(to: string, subject: string, html: string) {
  const client = resendClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY missing — skipping email:", subject);
    return;
  }
  try {
    const res = await client.emails.send({ from: fromAddress(), to, subject, html });
    if (res.error) console.error("[email] Resend error:", res.error);
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

export async function sendOrderConfirmation(order: OrderLike, customerEmail?: string) {
  if (!customerEmail) return; // customer email is optional in the checkout form
  const html = shell(
    "तुमची ऑर्डर मिळाली! / Order received",
    `<p style="font-size:15px;line-height:1.7;">नमस्कार ${order.customer_name},<br>तुमची इच्छापूर्ती लकी स्टोन ऑर्डर यशस्वीरित्या नोंदवली गेली आहे. 🙏</p>
     <p style="font-size:13px;color:#6b5b4b;">Your order has been placed successfully. We will contact you shortly on your phone.</p>
     ${orderTable(order)}`,
  );
  await send(customerEmail, `Diamond House — ऑर्डर ${order.order_number} मिळाली`, html);
}

export async function sendPaymentConfirmation(order: OrderLike, customerEmail?: string) {
  if (!customerEmail) return;
  const html = shell(
    "पेमेंट यशस्वी / Payment successful",
    `<p style="font-size:15px;line-height:1.7;">धन्यवाद ${order.customer_name}! तुमचे पेमेंट यशस्वीरित्या प्राप्त झाले आहे. ✅</p>
     <p style="font-size:13px;color:#6b5b4b;">Your payment has been received. Your order is now confirmed.</p>
     ${orderTable(order)}`,
  );
  await send(customerEmail, `Diamond House — पेमेंट मिळाले (${order.order_number})`, html);
}

export async function sendAdminAlert(order: OrderLike) {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) return;
  const html = shell(
    "🔔 नवीन ऑर्डर / New order",
    `<p style="font-size:15px;">A new order has been placed on the website.</p>
     ${orderTable(order)}
     <p style="margin-top:16px;"><a href="${siteUrl()}/admin/orders" style="background:${BRAND.navy};color:${BRAND.goldLight};padding:10px 20px;border-radius:999px;text-decoration:none;font-size:14px;">Open Admin Panel</a></p>`,
  );
  await send(to, `🔔 New order ${order.order_number} — ₹${order.total_amount} (${order.payment_method.toUpperCase()})`, html);
}

export async function sendShippingUpdate(order: OrderLike, customerEmail?: string) {
  if (!customerEmail) return;
  const html = shell(
    "तुमची ऑर्डर पाठवली आहे / Order shipped",
    `<p style="font-size:15px;line-height:1.7;">नमस्कार ${order.customer_name}, तुमची ऑर्डर पाठवण्यात आली आहे. 🚚</p>
     <p style="font-size:13px;color:#6b5b4b;">Your order is on the way and will reach you in 2–5 working days.</p>
     ${orderTable(order)}`,
  );
  await send(customerEmail, `Diamond House — ऑर्डर पाठवली (${order.order_number})`, html);
}

export async function sendDeliveryConfirmation(order: OrderLike, customerEmail?: string) {
  if (!customerEmail) return;
  const html = shell(
    "ऑर्डर पोहोचली / Delivered",
    `<p style="font-size:15px;line-height:1.7;">नमस्कार ${order.customer_name}, तुमची ऑर्डर पोहोचली आहे. 🙏 स्वामींचा आशीर्वाद तुमच्यासोबत राहो.</p>
     <p style="font-size:13px;color:#6b5b4b;">Your order has been delivered. Thank you for trusting Diamond House.</p>
     ${orderTable(order)}`,
  );
  await send(customerEmail, `Diamond House — ऑर्डर पोहोचली (${order.order_number})`, html);
}
