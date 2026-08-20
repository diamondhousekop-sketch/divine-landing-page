import { RASHI_GROUPS, groupForLetter, type RashiGroupId } from "@/lib/rashi";

/**
 * Lets the customer pick the first akshar (Devanagari letter) of their name
 * and immediately shows which color of Siddha Shubhratna that maps to —
 * so both the customer and the store know the right color before the order
 * is even placed. Letters are grouped and color-coded exactly like the
 * store's own printed reference card.
 */
export function ColorLetterPicker({
  letter,
  onChange,
  required,
  error,
}: {
  letter: string;
  onChange: (letter: string) => void;
  required?: boolean;
  error?: string;
}) {
  const activeGroup = letter ? groupForLetter(letter) : null;

  return (
    <div data-testid="color-letter-picker">
      <p className="deva text-sm font-medium text-foreground">
        तुमच्या नावाचे पहिले अक्षर निवडा {required && <span className="text-destructive">*</span>}
      </p>
      <p className="deva mt-1 text-xs text-muted-foreground">
        त्यानुसार तुम्हाला कोणत्या रंगाचा शुभरत्न मिळेल हे लगेच कळेल — तोच रंग तुमच्या ऑर्डरसोबत
        पाठवला जाईल.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {RASHI_GROUPS.map((g) => (
          <div key={g.id} className="flex flex-wrap gap-1.5">
            {g.letters.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onChange(l)}
                data-testid={`color-letter-${l}`}
                aria-pressed={letter === l}
                className={`deva flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-all ${
                  letter === l
                    ? "scale-110 ring-2 ring-navy ring-offset-2 ring-offset-background"
                    : "hover:scale-105"
                }`}
                style={{ background: g.hex, color: g.textOnHex }}
              >
                {l}
              </button>
            ))}
          </div>
        ))}
      </div>

      {activeGroup && (
        <div
          className="surface-card mt-4 flex items-center gap-3 px-4 py-3"
          data-testid="color-result"
        >
          <span
            className="h-8 w-8 shrink-0 rounded-full border border-border"
            style={{ background: activeGroup.hex }}
          />
          <p className="deva text-sm text-foreground">
            तुमच्यासाठी शुभ रंग: <span className="font-semibold">{activeGroup.label}</span> — हाच
            रंग तुम्हाला मिळेल.
          </p>
        </div>
      )}

      {error && <p className="deva mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export type { RashiGroupId };
