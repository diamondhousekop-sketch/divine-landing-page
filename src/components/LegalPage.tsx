import { Link } from "@tanstack/react-router";
import { GoldSwash } from "@/components/GoldSwash";
import { LEGAL, LEGAL_ORDER, CONTACT_INFO } from "@/lib/legal";

// Footer with legal links, matching the homepage navy footer style. Reused across
// legal pages; the homepage renders its own richer footer + these same links.
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`} data-testid="legal-links">
      {LEGAL_ORDER.map((k) => (
        <Link
          key={k}
          to={LEGAL[k].path}
          className="deva text-xs text-gold-light/80 underline-offset-4 transition-colors hover:text-gold hover:underline"
          data-testid={`legal-link-${k}`}
        >
          {LEGAL[k].footerLabel}
        </Link>
      ))}
    </nav>
  );
}

// Full page shell for a single legal page: navy header band + content card + footer.
export function LegalPage({ title, body }: { title: string; body: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Header */}
      <header className="bg-navy px-5 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="legal-home-link">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold text-lg">
              🪔
            </span>
            <span className="font-display text-lg text-gold">Diamond House</span>
          </Link>
          <Link to="/" className="deva text-sm text-gold-light/90 hover:text-gold">
            ← मुख्य पान
          </Link>
        </div>
      </header>

      <section className="px-5 py-14 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h1
              className="deva text-3xl font-normal text-primary md:text-4xl"
              data-testid="legal-title"
            >
              {title}
            </h1>
            <GoldSwash className="mx-auto mt-3 w-44" />
          </div>
          <article className="surface-card mt-8 space-y-4 p-6 md:p-9" data-testid="legal-content">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="deva whitespace-pre-line text-sm leading-loose text-foreground md:text-base"
              >
                {p}
              </p>
            ))}
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy px-5 py-10 text-gold-light">
        <div className="mx-auto max-w-4xl">
          <p className="deva text-sm leading-relaxed opacity-90">
            {CONTACT_INFO.name}, कोल्हापूर · 📞 {CONTACT_INFO.phone}
          </p>
          <LegalLinks className="mt-4" />
          <p className="deva mt-6 text-xs opacity-60">
            © {new Date().getFullYear()} Diamond House, कोल्हापूर. सर्व हक्क राखीव.
          </p>
        </div>
      </footer>
    </main>
  );
}
