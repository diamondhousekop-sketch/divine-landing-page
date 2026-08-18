import { createFileRoute } from "@tanstack/react-router";
import { getSiteContent } from "@/lib/queries";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

const def = LEGAL.contact;

export const Route = createFileRoute("/contact-us")({
  head: () => ({ meta: [{ title: `${def.title} | Diamond House` }] }),
  loader: async () => ({ content: await getSiteContent() }),
  component: Page,
});

function Page() {
  const { content } = Route.useLoaderData();
  return <LegalPage title={content[def.titleKey] || def.title} body={content[def.bodyKey] || def.body} />;
}
