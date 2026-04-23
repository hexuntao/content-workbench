export type EditorialPrinciple = {
  title: string;
  description: string;
};

export type DesignTokenGroup = {
  name: string;
  description: string;
  tokens: readonly string[];
};

export const editorialPrinciples: EditorialPrinciple[] = [
  {
    title: "Calm Control",
    description:
      "Information should feel edited, not decorated. Strong typography and restrained contrast keep dense content readable without turning the shell into a gallery.",
  },
  {
    title: "Desk-Like Surfaces",
    description:
      "Surfaces should feel like paper, tray, rail, and annotation layers. Generic SaaS cards flatten hierarchy and make every region compete for the same attention.",
  },
  {
    title: "Reusable Rhythm",
    description:
      "Route shells, navigation, empty states, and loading states share one cadence so later feature threads can add information without inventing a second visual system.",
  },
];

export const designTokenGroups: DesignTokenGroup[] = [
  {
    name: "Color Tokens",
    description:
      "Warm canvas, disciplined ink, and one restrained accent define the emotional temperature of the workbench.",
    tokens: ["--color-canvas", "--color-surface-raised", "--color-ink", "--color-accent"],
  },
  {
    name: "Surface Tokens",
    description:
      "Distinct paper, tray, and inset layers create hierarchy without relying on heavy borders or identical cards.",
    tokens: [
      "--color-surface-base",
      "--color-surface-panel",
      "--color-surface-inset",
      "--rule-default",
    ],
  },
  {
    name: "Rhythm Tokens",
    description:
      "A single spacing scale aligns shell density, page breathing room, and grouping cadence across all shared routes.",
    tokens: ["--space-2", "--space-4", "--space-6", "--space-8"],
  },
  {
    name: "Radius & Depth",
    description:
      "Major panels, trays, rails, and utility elements use different radii and shadow levels so the shell does not collapse into one generic surface treatment.",
    tokens: ["--radius-sm", "--radius-lg", "--shadow-1", "--shadow-3"],
  },
  {
    name: "Type & Width",
    description:
      "Display, UI, mono, reading width, and shell width tokens establish the workbench voice and structural limits.",
    tokens: ["--font-display", "--font-ui", "--measure-reading", "--container-shell"],
  },
];
