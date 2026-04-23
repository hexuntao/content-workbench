# Content Workbench Design System

## 1. Intent

Content Workbench is a content desk, not a generic SaaS dashboard.

It should feel like:

- editorial
- premium
- calm
- sharp
- high signal density

The UI must support review, drafting, comparison, and operational flow. It should read like a well-edited workspace: paper, rail, docket, note, and ledger layers working together.

## 2. Reference Blend

This project does **not** imitate one brand directly. It combines patterns from several references:

- `styleseed`
  Why: use rule-based design judgment rather than random polish
- `awesome-design-md`
  Why: keep design intent in a persistent document agents can read
- Notion
  Why: warm neutrals, soft restraint, approachable editorial surfaces
- HashiCorp
  Why: precise structure, serious tooling posture, strong section grammar
- Sanity
  Why: content-system framing, mono metadata, sharp content-first hierarchy
- WIRED
  Why: editorial density, typographic confidence, reading-oriented information rhythm

## 3. Product Position

- Primary mode: shallow-light editorial workspace
- Emotional temperature: warm-neutral, quiet, deliberate
- Interaction posture: precise, not playful
- Visual density: compact but breathable
- Brand posture: content operations, not growth dashboard, not CMS template

## 4. Core Rules

1. One accent color in the shell.
   Everything else should come from ink, paper, tray, rule, and semantic states.

2. Surface hierarchy matters more than border count.
   Distinguish canvas, rail, panel, inset, and note layers before adding more outlines.

3. Do not repeat the same section treatment endlessly.
   Alternate between open ledgers, contained panels, split stages, and inset notes.

4. Most information should live in rows, ruled stacks, and split layouts.
   Cards are reserved for emphasis, state, or grouped context.

5. Typography establishes hierarchy first.
   Size, weight, line height, and measure should do more work than color.

6. Metadata should feel operational.
   Use monospace or narrow UI styling for indices, route numbers, owners, and shell status.

7. Calm means restrained, not empty.
   Dense screens are allowed, but every group must have a clear lead, support, and edge.

## 5. Forbidden Patterns

- No purple as the shell accent
- No pure white page canvas
- No default gray-border card stacks
- No identical radius on every container
- No heavy drop shadows that visually detach every block from the page
- No landing-page hero aesthetic inside the working shell
- No generic “AI SaaS” glow gradients
- No three repeated marketing cards as filler
- No feature-specific styling baked into shared primitives

## 6. Color System

### Semantic roles

- `canvas`: warm paper desk background
- `surface-base`: broad page layer
- `surface-panel`: primary working panel
- `surface-raised`: featured panel or opening statement
- `surface-muted`: side note / contextual support
- `surface-inset`: recessed tray, note well, or dense local grouping
- `ink`: primary reading color
- `ink-soft`: headings support and dense body copy
- `ink-muted`: metadata and secondary explanations
- `accent`: one controlled signal color for direction and active emphasis

### Current palette direction

- warm paper canvas
- charcoal ink
- muted blue-green accent
- warm brown rules

The accent should feel disciplined and editorial, not “brand splash”.

## 7. Typography

### Roles

- Display: assertive sans, tight tracking, high confidence
- UI body: neutral sans with strong legibility
- Mono: operational metadata, route indices, status labels

### Principles

- Large headings should be compact and balanced
- Long text should respect reading measure
- Mono should appear in small doses for structure, not dominate the UI
- Avoid giant hero typography that turns the shell into a marketing page

## 8. Spacing & Rhythm

Use the spacing scale consistently:

- `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

Rules:

- Group-internal spacing must be smaller than section spacing
- Header rhythm must feel deliberate, not inflated
- Dense lists should use rules and row spacing, not padding-heavy cards
- Major section changes should be obvious through spacing and layer change

## 9. Layout Grammar

### Shell

- Left side is a rail, not a glossy sidebar
- Main area should read like a workspace sheet attached to the rail
- Route header is a docket: title, context, compact status, then content

### Pages

- Prefer split stages: main statement + contextual note
- Prefer ledgers: bordered row stacks for navigation and indexes
- Prefer inset notes for operational explanation
- Use wide open space only when it improves scan order

### Homepage

- It is an editorial desk introduction, not a SaaS landing page
- It should explain the shell contract and expose shared routes
- Do not duplicate the same route list twice

## 10. Primitive Guidance

### Navigation

- Active state should read as an insertion into the rail, not a button press
- Use left bars, inset tone shifts, or restrained accent fields

### Buttons

- Primary button: compact, calm, intentional
- Secondary button: paper-like, lightly ruled
- Avoid pill overload across the whole interface

### Panels

- `panel`: contained working surface
- `note`: lighter contextual support
- `ledger`: row-based stack with rules
- `stage`: split statement area for page openings

### States

- Empty, loading, and error states must feel like part of the same publication system
- Skeletons should match layout structure
- Error styling should remain calm and instructive, not loud

## 11. Motion

- Motion should confirm structure, not decorate it
- Use short transforms and opacity changes only
- Hover should feel like a subtle editorial nudge
- Reduced motion must be supported

## 12. Agent Implementation Notes

When editing shared UI:

1. Start from the design rules, not local visual improvisation
2. Prefer tokenized semantic variables over literal values
3. Ask whether a block should be a panel, note, ledger, or stage before styling it
4. Remove repetition before adding decoration
5. If a page starts to look like a generic admin template, the design is wrong

