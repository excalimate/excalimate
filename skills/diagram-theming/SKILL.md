---
name: diagram-theming
description: >
  Apply professional visual themes and color palettes to Excalimate diagrams. Use when
  asked to style diagrams, improve visual appearance, apply brand colors, create dark
  or light themes, ensure color consistency, or make diagrams more visually appealing
  and accessible.
---

# Diagram Theming

Apply consistent, professional visual themes to Excalimate diagrams. Works with `create_scene` and `update_elements` to style shapes, arrows, text, and connectors.

## Theming Workflow

1. **Identify the context** — what is this diagram for? Technical docs, business presentation, casual whiteboard, educational content?
2. **Choose a palette** from [references/color-palettes.md](references/color-palettes.md) or create a custom one with 3–5 colors.
3. **Assign color roles**:
   - **Primary** → main shapes (boxes, key nodes)
   - **Secondary** → supporting shapes (sub-items, containers)
   - **Accent** → highlights, emphasis, important callouts
   - **Neutral** → connectors, arrows, labels, annotations
   - **Emphasis** → warnings, errors, special attention items
4. **Apply consistently** — every element of the same type gets the same styling.
5. **Verify contrast** — ensure text is readable against backgrounds (see [references/accessibility.md](references/accessibility.md)).
6. **Review** — use `get_scene` to inspect, then `update_elements` to fix inconsistencies.

---

## Quick Palette Application

For any diagram, pick one palette and map its colors:

```
Primary   → strokeColor + backgroundColor for main elements
Secondary → strokeColor + backgroundColor for supporting elements
Accent    → strokeColor + backgroundColor for highlights
Neutral   → strokeColor for arrows/connectors, text color
Emphasis  → strokeColor + backgroundColor for callouts/warnings
```

### Example: Corporate Blue palette on a flowchart

```json
[
  {"id":"start","type":"rectangle","x":100,"y":100,"width":200,"height":80,
   "strokeColor":"#1864ab","backgroundColor":"#a5d8ff","fillStyle":"solid",
   "strokeWidth":2,"roughness":1},
  {"id":"process","type":"rectangle","x":100,"y":250,"width":200,"height":80,
   "strokeColor":"#495057","backgroundColor":"#dee2e6","fillStyle":"solid",
   "strokeWidth":2,"roughness":1},
  {"id":"decision","type":"diamond","x":80,"y":400,"width":240,"height":140,
   "strokeColor":"#e67700","backgroundColor":"#fff3bf","fillStyle":"solid",
   "strokeWidth":2,"roughness":1},
  {"id":"arrow1","type":"arrow","x":200,"y":180,"width":0,"height":70,
   "points":[[0,0],[0,70]],"strokeColor":"#495057","strokeWidth":2,
   "roughness":1,"endArrowhead":"arrow"}
]
```

---

## Consistency Rules

These rules ensure a polished, professional look:

| Property        | Rule                                                      |
|-----------------|-----------------------------------------------------------|
| `strokeWidth`   | Same across all shapes (default: 2). Use 4 only for intentional emphasis. |
| `strokeColor`   | All arrows/connectors share one color. Shapes vary by role only. |
| `roughness`     | Same value across the entire diagram. Don't mix 0 and 2. |
| `fontFamily`    | One font per diagram. Mix only when code labels need mono. |
| `fillStyle`     | One fill style per diagram unless mixing is intentional. |
| `strokeStyle`   | `"solid"` by default. `"dashed"` for optional/planned. `"dotted"` for weak links. |
| `backgroundColor` | Shapes of the same role get the same background color. |

### When to break consistency

- **Emphasis**: Use `strokeWidth: 4` or a different `strokeColor` to draw attention to one element.
- **Status encoding**: Different backgrounds for different states (e.g., green=done, yellow=in-progress, red=blocked).
- **Code labels**: Use `fontFamily: 3` (Cascadia) for code/technical text inside otherwise `fontFamily: 5` diagrams.

---

## Default Theme (Recommended)

The safest starting point for any diagram. Clean, professional, readable.

| Property          | Value                  |
|-------------------|------------------------|
| `strokeColor`     | `#1e1e1e`              |
| `backgroundColor` | Varies by role (light) |
| `fillStyle`       | `"solid"`              |
| `strokeWidth`     | `2`                    |
| `strokeStyle`     | `"solid"`              |
| `roughness`       | `1`                    |
| `fontFamily`      | `5` (Assistant)        |
| `opacity`         | `100` (always)         |

**Default background colors by role:**

| Role      | Background  | When to use                  |
|-----------|-------------|------------------------------|
| Primary   | `#a5d8ff`   | Main shapes, key nodes       |
| Secondary | `#dee2e6`   | Supporting, containers       |
| Accent    | `#ffec99`   | Highlights, important items  |
| Neutral   | `transparent` | Arrows, connectors, lines  |
| Emphasis  | `#ffc9c9`   | Warnings, errors, attention  |

---

## Font Guide

| fontFamily | Name      | Feel                  | Best for                         |
|------------|-----------|-----------------------|----------------------------------|
| `5`        | Assistant | Clean, professional   | Business diagrams, documentation, presentations |
| `1`        | Virgil    | Hand-drawn, casual    | Whiteboard sketches, brainstorms, informal notes |
| `3`        | Cascadia  | Monospace, technical  | Code snippets, API names, technical labels |

**Font pairing**: Use `fontFamily: 5` for all text, except switch to `fontFamily: 3` for inline code or technical identifiers. Avoid mixing `1` and `5` in the same diagram.

---

## Text Sizing Hierarchy

| Level      | fontSize | Use                          |
|------------|----------|------------------------------|
| Title      | `36`     | Diagram title, main heading  |
| Heading    | `24`     | Section headers, group labels |
| Body       | `20`     | Default shape labels, descriptions |
| Label      | `16`     | Small labels, annotations on arrows |
| Annotation | `14`     | Fine print, footnotes, metadata |

---

## Applying a Theme to an Existing Diagram

1. Call `get_scene` to retrieve all current elements.
2. Choose a palette from [references/color-palettes.md](references/color-palettes.md).
3. Classify each element by role (primary, secondary, accent, neutral, emphasis).
4. Build an `update_elements` call that sets `strokeColor`, `backgroundColor`, `fillStyle`, `strokeWidth`, `roughness`, and `fontFamily` consistently.
5. Verify text contrast against backgrounds per [references/accessibility.md](references/accessibility.md).

---

## Reference Files

| File | Content |
|------|---------|
| [references/color-palettes.md](references/color-palettes.md) | 10 curated palettes with stroke + background hex pairs |
| [references/styling-rules.md](references/styling-rules.md) | Detailed rules for strokeWidth, roughness, fillStyle, text sizing |
| [references/accessibility.md](references/accessibility.md) | WCAG contrast requirements, colorblind safety, font minimums |
