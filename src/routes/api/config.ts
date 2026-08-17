import { createFileRoute } from "@tanstack/react-router";
import { getRazorpayConfig } from "@/lib/razorpay.server";
import { json } from "@/lib/http.server";

// Public, client-safe config: tells the checkout page whether online payment is
// available and exposes ONLY the public Razorpay key id (never the secret).
export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = await getRazorpayConfig();
        return json({
          online_enabled: !!cfg,
          razorpay_key_id: cfg?.key_id ?? "",
        });
      },
    },
  },
});
