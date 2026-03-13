# Accessibility

Guidelines for making Excalimate diagrams accessible to all users, including those with visual impairments, color vision deficiencies, and low vision.

---

## WCAG Color Contrast

The Web Content Accessibility Guidelines (WCAG) define minimum contrast ratios between foreground and background colors.

### Minimum Ratios

| Content type       | WCAG AA | WCAG AAA | Applies to                        |
|--------------------|---------|----------|-----------------------------------|
| Normal text (≤18px)| 4.5:1   | 7:1      | Labels, annotations, body text    |
| Large text (>18px bold or >24px) | 3:1 | 4.5:1 | Titles, headings          |
| Non-text (icons, borders) | 3:1 | —    | Shape strokes, arrows, connectors |

### How to Apply

- **Stroke on background**: The stroke color of text or shapes must contrast sufficiently against the shape's background color.
- **Text on shapes**: When text is bound inside a shape, the text `strokeColor` must contrast against the shape's `backgroundColor`.
- **Stroke on canvas**: Shape borders must contrast against the canvas background (white `#ffffff` by default).

### Pre-tested High Contrast Pairs

These stroke + background combinations all meet WCAG AA (4.5:1+):

| Stroke    | Background  | Ratio | Description           |
|-----------|-------------|-------|-----------------------|
| `#1e1e1e` | `#ffffff`   | 16:1  | Black on white        |
| `#1e1e1e` | `#f1f3f5`   | 14.5:1| Black on light gray   |
| `#1e1e1e` | `#dee2e6`   | 12.2:1| Black on gray         |
| `#1864ab` | `#d0ebff`   | 5.2:1 | Dark blue on light blue |
| `#1864ab` | `#ffffff`   | 6.8:1 | Dark blue on white    |
| `#495057` | `#f1f3f5`   | 7.1:1 | Dark gray on light gray |
| `#495057` | `#ffffff`   | 8.6:1 | Dark gray on white    |
| `#e67700` | `#fff9db`   | 4.6:1 | Dark orange on pale yellow |
| `#c92a2a` | `#fff5f5`   | 5.9:1 | Dark red on pale red  |
| `#2b8a3e` | `#ebfbee`   | 4.8:1 | Dark green on pale green |
| `#862e9c` | `#f3d9fa`   | 5.8:1 | Dark purple on pale purple |
| `#343a40` | `#ffffff`   | 12.6:1| Charcoal on white     |

### Pairs to Avoid (Insufficient Contrast)

| Stroke    | Background  | Ratio | Problem               |
|-----------|-------------|-------|-----------------------|
| `#74c0fc` | `#d0ebff`   | 1.6:1 | Light blue on light blue |
| `#ffc078` | `#fff3bf`   | 1.3:1 | Light orange on pale yellow |
| `#b197fc` | `#e5dbff`   | 1.5:1 | Light purple on pale purple |
| `#868e96` | `#dee2e6`   | 2.1:1 | Medium gray on light gray |

---

## Color Vision Deficiency (Colorblind Safety)

Approximately 8% of males and 0.5% of females have some form of color vision deficiency.

### Core Principle

**Never rely on color alone to convey meaning.** Always combine color with at least one additional visual cue:

- **Shape**: Use different shapes (rectangle vs ellipse vs diamond) for different categories.
- **Label**: Add text labels that explicitly state the meaning ("Error", "Success", "Pending").
- **Pattern**: Use different `fillStyle` values (`"solid"` vs `"hachure"` vs `"cross-hatch"`).
- **Stroke style**: Use `"solid"` vs `"dashed"` vs `"dotted"` to differentiate.
- **Icons/Symbols**: Add text symbols (✓, ✗, ⚠, →) inside shapes.

### Problematic Color Combinations

These pairs are indistinguishable for the most common types of color blindness:

| Pair              | Affected type              | Alternative                        |
|-------------------|----------------------------|------------------------------------|
| Red + Green       | Deuteranopia, Protanopia   | Use blue + orange instead          |
| Red + Brown       | Deuteranopia               | Use blue + yellow instead          |
| Green + Brown     | Deuteranopia, Protanopia   | Use blue + purple instead          |
| Blue + Purple     | Tritanopia                 | Use blue + orange instead          |
| Light green + Yellow | Deuteranopia            | Use blue + yellow instead          |

### Colorblind-Safe Palette

This palette uses colors that remain distinguishable across all common color vision deficiencies:

| Role      | Stroke    | Background  | Safe for              |
|-----------|-----------|-------------|-----------------------|
| Primary   | `#1864ab` | `#d0ebff`   | All CVD types         |
| Secondary | `#495057` | `#f1f3f5`   | All CVD types         |
| Accent    | `#e67700` | `#fff3bf`   | All CVD types         |
| Neutral   | `#343a40` | `transparent` | All CVD types       |
| Emphasis  | `#862e9c` | `#f3d9fa`   | All CVD types         |

> This palette avoids red-green pairs entirely and differentiates by hue families that remain distinct under deuteranopia, protanopia, and tritanopia.

---

## Font Size Minimums

Small text reduces readability for users with low vision and on lower-resolution displays.

| Context                  | Minimum fontSize | Recommended  |
|--------------------------|------------------|--------------|
| Body text in shapes      | `16`             | `20`         |
| Arrow/connector labels   | `14`             | `16`         |
| Titles                   | `24`             | `36`         |
| Annotations/footnotes    | `14`             | `14`         |

### Rules

- Never use `fontSize` below `14` — it becomes unreadable at standard zoom.
- Prefer `fontSize: 20` for shape labels — it's the sweet spot for readability and fit.
- Test at 100% zoom: if you squint to read it, the text is too small.

---

## Shape Differentiation

Use shape types to encode categories alongside color:

| Meaning        | Shape       | Example                  |
|----------------|-------------|--------------------------|
| Process/Action | `rectangle` | "Process Data"           |
| Decision       | `diamond`   | "Is Valid?"              |
| Start/End      | `ellipse`   | "Start", "End"           |
| Data/Storage   | `rectangle` with `strokeStyle: "dashed"` | "Database" |
| External       | `rectangle` with `roughness: 0` | "External API" |

This way, even without color, users can identify element types by shape alone.

---

## Accessibility Checklist

Before finalizing a themed diagram, verify:

- [ ] **Contrast**: All text meets 4.5:1 against its background.
- [ ] **Stroke visibility**: Shape borders meet 3:1 against the canvas.
- [ ] **No color-only encoding**: Every color distinction has a shape, label, or pattern backup.
- [ ] **Font size**: No text smaller than 14px.
- [ ] **Labels present**: Important elements have explicit text labels (don't rely on color = meaning).
- [ ] **Consistent shapes**: Same category = same shape type across the diagram.
- [ ] **Tested**: Review with a colorblind simulation tool if possible.

---

## Quick Fix Guide

| Problem                          | Solution                                           |
|----------------------------------|----------------------------------------------------|
| Text unreadable on background    | Darken stroke or lighten background; check contrast ratio |
| Red/green used for pass/fail     | Switch to blue/orange, or add ✓/✗ symbols          |
| Tiny labels on arrows            | Increase to `fontSize: 16` minimum                 |
| All shapes same shape+size       | Vary shape types (rectangle, ellipse, diamond) by category |
| Color is the only differentiator | Add labels, patterns (`fillStyle`), or stroke styles |
