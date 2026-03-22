# Excalimate Landing Page — Frontend Design Guide

> **Aesthetic Ratio:** 80% LottieFiles (polished, modern SaaS) · 20% Excalidraw (hand-drawn, organic accents)
> **Framework:** Astro.js (static site, `landing-page/` directory)
> **Design Principle:** "Precision with personality" — a sleek, conversion-oriented SaaS page that feels alive through subtle hand-drawn touches

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Layout & Grid](#4-layout--grid)
5. [Page Sections & Structure](#5-page-sections--structure)
6. [Component Specifications](#6-component-specifications)
7. [Motion & Animation](#7-motion--animation)
8. [Hand-Drawn Accents (20% Excalidraw)](#8-hand-drawn-accents-20-excalidraw)
9. [Responsive Breakpoints](#9-responsive-breakpoints)
10. [Asset Requirements](#10-asset-requirements)
11. [Technical Architecture](#11-technical-architecture)
12. [Accessibility](#12-accessibility)

---

## 1. Design Philosophy

### Core Concept: "Sketches Come Alive"

The landing page communicates one idea: **Excalimate transforms static hand-drawn diagrams into living, breathing animations.** The design itself should embody this transformation — starting with the raw, organic feel of Excalidraw and evolving into the polished, motion-rich world of LottieFiles.

### Design DNA

| Source | Influence | Application |
|--------|-----------|-------------|
| **LottieFiles (80%)** | Clean layout, dark hero, social proof strips, feature cards with live previews, stats blocks, gradient CTAs, professional footer | Overall structure, spacing, navigation, section rhythm, conversion patterns |
| **Excalidraw Plus (20%)** | Hand-drawn SVG decorations, sketch-style annotations, "browser bar" frames, organic arrows, rough border accents | Dividers, hover states, decorative elements, section transitions, annotation callouts |

### Design Maxims

- **Dark hero, light body** — Hero section uses deep navy/charcoal. Feature sections alternate light/dark.
- **Generous whitespace** — LottieFiles-level breathing room. Minimum 120px between major sections.
- **Animation as content** — Every section should feature a live animation or animated illustration, not static screenshots.
- **Hand-drawn = intentional accents** — Never random. Used for dividers, annotation arrows, underline decorations, and hover states.

---

## 2. Color System

### Primary Palette

```css
:root {
  /* Core Brand */
  --brand-indigo:       #6366f1;    /* Primary accent — from Excalimate app */
  --brand-indigo-hover: #4f46e5;    /* Hover state */
  --brand-indigo-light: #818cf8;    /* Light variant for gradients */
  --brand-yellow:       #FFC300;    /* From Excalimate logo — "hand-drawn energy" accent */
  --brand-yellow-soft:  #FFD94A;    /* Softer yellow for backgrounds */

  /* Hero / Dark Sections */
  --dark-bg:            #0a0a1a;    /* Deep space navy — hero background */
  --dark-bg-alt:        #111127;    /* Card backgrounds in dark sections */
  --dark-surface:       #1a1a35;    /* Elevated surfaces in dark mode */
  --dark-border:        #2a2a4a;    /* Subtle borders in dark sections */
  --dark-text:          #f0f0ff;    /* Primary text on dark */
  --dark-text-muted:    #8888aa;    /* Secondary text on dark */

  /* Light Sections */
  --light-bg:           #fafbff;    /* Off-white with cool tint */
  --light-bg-alt:       #f0f2ff;    /* Slightly deeper for alternating sections */
  --light-surface:      #ffffff;    /* Card backgrounds */
  --light-border:       #e2e4f0;    /* Borders on light */
  --light-text:         #1e1e3a;    /* Primary text on light */
  --light-text-muted:   #6b6b8a;    /* Secondary text on light */

  /* Functional */
  --success:            #22c55e;
  --danger:             #ef4444;

  /* Gradients */
  --gradient-hero:      linear-gradient(135deg, #0a0a1a 0%, #111140 50%, #1a0a2e 100%);
  --gradient-cta:       linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a78bfa 100%);
  --gradient-glow:      radial-gradient(ellipse at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  --gradient-yellow-glow: radial-gradient(ellipse at center, rgba(255, 195, 0, 0.08) 0%, transparent 70%);
}
```

### Color Usage Rules

1. **Hero section:** `--gradient-hero` background with `--gradient-glow` orbs floating behind content
2. **CTA buttons:** `--gradient-cta` with `--brand-yellow` hover spark effect
3. **Feature sections:** Alternate between `--light-bg` and `--dark-bg` (LottieFiles pattern)
4. **Hand-drawn accents:** Always use `--brand-yellow` or `--brand-indigo` at 60-80% opacity
5. **Text hierarchy:** Never use pure black (`#000`). Use `--light-text` or `--dark-text`

---

## 3. Typography

### Font Stack

```css
:root {
  /* Display — Used for hero headline and section titles */
  --font-display: 'Satoshi', 'General Sans', sans-serif;

  /* Body — Used for paragraphs, descriptions, UI text */
  --font-body: 'Inter', 'system-ui', sans-serif;

  /* Hand-drawn accent font — sparingly, for annotation-style callouts */
  --font-sketch: 'Virgil', 'Comic Neue', cursive;
}
```

> **Satoshi** — A modern geometric sans-serif with distinctive character. Bold weights for headlines create the LottieFiles-level presence. Available from Fontshare (free).
>
> **Inter** — For body text. Despite being common, its optical sizing and variable font features make it the pragmatic choice for readable body copy. Use weight 400/500 only.
>
> **Virgil** — Excalidraw's own hand-drawn font. Use ONLY for decorative annotations and sketch-style callouts (the 20% Excalidraw accent).

### Type Scale

| Element | Font | Size | Weight | Line Height | Letter Spacing | Color |
|---------|------|------|--------|-------------|----------------|-------|
| Hero Headline | Satoshi | 72px / 4.5rem | 900 (Black) | 1.05 | -0.03em | `--dark-text` |
| Hero Subheadline | Inter | 20px / 1.25rem | 400 | 1.6 | 0 | `--dark-text-muted` |
| Section Title | Satoshi | 48px / 3rem | 800 (ExtraBold) | 1.15 | -0.02em | contextual |
| Section Subtitle | Inter | 18px / 1.125rem | 400 | 1.65 | 0 | muted variant |
| Feature Heading | Satoshi | 24px / 1.5rem | 700 | 1.3 | -0.01em | contextual |
| Body Text | Inter | 16px / 1rem | 400 | 1.7 | 0 | contextual |
| Small / Caption | Inter | 14px / 0.875rem | 500 | 1.5 | 0.01em | muted variant |
| Stat Number | Satoshi | 56px / 3.5rem | 900 | 1.0 | -0.02em | `--brand-indigo` |
| Sketch Annotation | Virgil | 16px / 1rem | 400 | 1.4 | 0 | `--brand-yellow` |

### Type Rules

1. **Hero headline max-width:** 800px. Centered on large screens.
2. **Section titles:** Left-aligned on feature sections with asymmetric layouts.
3. **No all-caps** except for tiny labels/badges (e.g., "NEW", "OPEN SOURCE").
4. **Virgil font** appears only in hand-drawn annotation callouts — never in headings or buttons.

---

## 4. Layout & Grid

### Grid System

```css
.container {
  max-width: 1280px;       /* Main content container */
  padding-inline: 24px;    /* Mobile padding */
  margin-inline: auto;
}

@media (min-width: 768px) {
  .container { padding-inline: 40px; }
}

@media (min-width: 1024px) {
  .container { padding-inline: 64px; }
}
```

### Section Spacing

| Between | Spacing |
|---------|---------|
| Hero → First section | 120px |
| Major sections | 120px–160px |
| Section title → content | 48px–64px |
| Cards (horizontal gap) | 24px |
| Cards (vertical gap) | 32px |

### Layout Patterns (from LottieFiles)

1. **Hero:** Full-width dark, content centered, floating animation below
2. **Social proof strip:** Full-width, horizontally scrolling logos
3. **Feature grid:** 2–3 columns on desktop, single column mobile
4. **Split sections:** 50/50 text + demo (alternating sides)
5. **Stats row:** 3–4 stat blocks in horizontal line
6. **Testimonial carousel:** Horizontal scroll cards with avatar + quote
7. **CTA section:** Full-width gradient with centered text + button
8. **Footer:** 4-column link grid + social + copyright

---

## 5. Page Sections & Structure

### Complete Section Order

```
┌─────────────────────────────────────────────┐
│  NAVIGATION BAR (sticky, glass morphism)     │
├─────────────────────────────────────────────┤
│                                              │
│  1. HERO                                     │
│     "Turn hand-drawn diagrams into           │
│      keyframe animations"                    │
│     [CTA: Try Excalimate] [CTA: GitHub]      │
│     → Animated demo embed below              │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  2. SOCIAL PROOF / TRUST STRIP               │
│     "Built with love, powered by open source"│
│     → GitHub stars count, npm downloads,      │
│       "Used by X creators" logos (scrolling)  │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  3. KEY VALUE PROPS (3-card grid)             │
│     Card 1: "Full Excalidraw Editor"          │
│     Card 2: "Keyframe Animation Timeline"     │
│     Card 3: "Export Anywhere"                 │
│     → Each card has animated illustration     │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  4. FEATURE DEEP DIVE — SPLIT SECTIONS       │
│                                              │
│  4a. "Draw → Animate → Export"               │
│      Left: text + features list               │
│      Right: animated workflow demo            │
│      [hand-drawn arrow pointing to demo]     │
│                                              │
│  4b. "Timeline That Makes Sense"             │
│      Left: timeline interface preview         │
│      Right: text + bullet features            │
│      [sketchy underline on heading]          │
│                                              │
│  4c. "Camera Animations"                     │
│      Left: text                               │
│      Right: camera pan/zoom demo              │
│      [hand-drawn circle annotation]          │
│                                              │
│  4d. "AI-Powered with MCP"                   │
│      Left: code snippet / terminal demo       │
│      Right: text explaining MCP server        │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  5. STATS / IMPACT ROW                        │
│     "23 MCP tools" | "7 export formats"       │
│     | "E2E encrypted" | "16 AI skills"        │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  6. EXPORT FORMATS SHOWCASE                   │
│     Visual grid: MP4, WebM, GIF, SVG,        │
│     dotLottie — with file size comparisons    │
│     [hand-drawn "tiny!" annotation on sizes] │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  7. HOW IT WORKS — 3 STEP FLOW               │
│     Step 1: "Draw your diagram"               │
│     Step 2: "Set keyframes"                   │
│     Step 3: "Export & share"                  │
│     → Connected by hand-drawn arrows          │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  8. OPEN SOURCE + COMMUNITY                   │
│     GitHub stats, contributor avatars,         │
│     "Star us on GitHub" CTA                   │
│     [hand-drawn star doodle]                 │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  9. FINAL CTA                                 │
│     "Start animating your diagrams"           │
│     [Gradient CTA button]                     │
│     → Subtle floating animation background    │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  10. FOOTER                                   │
│      Logo, links grid (Product, Resources,    │
│      Community, Legal), social icons,         │
│      copyright                                │
│                                              │
└─────────────────────────────────────────────┘
```

### Section Detailed Specifications

#### 1. Hero Section

- **Background:** `--gradient-hero` with two floating radial glow orbs (indigo + faint yellow)
- **Layout:** Centered text, max-width 800px headline
- **Headline:** "Turn hand-drawn diagrams into keyframe animations"
  - The words "hand-drawn" have a subtle hand-drawn underline SVG in `--brand-yellow`
- **Subheadline:** "Create, animate, and export Excalidraw designs as MP4, WebM, GIF, and animated SVG. Powered by AI through 23 MCP tools."
- **CTAs:**
  - Primary: "Try Excalimate" → gradient button with glow
  - Secondary: "View on GitHub" → ghost button with GitHub icon + star count badge
- **Demo:** Below CTAs, a floating browser-frame mockup showing the Excalimate app with an animation playing. Frame has subtle `box-shadow` and slight rotation (`transform: perspective(1000px) rotateX(2deg)`).
- **Decorative:** A small hand-drawn arrow (Virgil style) pointing from "animations" in the headline to the demo, with annotation text "it's this easy →"

#### 2. Social Proof Strip

- **Background:** `--dark-bg-alt` (slightly lighter than hero, creates depth)
- **Content:** Horizontally auto-scrolling logo strip (like LottieFiles' trusted companies)
- **Label above:** "Used by creators and teams worldwide" (Inter, small, muted)
- **Logos:** Monochrome white, 50% opacity, hover → 100%
- **Animation:** CSS `@keyframes` infinite scroll, pauses on hover

#### 3. Key Value Props Grid

- **Background:** `--light-bg`
- **Section title:** "Everything you need to animate diagrams"
- **Grid:** 3 equal columns (desktop), stack on mobile
- **Cards:**
  - Rounded corners (16px)
  - Light border (`--light-border`)
  - Subtle shadow on hover
  - Top portion: Animated illustration (looping)
  - Title in Satoshi 700
  - Description in Inter 400
  - Hover: card lifts slightly (`translateY(-4px)`) + shadow deepens

| Card | Title | Description | Visual |
|------|-------|-------------|--------|
| 1 | Full Excalidraw Editor | Draw, edit, connect — the complete whiteboard experience built right in. | Animated pen drawing a diagram |
| 2 | Keyframe Animation | Opacity, position, scale, rotation, and draw progress keyframes on a visual timeline. | Animated timeline with keyframes appearing |
| 3 | Export Anywhere | MP4, WebM, GIF, animated SVG, and dotLottie. E2E encrypted sharing included. | Animated export format icons cycling |

#### 4. Feature Deep Dives (Split Sections)

Pattern borrowed from LottieFiles' alternating left/right feature showcases.

**Layout:**
- Alternating 50/50 splits
- Content side: Title + 3-4 bullet features with small icons
- Demo side: Live animation or embedded preview within a browser-frame mockup (Excalidraw-style frame with hand-drawn border effect — this is where the 20% accent lives)

**Specific Sections:**

**4a. "Draw → Animate → Export" (dark bg)**
- Text left, demo right
- Three-step micro animation showing the workflow
- Hand-drawn arrow connecting the three steps in the text

**4b. "A Timeline That Makes Sense" (light bg)**
- Demo left (timeline interface screenshot/animation), text right
- Highlight: "Collapsible per-element tracks with interpolation curves"
- Sketchy yellow underline on "Makes Sense"

**4c. "Camera Animations" (dark bg)**
- Text left, demo right showing a camera pan/zoom
- Stat callout: "Pan, zoom, and rotate with aspect-ratio lock"
- Hand-drawn circle around the camera frame in the demo

**4d. "AI-Powered Creation" (light bg)**
- Code block left showing MCP tool usage
- Text right: "23 MCP tools for AI-driven animation. Let Claude, GPT, or any AI build your animations."
- Badge: "Live mode — watch AI changes in real-time via SSE"

#### 5. Stats Row

- **Background:** Dark gradient strip
- **Layout:** 4 stat blocks, horizontal row
- **Each stat:**
  - Large number (Satoshi 900, 56px) in `--brand-indigo-light`
  - Label below (Inter 500, 14px) in `--dark-text-muted`
  - Subtle divider lines between stats (1px, low opacity)
- **Stats:**
  - "23" — MCP Tools
  - "7" — Export Formats
  - "E2E" — Encrypted Sharing
  - "16" — AI Skills

#### 6. Export Formats Showcase

- **Background:** `--light-bg-alt`
- **Title:** "Export in any format you need"
- **Visual:** Grid of format cards with:
  - Format icon (animated)
  - Format name
  - File type badge
  - Comparative size (e.g., "Up to 90% smaller than GIF")
- **Hand-drawn accent:** A Virgil-font annotation saying "tiny!" with an arrow pointing to the size comparison

#### 7. How It Works

- **Background:** `--light-bg`
- **Title:** "Three steps to animated diagrams"
- **Layout:** Horizontal 3-step flow (vertical on mobile)
- **Steps connected by hand-drawn arrows** (SVG, Excalidraw style)
- Each step:
  - Circle with step number (hand-drawn circle border)
  - Icon
  - Title
  - One-line description
  - Below: small animated preview

#### 8. Open Source + Community

- **Background:** `--dark-bg`
- **Title:** "Open source, community driven"
- **Content:**
  - GitHub stars count (live badge or static with large number)
  - Contributor avatar row (circular, overlapping)
  - "Star us on GitHub" CTA button (ghost style)
  - MIT License badge
- **Hand-drawn accent:** A doodled star next to the GitHub stars count

#### 9. Final CTA

- **Background:** `--gradient-cta` (full-width gradient)
- **Floating background:** Subtle animated shapes (low opacity geometric forms drifting)
- **Centered layout:**
  - Headline: "Start animating your diagrams" (Satoshi 900, white)
  - Subtext: "Free, open source, no account needed."
  - Button: "Launch Excalimate" (white bg, indigo text, large, with hover glow)
  - Secondary: "View Documentation" (ghost button, white border)

#### 10. Footer

- **Background:** `--dark-bg`
- **Layout:** 4-column link grid
- **Columns:**
  - **Product:** Features, Export Formats, MCP Server, Pricing (if any)
  - **Resources:** Documentation, GitHub, Changelog, Skills
  - **Community:** Discord (if exists), GitHub Discussions, Contributing
  - **Legal:** License (MIT), Privacy Policy, Security
- **Bottom row:** Excalimate logo (dark variant) + social icons + "© 2026 Excalimate" + "Made with ❤️ and Excalidraw"
- **Social icons:** GitHub only (or add others as they exist)

---

## 6. Component Specifications

### Navigation Bar

```
┌─────────────────────────────────────────────┐
│ [Logo]   Features  Docs  GitHub    [Try it] │
└─────────────────────────────────────────────┘
```

- **Position:** `sticky`, top 0, z-index 50
- **Background:** Transparent initially → `backdrop-filter: blur(16px)` + `rgba(10, 10, 26, 0.8)` on scroll
- **Height:** 64px
- **Logo:** `excalimate_logo_dark.svg` (white text variant)
- **Links:** Inter 500, 14px, `--dark-text-muted` → `--dark-text` on hover
- **CTA:** Small gradient button "Try Excalimate"
- **Mobile:** Hamburger menu → full-screen overlay with slide-in animation

### Buttons

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| Primary | `--gradient-cta` | White | none | Glow shadow `0 0 30px rgba(99,102,241,0.4)` |
| Secondary / Ghost | Transparent | `--brand-indigo` | 1px `--brand-indigo` | Fill `rgba(99,102,241,0.1)` |
| Dark Ghost | Transparent | `--dark-text` | 1px `--dark-border` | Fill `rgba(255,255,255,0.05)` |

- **Border radius:** 12px
- **Padding:** 12px 28px (default), 16px 36px (large)
- **Font:** Inter 600, 15px
- **Transition:** all 0.2s ease

### Feature Cards

- **Border radius:** 16px
- **Background:** `--light-surface` or `--dark-surface`
- **Border:** 1px solid `--light-border` or `--dark-border`
- **Shadow (rest):** `0 1px 3px rgba(0,0,0,0.04)`
- **Shadow (hover):** `0 12px 24px rgba(0,0,0,0.08)`
- **Padding:** 32px
- **Hover transform:** `translateY(-4px)`, transition 0.3s ease

### Browser Frame Mockup

Used for embedding demos/screenshots in the Excalidraw style:

```
┌──────────────────────────────────────┐
│ ● ● ●                    excalimate.com │
├──────────────────────────────────────┤
│                                        │
│        [Demo content here]             │
│                                        │
└──────────────────────────────────────┘
```

- **Border radius:** 12px
- **Border:** 1px solid `--dark-border` (or subtle hand-drawn border SVG for Excalidraw feel)
- **Top bar:** 40px height, darker background, three dots + URL text
- **Shadow:** `0 25px 50px rgba(0,0,0,0.15)`
- **Optional:** Slight perspective tilt for depth: `transform: perspective(1200px) rotateX(2deg)`

### Stat Block

```
  23
  MCP Tools
```

- **Number:** Satoshi 900, 56px, `--brand-indigo-light`
- **Label:** Inter 500, 14px, muted text
- **Alignment:** Center
- **Spacing:** 8px gap between number and label

---

## 7. Motion & Animation

### Animation Principles

1. **Entrance animations:** Staggered fade-up on scroll (IntersectionObserver)
2. **Micro-interactions:** Button hover glows, card lifts, link underline slides
3. **Continuous animations:** Logo scroll strip, floating background orbs, demo previews
4. **Performance:** All CSS animations where possible. Use `will-change` sparingly. Prefer `transform` and `opacity` for GPU acceleration.

### Scroll-Triggered Animations

```css
/* Base state — hidden */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

/* When visible */
.animate-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children */
.stagger > .animate-on-scroll:nth-child(1) { transition-delay: 0ms; }
.stagger > .animate-on-scroll:nth-child(2) { transition-delay: 100ms; }
.stagger > .animate-on-scroll:nth-child(3) { transition-delay: 200ms; }
.stagger > .animate-on-scroll:nth-child(4) { transition-delay: 300ms; }
```

### Hero Animations

- **Headline:** Fade up + slight blur clear on page load (0.8s ease-out)
- **Subtitle:** Fade up, 200ms delayed
- **CTAs:** Fade up, 400ms delayed
- **Demo frame:** Slide up from below + perspective correction (600ms delay, 1s duration)
- **Glow orbs:** Slow drift animation (20s infinite, ease-in-out, alternate)

### Interactive Elements

- **Buttons:** Scale 1.02 on hover, glow pulse on primary
- **Cards:** Lift + shadow transition (0.3s ease)
- **Nav links:** Underline slides in from left (0.2s ease)
- **Logo strip:** Infinite horizontal scroll (60s linear)

---

## 8. Hand-Drawn Accents (20% Excalidraw)

This is what makes the Excalimate landing page unique. These elements are used sparingly but deliberately to reference the Excalidraw DNA.

### Where to Apply

| Element | Technique | Color |
|---------|-----------|-------|
| **Headline word underline** | SVG hand-drawn squiggly underline beneath "hand-drawn" in hero | `--brand-yellow` at 80% |
| **Section dividers** | Instead of straight `<hr>`, use a hand-drawn horizontal line SVG | `--light-border` or `--dark-border` at 30% |
| **Step flow arrows** | SVG arrows connecting the 3 steps in "How It Works" — drawn in Excalidraw style | `--brand-indigo` at 60% |
| **Annotation callouts** | Virgil-font labels with small pointing arrows (e.g., "tiny!" on file sizes, "it's this easy →") | `--brand-yellow` |
| **Circle highlights** | Hand-drawn circle around key demo areas | `--brand-yellow` at 50% |
| **Star doodle** | Near GitHub stars count | `--brand-yellow` |
| **Browser frame border** | Optional: alternate browser frame mock with slightly rough/hand-drawn border | `--dark-border` |

### How to Create These

1. **Draw in Excalidraw** — Create each decorative element inside the Excalidraw editor
2. **Export as SVG** — Use the hand-drawn renderer (not the sharp mode)
3. **Clean up & colorize** — Set stroke colors to CSS custom property values
4. **Embed inline** — Use inline SVG in Astro components for easy color theming

### Placement Rules

- **Maximum 1 hand-drawn accent per section** — keep it subtle
- **Never on text blocks** — only on decorative/annotation elements
- **Scale appropriately** — these should feel like a designer's margin notes, not dominant elements
- **Animate subtly** — hand-drawn elements can have a very slow draw-on effect (SVG stroke-dasharray animation)

---

## 9. Responsive Breakpoints

```css
/* Mobile first */
/* Small: 0–639px */
/* Medium: 640px–1023px */
/* Large: 1024px–1279px */
/* XL: 1280px+ */

@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Key Responsive Behaviors

| Element | Mobile (<640px) | Tablet (640–1023px) | Desktop (1024px+) |
|---------|----------------|--------------------|--------------------|
| Nav | Hamburger menu | Hamburger menu | Full horizontal links |
| Hero headline | 36px, left-aligned | 48px, centered | 72px, centered |
| Value prop grid | 1 column, stacked | 2 columns | 3 columns |
| Split features | Stacked (image first) | Stacked (image first) | Side-by-side 50/50 |
| Stats row | 2×2 grid | 4 columns | 4 columns |
| Footer | 1 column accordion | 2 columns | 4 columns |
| How It Works | Vertical steps | Vertical steps | Horizontal steps |
| Hand-drawn accents | Hidden or simplified | Visible | Visible |

---

## 10. Asset Requirements

### SVGs to Create

- [ ] Hand-drawn underline (for hero headline)
- [ ] Hand-drawn arrows (3-4 variants: curved, straight, pointing)
- [ ] Hand-drawn circle highlight
- [ ] Hand-drawn star doodle
- [ ] Hand-drawn horizontal divider line
- [ ] Hand-drawn step number circles (1, 2, 3)
- [ ] Browser frame mockup (with optional sketchy variant)

### Images / Media

- [ ] App screenshot — Excalimate editor with animation playing (high-res, cropped for browser frame)
- [ ] Timeline close-up screenshot
- [ ] Camera animation demo (GIF or embedded video)
- [ ] Export format icons (MP4, WebM, GIF, SVG, dotLottie)
- [ ] MCP/AI terminal demo screenshot or animation
- [ ] Open graph image (1200×630) for social sharing
- [ ] Favicon — reuse `excalimate_mark.svg`

### Fonts to Load

- Satoshi (Variable, 700–900 weights) → from Fontshare CDN or self-hosted
- Inter (Variable, 400–600 weights) → from Google Fonts or self-hosted
- Virgil (Regular) → from Excalidraw's CDN or bundled

---

## 11. Technical Architecture

### Astro Project Structure

```
landing-page/
├── astro.config.ts
├── package.json
├── tsconfig.json
├── public/
│   ├── fonts/
│   │   ├── Satoshi-Variable.woff2
│   │   ├── Virgil.woff2
│   │   └── ... (inter if self-hosted)
│   ├── images/
│   │   ├── og-image.png
│   │   └── ... (screenshots, demos)
│   ├── svg/
│   │   ├── hand-drawn-underline.svg
│   │   ├── hand-drawn-arrow-1.svg
│   │   ├── hand-drawn-circle.svg
│   │   ├── hand-drawn-star.svg
│   │   └── hand-drawn-divider.svg
│   └── favicon.svg (symlink or copy of excalimate_mark.svg)
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro        # HTML shell, <head>, fonts, global CSS
│   ├── pages/
│   │   └── index.astro             # Home page — assembles all sections
│   ├── components/
│   │   ├── Nav.astro               # Sticky navigation
│   │   ├── Hero.astro              # Hero section
│   │   ├── SocialProof.astro       # Logo trust strip
│   │   ├── ValueProps.astro        # 3-card grid
│   │   ├── FeatureSplit.astro      # Reusable split section (text + demo)
│   │   ├── StatsRow.astro          # Stats/numbers section
│   │   ├── ExportShowcase.astro    # Export formats grid
│   │   ├── HowItWorks.astro        # 3-step flow
│   │   ├── OpenSource.astro        # GitHub/community section
│   │   ├── FinalCTA.astro          # Bottom CTA
│   │   ├── Footer.astro            # Site footer
│   │   ├── BrowserFrame.astro      # Reusable browser mockup wrapper
│   │   └── SketchAccent.astro      # Reusable hand-drawn SVG component
│   └── styles/
│       ├── global.css              # CSS variables, resets, base styles
│       ├── typography.css          # Font-face declarations, type scale
│       └── animations.css          # Keyframe animations, scroll triggers
└── README.md
```

### Astro Configuration

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://excalimate.com',
  build: {
    assets: '_assets',
  },
  vite: {
    css: {
      preprocessorOptions: {
        // If using PostCSS or similar
      },
    },
  },
});
```

### Key Technical Decisions

1. **No JS framework** — Pure Astro components (`.astro` files). Zero client-side JS for layout. Only add `<script>` tags for:
   - IntersectionObserver (scroll animations)
   - Mobile menu toggle
   - Optional: GitHub stars API fetch
2. **CSS-only animations** — All motion via CSS. No animation library needed.
3. **Self-hosted fonts** — Load Satoshi and Virgil from `public/fonts/` for performance. Use `font-display: swap`.
4. **Image optimization** — Use Astro's built-in `<Image />` component for automatic optimization.
5. **No Tailwind** — The landing page is simple enough to use vanilla CSS with custom properties. This keeps it independent from the main app's Tailwind config.
6. **Deployment** — Static build. Can be deployed to Cloudflare Pages alongside the main app (separate route/subdomain), or as standalone.

---

## 12. Accessibility

### Requirements

- **Color contrast:** All text meets WCAG 2.1 AA (4.5:1 for body, 3:1 for large text)
- **Focus indicators:** Visible focus rings on all interactive elements (`outline: 2px solid var(--brand-indigo); outline-offset: 2px`)
- **Keyboard navigation:** Full tab order through nav, CTAs, and links
- **Reduced motion:** Respect `prefers-reduced-motion: reduce` — disable all animations, transitions instantly
- **Semantic HTML:** Proper heading hierarchy (single `<h1>` in hero, `<h2>` for sections, `<h3>` for feature titles)
- **Alt text:** All images and SVG illustrations have descriptive alt text
- **Skip link:** Hidden "Skip to content" link at top of page

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Quick Reference: LottieFiles vs Excalidraw Influence Map

| Page Element | LottieFiles (80%) | Excalidraw (20%) |
|---|---|---|
| Navigation | Glass morphism sticky nav | — |
| Hero | Dark gradient, centered text, floating demo | Hand-drawn underline on keyword, annotation arrow |
| Social Proof | Auto-scrolling logo strip | — |
| Value Props | 3-card grid with hover lifts | — |
| Feature Sections | Alternating split layouts | Browser frame has sketchy border option |
| Stats | Number blocks in accent color | — |
| Export Showcase | Format comparison grid | "tiny!" hand-drawn annotation |
| How It Works | 3-step horizontal flow | Hand-drawn arrows connecting steps, sketchy number circles |
| Open Source | GitHub stats + contributor row | Hand-drawn star doodle |
| CTA | Full-width gradient section | — |
| Footer | 4-column link grid | — |
| **Throughout** | Professional spacing, shadows, typography | Virgil font annotations, yellow accents, SVG decorations |
