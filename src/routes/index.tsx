import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { GoldSwash } from "@/components/GoldSwash";
import { LegalLinks } from "@/components/LegalPage";
import { Instagram, Facebook, Youtube, MessageCircle } from "lucide-react";
import { getActiveProduct, getTestimonials, getSiteContent } from "@/lib/queries";
import { track } from "@/lib/analytics";
import { toEmbed } from "@/lib/embed";
import templeBg from "@/assets/temple-bg.jpg";
import stoneMacro from "@/assets/stone-macro.jpg";
import stoneHand from "@/assets/stone-hand.jpg";
import stoneBox from "@/assets/stone-box.jpg";
import family from "@/assets/family.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "इच्छापूर्ती लकी स्टोन | Diamond House, Kolhapur" },
      {
        name: "description",
        content:
          "श्री स्वामी समर्थ आशीर्वादित इच्छापूर्ती लकी स्टोन — कोल्हापूरचे २५+ वर्षांचे विश्वासू दुकान. सिद्ध शुभरत्न, सुरक्षित डिलिव्हरी, थेट संपर्क.",
      },
      { property: "og:title", content: "इच्छापूर्ती लकी स्टोन | Diamond House, Kolhapur" },
      {
        property: "og:description",
        content:
          "Kolhapur's trusted Icchapurti Lucky Stone — 25+ years of genuine blessings from Diamond House.",
      },
    ],
  }),
  // DB-driven: product price, testimonials and editable site content come from Supabase.
  loader: async () => {
    const [product, testimonials, content] = await Promise.all([
      getActiveProduct(),
      getTestimonials(),
      getSiteContent(),
    ]);
    return { product, testimonials, content };
  },
  component: Index,
});

const PHONE = "96 57 130 131";
const PHONE_TEL = "tel:+919657130131";

const problems = [
  { icon: "📉", text: "व्यवसायात अडथळे येतायत?" },
  { icon: "🧗", text: "नोकरीत प्रगती थांबलीये?" },
  { icon: "💍", text: "लग्न किंवा नात्यात विलंब?" },
  { icon: "🌫️", text: "मनात सतत अस्वस्थता, अशांती?" },
];

const steps = [
  { icon: "🌙", title: "दुधात ठेवा", desc: "रात्री शुद्ध दुधात रत्न ठेवा." },
  { icon: "🌅", title: "सूर्योदयी पूजा करा", desc: "सकाळी स्वच्छ करून पूजेत ठेवा." },
  { icon: "🙏", title: "सदैव जवळ ठेवा", desc: "श्रद्धेने खिशात किंवा पर्समध्ये ठेवा." },
];

const included = [
  "शास्त्रोक्त पद्धतीने सिद्ध केलेले शुभरत्न",
  "लाल मखमली पोटली + पवित्र धागा",
  "पूजा विधीची मराठी माहिती पुस्तिका",
  "Diamond House चे अस्सलतेचे प्रमाणपत्र",
  "सुरक्षित पॅकिंग व घरपोच डिलिव्हरी",
];

