export type FamilyFocus =
  | "mixed"
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

export type MultiplicationFact = {
  family: number;
  id: string;
  left: number;
  product: number;
  right: number;
};

export type IslandDefinition = {
  description: string;
  focus: FamilyFocus;
  id: string;
  tagline: string;
  tint: string;
  title: string;
};

export type FocusTheme = {
  accent: string;
  badge: string;
  subtitle: string;
  surface: string;
  title: string;
};

export const CLASSIC_FAMILIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const FAMILY_OPTIONS: Array<{ key: FamilyFocus; label: string }> = [
  { key: 1, label: "1er" },
  { key: 2, label: "2er" },
  { key: 3, label: "3er" },
  { key: 4, label: "4er" },
  { key: 5, label: "5er" },
  { key: 6, label: "6er" },
  { key: 7, label: "7er" },
  { key: 8, label: "8er" },
  { key: 9, label: "9er" },
  { key: 10, label: "10er" },
  { key: "mixed", label: "Gemischt" },
];

export const ALL_FACTS: MultiplicationFact[] = Array.from(
  { length: 10 },
  (_, leftIndex) =>
    Array.from({ length: 10 }, (_, rightIndex) => {
      const left = leftIndex + 1;
      const right = rightIndex + 1;

      return {
        family: left,
        id: `${left}x${right}`,
        left,
        product: left * right,
        right,
      };
    })
).flat();

export const ALL_TRAINING_FACTS = ALL_FACTS;

export const ISLANDS: IslandDefinition[] = [
  {
    id: "funkenwald",
    title: "Funkenwald",
    tagline: "Starterinsel",
    description: "Die ruhige Einstiegsinsel mit den 1er- und 2er-Reihen.",
    focus: 2,
    tint: "#0f766e",
  },
  {
    id: "hafen-der-kisten",
    title: "Hafen der Kisten",
    tagline: "Rhythmus-Insel",
    description: "Hier kommen die schnellen 5er- und 10er-Aufgaben zusammen.",
    focus: 5,
    tint: "#ea580c",
  },
  {
    id: "vulkan-von-vielmal",
    title: "Vulkan von Vielmal",
    tagline: "Boss-Gefühl",
    description: "Eine gemischte Runde als Vorschau auf spätere Bosskämpfe.",
    focus: "mixed",
    tint: "#e11d48",
  },
];

export function formatFamilyLabel(focus: FamilyFocus) {
  return focus === "mixed" ? "gemischte Runde" : `${focus}er-Reihe`;
}

export function formatFactExpression(fact: Pick<MultiplicationFact, "left" | "right">) {
  return `${fact.right} x ${fact.left}`;
}

export function getFactsForFocus(focus: FamilyFocus) {
  if (focus === "mixed") {
    return ALL_TRAINING_FACTS;
  }

  return ALL_FACTS.filter((fact) => fact.family === focus);
}

export function getFamilyShortLabel(focus: FamilyFocus) {
  return focus === "mixed" ? "Mix" : `${focus}`;
}

export function getFocusTheme(focus: FamilyFocus): FocusTheme {
  const familyThemes: Record<Exclude<FamilyFocus, "mixed">, FocusTheme> = {
    1: {
      accent: "#0f766e",
      badge: "#0f766e",
      subtitle: "1 x 1 bis 10 x 1",
      surface: "#d4f7ef",
      title: "1er-Reihe",
    },
    2: {
      accent: "#d97706",
      badge: "#f59e0b",
      subtitle: "1 x 2 bis 10 x 2",
      surface: "#fff0bf",
      title: "2er-Reihe",
    },
    3: {
      accent: "#0284c7",
      badge: "#38bdf8",
      subtitle: "1 x 3 bis 10 x 3",
      surface: "#dff2ff",
      title: "3er-Reihe",
    },
    4: {
      accent: "#dc2626",
      badge: "#fb7185",
      subtitle: "1 x 4 bis 10 x 4",
      surface: "#ffe0dc",
      title: "4er-Reihe",
    },
    5: {
      accent: "#4d7c0f",
      badge: "#84cc16",
      subtitle: "1 x 5 bis 10 x 5",
      surface: "#e6f8db",
      title: "5er-Reihe",
    },
    6: {
      accent: "#ea580c",
      badge: "#fb923c",
      subtitle: "1 x 6 bis 10 x 6",
      surface: "#ffe6cf",
      title: "6er-Reihe",
    },
    7: {
      accent: "#2563eb",
      badge: "#60a5fa",
      subtitle: "1 x 7 bis 10 x 7",
      surface: "#dfeaff",
      title: "7er-Reihe",
    },
    8: {
      accent: "#db2777",
      badge: "#f472b6",
      subtitle: "1 x 8 bis 10 x 8",
      surface: "#ffdff0",
      title: "8er-Reihe",
    },
    9: {
      accent: "#65a30d",
      badge: "#a3e635",
      subtitle: "1 x 9 bis 10 x 9",
      surface: "#f0facf",
      title: "9er-Reihe",
    },
    10: {
      accent: "#b45309",
      badge: "#fbbf24",
      subtitle: "1 x 10 bis 10 x 10",
      surface: "#fff2c8",
      title: "10er-Reihe",
    },
  };

  if (focus === "mixed") {
    return {
      accent: "#059669",
      badge: "#34d399",
      subtitle: "Alles einmal durcheinander",
      surface: "#d8fff0",
      title: "Gemischt",
    };
  }

  return familyThemes[focus];
}
