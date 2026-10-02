import type { ThemeConfig, ThemePresetName } from "./types";

export const themes: Partial<Record<ThemePresetName, ThemeConfig>> = {
  "obsidian-red": {
    name: "obsidian-red" as ThemePresetName,
    label: "Site Theme",
    description: "Selected site theme",
    tokens: {
  "background": "217 29% 9%",
  "foreground": "0 0% 99%",
  "card": "217 29% 14%",
  "card-foreground": "0 0% 99%",
  "primary": "217 91% 60%",
  "primary-foreground": "0 0% 0%",
  "secondary": "217 29% 20%",
  "muted": "217 29% 17%",
  "muted-foreground": "0 0% 99%",
  "border": "217 29% 25%",
  "radius": ".4rem",
  "card-shadow": "none",
  "hero-gradient": "none",
  "background-pattern": "none",
  "font-sans": "\"Source Sans 3\", ui-sans-serif, system-ui, sans-serif",
  "font-heading": "\"Source Sans 3\", ui-sans-serif, system-ui, sans-serif",
  "heading-weight": "600",
  "heading-letter-spacing": "-0.015em"
},
  },
};