const faqs = [
  {
    q: "रत्न असली आहे का?",
    a: "होय. Diamond House, कोल्हापूर हे २५+ वर्षांपासून याच ठिकाणी कार्यरत आहे. प्रत्येक शुभरत्नासोबत आमचे अस्सलतेचे प्रमाणपत्र दिले जाते आणि तुम्ही दुकानात येऊन प्रत्यक्ष पाहूही शकता.",
  },
  {
    q: "रिफंड मिळेल का?",
    a: "शुभरत्न हे पूजन व सिद्ध केलेले वस्तू असल्याने ते परत घेतले जात नाही. मात्र ऑर्डर करण्यापूर्वी आम्ही फोनवर सर्व शंकांचे समाधान करतो — 96 57 130 131.",
  },
  {
    q: "डिलिव्हरी किती दिवसात?",
    a: "महाराष्ट्रात साधारण ३–५ कामकाजाच्या दिवसांत. कोल्हापूर विभागात अनेकदा २ दिवसांत पोहोच होते. पाठवल्यावर तुम्हाला फोनवर कळवले जाते.",
  },
  {
    q: "कोणासाठी योग्य आहे?",
    a: "श्रद्धा असणाऱ्या कोणत्याही स्त्री-पुरुषासाठी. हे मन:शांती, सकारात्मक ऊर्जा व आत्मविश्वासासाठी श्रद्धेने वापरले जाते; कोणताही वैद्यकीय किंवा कायदेशीर दावा आम्ही करत नाही.",
  },
  {
    q: "पेमेंट सुरक्षित आहे का?",
    a: "होय. Cash on Delivery तसेच UPI हे दोन्ही पर्याय उपलब्ध आहेत. तुम्ही थेट दुकानातही येऊन खरेदी करू शकता.",
  },
];

function CtaButton({
  children,
  className = "",
  to = "/checkout",
}: {
  children: React.ReactNode;
  className?: string;
  to?: string;
}) {
  return (
    <Link
      to={to}
      data-testid="cta-order-button"
      className={`shimmer cta-gold-pulse relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full bg-navy px-8 text-base font-semibold tracking-wide text-gold-light transition-transform duration-200 hover:scale-[1.03] ${className}`}
    >
      <span className="relative z-10 deva">{children}</span>
    </Link>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center">
      <h2 className="deva text-3xl leading-tight font-normal text-primary md:text-5xl">
        {children}
      </h2>
      <GoldSwash className="mt-3" />
      {sub ? <p className="mt-3 text-sm text-muted-foreground md:text-base">{sub}</p> : null}
    </div>
  );
}

