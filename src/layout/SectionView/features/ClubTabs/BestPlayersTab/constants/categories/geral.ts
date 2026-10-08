import { UnifiedCardConfig } from "../types";

export const geralCards: UnifiedCardConfig[] = [
  {
    id: "avgRating",
    title: "Médias das notas",
    category: "geral",
    tabs: [
      {
        id: "totals",
        label: "Totais",
        key: "avgRating",
        isRating: true,
        format: (v) => (Number(v) > 0 ? Number(v).toFixed(2) : "-"),
        formatParts: (v) => ({
          value: Number(v) > 0 ? Number(v).toFixed(2) : "-",
        }),
      },
    ],
  },
];

