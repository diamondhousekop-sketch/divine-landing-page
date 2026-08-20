// Name-letter → lucky-color groups for the Siddha Shubhratna product.
// Transcribed directly from the store's own printed reference card
// ("सिद्ध शुभरत्न खालील नावांच्या व्यक्तींसाठी लाभदायक आहे").
//
// Each customer's first-name akshar (Devanagari letter/syllable) maps to
// exactly one color — this is the color of the stone they'll actually
// receive. Customers pick their letter before ordering so both they and
// the store know the right color ahead of time; the choice is sent along
// with the order.

export type RashiGroupId = "red" | "white" | "green" | "yellow" | "grey";

export type RashiGroup = {
  id: RashiGroupId;
  label: string; // Marathi color name
  hex: string; // swatch color
  textOnHex: string; // readable text color for the swatch chip
  letters: string[];
};

export const RASHI_GROUPS: RashiGroup[] = [
  {
    id: "red",
    label: "लाल",
    hex: "#B3261E",
    textOnHex: "#FBF6EC",
    letters: ["अ", "ल", "इ", "न", "य", "म", "ट", "ए"],
  },
  {
    id: "white",
    label: "पांढरा",
    hex: "#F5F0E4",
    textOnHex: "#1B2A4B",
    letters: ["ब", "व", "उ", "र", "त", "ड", "ह"],
  },
  {
    id: "green",
    label: "हिरवा",
    hex: "#2E7D46",
    textOnHex: "#FBF6EC",
    letters: ["क", "छ", "घ", "प", "श", "ण", "ढ"],
  },
  {
    id: "yellow",
    label: "पिवळा",
    hex: "#E8C020",
    textOnHex: "#1B2A4B",
    letters: ["भ", "ध", "फ", "ट", "द", "च", "ज्ञ", "थ"],
  },
  {
    id: "grey",
    label: "करडा",
    hex: "#4B4B4B",
    textOnHex: "#FBF6EC",
    letters: ["श्री", "ख", "ज", "ग", "स"],
  },
];

/** Every akshar across all groups, in a natural reading order, for the selector. */
export const ALL_LETTERS: { letter: string; groupId: RashiGroupId }[] = RASHI_GROUPS.flatMap((g) =>
  g.letters.map((letter) => ({ letter, groupId: g.id })),
);

export function groupForLetter(letter: string): RashiGroup | null {
  return RASHI_GROUPS.find((g) => g.letters.includes(letter)) ?? null;
}

export function groupById(id: string): RashiGroup | null {
  return RASHI_GROUPS.find((g) => g.id === id) ?? null;
}