function Index() {
  const { product, testimonials, content } = Route.useLoaderData();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Fire ViewContent / view_item once when the landing page (hero product) loads.
  useEffect(() => {
    track("ViewContent", "view_item", {
      currency: "INR",
      value: Number(product.price),
      content_name: product.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const price = Number(product.price);
  const compare = product.compare_at_price ? Number(product.compare_at_price) : null;
  const discount = compare && compare > price ? Math.round((1 - price / compare) * 100) : null;

  // Split headline at the last comma so the tail renders in gold (matches original).
  const headline = content["hero_headline"] || "स्वामींचा आशीर्वाद, तुमच्या हातात";
  const heroVideo = toEmbed(content["hero_video_url"] || "");
  const ci = headline.lastIndexOf(",");
  const headHead = ci > -1 ? headline.slice(0, ci + 1) : headline;
  const headTail = ci > -1 ? headline.slice(ci + 1).trim() : "";

  return (
    <main className="relative overflow-x-hidden pb-24 md:pb-0">
      {/* ANNOUNCEMENT BAR */}
      {content["announcement"] && (
        <div className="bg-maroon px-4 py-2 text-center" data-testid="announcement-bar">
          <p className="deva text-xs text-primary-foreground md:text-sm">
            {content["announcement"]}
          </p>
        </div>
      )}

      {/* HERO */}
      <section className="relative isolate overflow-hidden px-5 pt-14 pb-16 md:pt-20 md:pb-24">
        <img
          src={templeBg}
          alt=""
          aria-hidden="true"
          width={1600}
          height={1008}
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover opacity-25"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--ivory) 82%, transparent), var(--ivory) 78%), var(--gradient-glow)",
          }}
        />
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="deva inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs tracking-wide text-primary md:text-sm">
              {content["hero_badge"] || "ॐ श्री स्वामी समर्थ · Diamond House, कोल्हापूर"}
            </p>
            <h1 className="deva mt-6 text-[2.5rem] leading-[1.1] font-normal text-primary md:text-7xl">
              {headHead}
              {headTail && (
                <>
                  <br />
                  <span className="text-gold-gradient">{headTail}</span>
                </>
              )}
            </h1>
            <GoldSwash className="mt-4 w-56" />
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-lg">
              {content["hero_subheadline"] ||
                "Kolhapur's Trusted Icchapurti Lucky Stone — 25+ Years of Genuine Blessings"}
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-9">
            <div
              className="group relative mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-accent/60"
              style={{ boxShadow: "var(--shadow-gold)" }}
            >
              {heroVideo ? (
                heroVideo.type === "iframe" ? (
                  <iframe
                    src={heroVideo.src}
                    title="Diamond House"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <video src={heroVideo.src} controls className="h-full w-full object-cover" />
                )
              ) : (
                <>
                  <img
                    src={content["hero_banner_image"] || stoneMacro}
                    alt="इच्छापूर्ती लकी स्टोन — मखमली पार्श्वभूमीवर"
                    width={1200}
                    height={1200}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--maroon)_35%,transparent)]" />
                  <span className="deva absolute bottom-3 left-4 rounded-full bg-navy/80 px-3 py-1 text-xs text-gold-light">
                    दुकानातील प्रत्यक्ष झलक
                  </span>
                </>
              )}
            </div>
          </Reveal>

          <Reveal delay={200} className="mt-9">
            <CtaButton className="px-10 text-lg">आत्ताच मागवा</CtaButton>
            <p className="deva mt-3 text-xs text-muted-foreground">
              मर्यादित स्टॉक — फक्त कोल्हापूर विभागासाठी
            </p>
            <ul className="mx-auto mt-7 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["🏠", "कोल्हापूर स्थित दुकान"],
                ["✅", "१००% असली"],
                ["🚚", "सुरक्षित डिलिव्हरी"],
                ["📞", "थेट संपर्क"],
              ].map(([icon, label]) => (
                <li
                  key={label}
                  className="surface-card deva flex flex-col items-center gap-1 px-3 py-3 text-xs text-foreground md:text-sm"
                >
                  <span className="text-lg">{icon}</span>
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-navy px-5 py-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 text-center md:flex-row md:gap-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold text-xs text-gold">
            ✓
          </span>
          <p className="deva text-sm text-gold-light md:text-base">
            श्री स्वामी समर्थ आशीर्वादित <span className="text-gold">|</span> महालक्ष्मी मंदिरामागे,
            जोतिबा रोड, कोल्हापूर
          </p>
        </div>
      </section>

      {/* PROBLEMS */}
      <section className="px-5 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionTitle sub="श्रद्धेने पाहिल्यास, प्रत्येक अडथळ्यामागे एक ऊर्जा असते.">
              आयुष्यात या समस्या जाणवतायत का?
            </SectionTitle>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((p, i) => (
              <Reveal key={p.text} delay={i * 90}>
                <div className="surface-card h-full px-5 py-7 text-center transition-transform duration-200 hover:-translate-y-1">
                  <span className="text-3xl">{p.icon}</span>
                  <p className="deva mt-4 text-base leading-relaxed text-foreground">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="relative px-5 py-16 md:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "var(--gradient-glow)", opacity: 0.35 }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div
              className="overflow-hidden rounded-3xl border border-accent/50"
              style={{ boxShadow: "var(--shadow-gold)" }}
            >
              <img
                src={stoneHand}
                alt="सिद्ध शुभरत्न, लाल मखमली पोटली आणि पवित्र धाग्यासह"
                loading="lazy"
                width={1008}
                height={1008}
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="deva text-3xl leading-tight text-primary md:text-4xl">
              सिद्ध शुभरत्न — शास्त्रोक्त पद्धतीने सिद्ध केलेले खरे रत्न
            </h2>
            <div className="mt-4 h-px w-24 bg-accent" />
            <p className="deva mt-5 text-base leading-loose text-muted-foreground">
              प्रत्येक शुभरत्न आमच्या कोल्हापूरच्या दुकानात निवडले जाते आणि गुरुवारी विधिवत पूजन
              करून, मंत्रोच्चारासह सिद्ध केले जाते. कोणतीही घाई नाही, कोणताही शॉर्टकट नाही — फक्त
              पिढ्यानपिढ्या चालत आलेली पद्धत आणि स्वामींवरची श्रद्धा. गेली २५ वर्षे हजारो कुटुंबांनी
              हाच विश्वास आमच्यावर ठेवला आहे.
            </p>
            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="surface-card px-4 py-5">
                  <span className="deva text-xs text-accent">पायरी {i + 1}</span>
                  <div className="mt-1 text-2xl">{s.icon}</div>
                  <p className="deva mt-2 text-base font-medium text-foreground">{s.title}</p>
                  <p className="deva mt-1 text-xs text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-0 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <SectionTitle sub="कोल्हापूर आणि आसपासच्या कुटुंबांचे मनापासून शब्द">
              आमच्या ग्राहकांचे अनुभव
            </SectionTitle>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div
            className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:justify-center md:px-8"
            data-testid="testimonials-list"
          >
            {testimonials.map((t, i) => (
              <article
                key={`${t.customer_name}-${i}`}
                className="surface-card w-[268px] shrink-0 snap-center overflow-hidden p-0 md:w-[300px]"
              >
                <div className="relative aspect-[4/3] border-b border-accent/40">
                  <img
                    src={family}
                    alt={`${t.customer_name} यांचा अनुभव`}
                    loading="lazy"
                    width={1200}
                    height={800}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_oklab,var(--maroon)_25%,transparent)]">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory/90 text-primary">
                      ▶
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-sm tracking-widest text-accent">★★★★★</div>
                  <p className="deva mt-2 text-sm leading-relaxed text-foreground">“{t.quote}”</p>
                  <p className="deva mt-3 text-xs text-muted-foreground">
                    {t.customer_name}
                    {t.customer_city ? `, ${t.customer_city}` : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      {/* PRODUCT + PRICING */}
      <section id="order" className="px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <Reveal>
            <div
              className="overflow-hidden rounded-3xl border border-accent/50"
              style={{ boxShadow: "var(--shadow-gold)" }}
            >
              <img
                src={stoneBox}
                alt="इच्छापूर्ती लकी स्टोन प्रमाणपत्रासह भेट पेटीत"
                loading="lazy"
                width={1008}
                height={1008}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[stoneMacro, stoneHand, family].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="इच्छापूर्ती लकी स्टोन — अन्य दृश्य"
                  loading="lazy"
                  width={600}
                  height={600}
                  className="aspect-square w-full rounded-xl border border-border object-cover"
                />
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h2 className="deva text-3xl leading-tight text-primary md:text-4xl">
              {product.name || "इच्छापूर्ती लकी स्टोन"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Diamond House · Kolhapur · Since 1999
            </p>
            <div className="mt-6 flex items-end gap-3">
              <span
                className="font-display text-5xl font-bold text-navy md:text-6xl"
                data-testid="product-price"
              >
                ₹{price.toLocaleString("en-IN")}
              </span>
              {compare && (
                <span className="mb-2 text-lg text-muted-foreground line-through">
                  ₹{compare.toLocaleString("en-IN")}
                </span>
              )}
              {discount && (
                <span className="deva mb-2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                  {discount}% सवलत
                </span>
              )}
            </div>
            <p className="deva mt-2 text-sm text-primary">
              मर्यादित स्टॉक — फक्त कोल्हापूर विभागासाठी
            </p>

            <h3 className="deva mt-8 text-xl text-foreground">काय समाविष्ट आहे</h3>
            <ul className="mt-4 space-y-3">
              {included.map((item) => (
                <li key={item} className="deva flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] text-accent-foreground">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton className="px-10 text-lg">आत्ताच मागवा</CtaButton>
              <a
                href={PHONE_TEL}
                className="deva inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--whatsapp)] px-6 text-sm font-medium text-[var(--whatsapp)] transition-colors hover:bg-[color-mix(in_oklab,var(--whatsapp)_12%,transparent)]"
              >
                📞 {PHONE}
              </a>
            </div>
            <p className="deva mt-3 text-xs text-muted-foreground">
              Cash on Delivery व UPI उपलब्ध · संपूर्ण महाराष्ट्रात डिलिव्हरी
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <SectionTitle>सामान्य प्रश्न</SectionTitle>
          </Reveal>
          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <div className="surface-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="deva flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-4 text-left text-base text-foreground"
                  >
                    {f.q}
                    <span className="text-accent">{openFaq === i ? "−" : "+"}</span>
                  </button>
                  {openFaq === i && (
                    <p className="deva border-t border-border px-5 py-4 text-sm leading-loose text-muted-foreground">
                      {f.a}
                    </p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-navy px-5 py-14 text-gold-light">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold text-lg">
                🪔
              </span>
              <div>
                <p className="font-display text-lg text-gold">Diamond House</p>
                <p className="deva text-xs opacity-80">श्री स्वामी समर्थ आशीर्वादित</p>
              </div>
            </div>
            <p className="deva mt-4 text-sm leading-relaxed opacity-90">
              महालक्ष्मी मंदिरामागे, जोतिबा रोड,
              <br />
              कोल्हापूर, महाराष्ट्र
            </p>
          </div>
          <div>
            <p className="deva text-sm font-medium text-gold">संपर्क</p>
            <a href={PHONE_TEL} className="mt-3 block text-lg tracking-wide">
              📞 {PHONE}
            </a>
            <p className="deva mt-2 text-xs opacity-80">
              सकाळी १० ते रात्री ८ · गुरुवारी विशेष पूजन
            </p>
          </div>
          <div>
            <p className="deva text-sm font-medium text-gold">महत्त्वाची सूचना</p>
            <p className="deva mt-3 text-xs leading-relaxed opacity-70">
              शुभरत्न न लाभल्यास किंवा इतर कोणत्याही कारणास्तव परत घेतले जाणार नाही. हे उत्पादन
              श्रद्धा व सकारात्मक ऊर्जेसाठी आहे; कोणताही वैद्यकीय अथवा कायदेशीर दावा केला जात नाही.
            </p>
          </div>
        </div>
        <p className="deva mt-10 text-center text-xs opacity-60">
          © {new Date().getFullYear()} Diamond House, कोल्हापूर. सर्व हक्क राखीव.
        </p>
        {(content["social_instagram"] ||
          content["social_facebook"] ||
          content["social_youtube"] ||
          content["social_whatsapp_channel"]) && (
          <div className="mt-5 flex justify-center gap-3">
            {content["social_instagram"] && (
              <a
                href={content["social_instagram"]}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold text-gold-light transition-colors hover:bg-gold hover:text-navy"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {content["social_facebook"] && (
              <a
                href={content["social_facebook"]}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold text-gold-light transition-colors hover:bg-gold hover:text-navy"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {content["social_youtube"] && (
              <a
                href={content["social_youtube"]}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold text-gold-light transition-colors hover:bg-gold hover:text-navy"
              >
                <Youtube className="h-4 w-4" />
              </a>
            )}
            {content["social_whatsapp_channel"] && (
              <a
                href={content["social_whatsapp_channel"]}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold text-gold-light transition-colors hover:bg-gold hover:text-navy"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-center">
          <LegalLinks className="justify-center" />
        </div>
      </footer>

      {/* STICKY MOBILE CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-bold text-navy">
              ₹{price.toLocaleString("en-IN")}
            </p>
            {compare && (
              <p className="text-[11px] text-muted-foreground line-through">
                ₹{compare.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <CtaButton className="flex-1 px-6">आत्ताच मागवा</CtaButton>
        </div>
      </div>
    </main>
  );
}
