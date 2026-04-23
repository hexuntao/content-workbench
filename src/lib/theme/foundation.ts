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
    title: "Calm Hierarchy",
    description:
      "Use strong typography, restrained contrast, and deliberate spacing so dense information still feels legible.",
  },
  {
    title: "Editorial Surfaces",
    description:
      "Panels should read like desk materials: paper, tray, and annotation layers instead of generic app cards.",
  },
  {
    title: "Reusable Rhythm",
    description:
      "Route shells, nav, empty states, and loading states share the same structural cadence so feature threads only add content.",
  },
];

export const designTokenGroups: DesignTokenGroup[] = [
  {
    name: "Color Tokens",
    description: "Canvas, ink, accent, rule, and surface layers for a warm editorial workspace.",
    tokens: ["--color-canvas", "--color-panel", "--color-ink", "--color-accent"],
  },
  {
    name: "Space Tokens",
    description:
      "A single spacing scale keeps shell rhythm, content density, and page breathing room aligned.",
    tokens: ["--space-2", "--space-4", "--space-6", "--space-8"],
  },
  {
    name: "Radius & Depth",
    description:
      "Different radii and shadow levels separate hero, rail, panel, and utility layers.",
    tokens: ["--radius-sm", "--radius-lg", "--shadow-soft", "--shadow-panel"],
  },
  {
    name: "Type & Width",
    description:
      "Display, UI, mono, and container tokens define the reading voice of the workbench.",
    tokens: ["--font-display", "--font-ui", "--container-page", "--container-shell"],
  },
];
