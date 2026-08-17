export function GoldSwash({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 18"
      aria-hidden="true"
      className={`mx-auto h-4 w-44 ${className}`}
      fill="none"
    >
      <path
        d="M4 12C40 4 78 3 110 9c32 6 70 5 106-3"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M74 15c22-4 52-4 74 0"
        stroke="var(--gold-light)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="110" cy="9" r="2.6" fill="var(--gold)" />
    </svg>
  );
}
