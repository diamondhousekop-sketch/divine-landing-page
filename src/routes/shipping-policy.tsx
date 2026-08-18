import { createFileRoute } from "@tanstack/react-router";
import { getSiteContent } from "@/lib/queries";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({ meta: [{ title: `${LEGAL.shipping.title} | Diamond House` }] }),
  loader: async () => ({ content: await getSiteContent() }),
  component: Page,
});

function Page() {
  const def = LEGAL.shipping;
  const { content } = Route.useLoaderData();
  return (
    <LegalPage title={content[def.titleKey] || def.title} body={content[def.bodyKey] || def.body} />
  );
}
