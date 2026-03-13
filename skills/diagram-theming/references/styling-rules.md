# Styling Rules

Detailed rules for applying consistent visual styling to Excalimate diagrams. These rules complement the palette choices in [color-palettes.md](color-palettes.md).

---

## Stroke Width

Controls the thickness of element borders and lines.

| Value | Name        | Use                                          |
|-------|-------------|----------------------------------------------|
| `1`   | Thin        | Decorative lines, subtle dividers, annotations |
| `2`   | Standard    | Default for all shapes and arrows            |
| `4`   | Bold        | Emphasis, titles, highlighted paths          |

### Rules

- **All shapes** in a diagram should share the same `strokeWidth` (default: `2`).
- **All arrows/connectors** should share the same `strokeWidth` as shapes (default: `2`).
- Use `strokeWidth: 4` **only** for intentional emphasis — no more than 1–2 elements per diagram.
- Use `strokeWidth: 1` for decorative elements, background annotations, or subtle dividers.
- Never use values other than 1, 2, or 4.

---

## Roughness

Controls how hand-drawn elements appear.

| Value | Name    | Feel                        | Best for                              |
|-------|---------|-----------------------------|---------------------------------------|
| `0`   | Clean   | Precise, geometric lines    | Technical docs, formal presentations  |
| `1`   | Natural | Slight wobble, organic feel | General-purpose, balanced look        |
| `2`   | Sketchy | Very hand-drawn, loose      | Whiteboard brainstorms, casual notes  |

### Rules

- **Use one roughness value** across the entire diagram. Don't mix `0` and `2`.
- Match roughness to font:
  - `roughness: 0` pairs with `fontFamily: 5` (Assistant) or `fontFamily: 3` (Cascadia).
  - `roughness: 1` pairs with any font.
  - `roughness: 2` pairs with `fontFamily: 1` (Virgil).
- When in doubt, use `roughness: 1` — it works with every palette and context.

---

## Fill Style

Controls how shape backgrounds are rendered.

| Value          | Appearance              | Best for                            |
|----------------|-------------------------|-------------------------------------|
| `"solid"`      | Flat color fill         | Default, clean diagrams, any theme  |
| `"hachure"`    | Diagonal line hatching  | Hand-drawn feel, pairs with roughness 1–2 |
| `"cross-hatch"`| Cross-hatched pattern   | Texture, emphasis, technical drawings |

### Rules

- **Use one fillStyle** per diagram for consistency.
- `"solid"` is the safest default — works with all palettes and roughness levels.
- `"hachure"` adds character but can reduce readability at small sizes. Avoid for elements smaller than 100×60.
- `"cross-hatch"` is best reserved for emphasis or specific encoding (e.g., "this component is deprecated").
- Transparent backgrounds (`backgroundColor: "transparent"`) render the same regardless of fillStyle.

---

## Stroke Style

Controls the line pattern for borders and connectors.

| Value      | Appearance    | Semantic meaning                       |
|------------|---------------|----------------------------------------|
| `"solid"`  | Continuous line | Default, confirmed, active connections |
| `"dashed"` | Dashed line    | Optional, planned, future, conditional |
| `"dotted"` | Dotted line    | Weak connection, suggestion, metadata  |

### Rules

- **Default to `"solid"`** for all elements.
- Use `"dashed"` to encode "this is planned/optional/not-yet-implemented."
- Use `"dotted"` sparingly for weak relationships or annotations.
- When encoding meaning with strokeStyle, add a legend or label so the distinction is clear.
- All shapes in the same category should share the same strokeStyle.

---

## Text Sizing Hierarchy

Consistent text sizing creates visual hierarchy and improves readability.

| Level      | fontSize | Line height (approx) | Use                                  |
|------------|----------|----------------------|--------------------------------------|
| Title      | `36`     | ~44px                | Diagram title, one per diagram       |
| Heading    | `24`     | ~30px                | Section headers, group labels        |
| Body       | `20`     | ~26px                | Default labels inside shapes         |
| Label      | `16`     | ~22px                | Small labels, arrow annotations      |
| Annotation | `14`     | ~20px                | Footnotes, metadata, fine print      |

### Rules

- **Shape labels** should use Body size (`20`) by default.
- **Titles** (`36`) should appear at most once per diagram.
- Don't use more than 3 font sizes in a single diagram.
- Bound text inside shapes should use Body (`20`) or Label (`16`) depending on shape size.
- For shapes smaller than 120×60, use Label (`16`) to prevent overflow.

### Width Estimation

When setting text element `width`, estimate based on character count:

| fontSize | Approx width per char | Example: "Hello World" (11 chars) |
|----------|-----------------------|------------------------------------|
| `36`     | ~20px                 | ~220px                             |
| `24`     | ~14px                 | ~154px                             |
| `20`     | ~11px                 | ~121px                             |
| `16`     | ~9px                  | ~99px                              |
| `14`     | ~8px                  | ~88px                              |

---

## Background Color Application

### When to use backgrounds

- **Shapes** (rectangle, ellipse, diamond): Almost always. Backgrounds make shapes visually distinct.
- **Text**: Rarely. Keep text backgrounds transparent unless highlighting.
- **Arrows/Lines**: Never. Always `transparent`.

### Light vs dark backgrounds

- **Light backgrounds with dark strokes** is the standard, most readable approach.
- **Dark backgrounds with light strokes** (dark mode) requires `fillStyle: "solid"` and `roughness: 0` for clarity.
- Background color should be noticeably lighter than stroke color (aim for the stroke-to-bg contrast in the palette tables).

---

## Combining Style Properties

### Professional / Corporate

```
strokeWidth: 2, roughness: 0, fillStyle: "solid", fontFamily: 5, strokeStyle: "solid"
```

### Casual / Whiteboard

```
strokeWidth: 2, roughness: 2, fillStyle: "hachure", fontFamily: 1, strokeStyle: "solid"
```

### Technical / Documentation

```
strokeWidth: 2, roughness: 0, fillStyle: "solid", fontFamily: 3, strokeStyle: "solid"
```

### Balanced (Default)

```
strokeWidth: 2, roughness: 1, fillStyle: "solid", fontFamily: 5, strokeStyle: "solid"
```

---

## Anti-patterns

Avoid these common styling mistakes:

| Mistake                         | Why it's bad                          | Fix                                  |
|---------------------------------|---------------------------------------|--------------------------------------|
| Mixing roughness 0 and 2       | Looks inconsistent and unintentional  | Pick one value for the whole diagram |
| More than 5 colors             | Visual noise, hard to parse           | Stick to one palette (5 colors max)  |
| strokeWidth: 4 on everything   | Nothing stands out, looks heavy       | Use 4 only for 1–2 emphasis elements |
| Different fontFamily per shape  | Chaotic, unprofessional               | One font for all, mono for code only |
| No background on shapes        | Shapes blend together, low contrast   | Add light background fills           |
| fontSize < 14                  | Unreadable at normal zoom             | Use 14 as the minimum                |
