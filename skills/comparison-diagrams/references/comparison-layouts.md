# Comparison Layouts

Three reusable coordinate templates for positioning comparison diagrams.

## 1. Side-by-Side (Equal Panels)

Two equal-width panels separated by a vertical divider. Best for structural comparisons
where both states have similar complexity.

```
┌──────────── 700 ────────────┐ ┌──────────── 700 ────────────┐
│  State A                    │ │  State B                    │
│  x: 50–750                  │ │  x: 850–1550               │
│  y: 100–700                 │ │  y: 100–700                 │
│                             │ │                             │
│  Content area: 600 x 550    │ │  Content area: 600 x 550   │
│  (50px inner padding)       │ │  (50px inner padding)       │
└─────────────────────────────┘ └─────────────────────────────┘
                          divider x=800
```

| Element        | x    | y   | width | height | Notes                      |
|---------------|------|-----|-------|--------|----------------------------|
| Panel A bg    | 50   | 80  | 700   | 620    | Optional rounded rect      |
| Panel B bg    | 850  | 80  | 700   | 620    | Optional rounded rect      |
| Divider line  | 800  | 50  | 0     | 680    | Dashed, strokeColor #868e96|
| Label A       | 300  | 30  | —     | —      | Centered text, fontSize 28 |
| Label B       | 1100 | 30  | —     | —      | Centered text, fontSize 28 |
| Content A     | 100  | 130 | 600   | 550    | Inner content region       |
| Content B     | 900  | 130 | 600   | 550    | Inner content region       |

**Camera frame:** `{ "x": 0, "y": 0, "width": 1600, "height": 750 }`

### Scaffold JSON

```json
{
  "elements": [
    {
      "id": "panel-a-bg", "type": "rectangle",
      "x": 50, "y": 80, "width": 700, "height": 620,
      "strokeColor": "#ced4da", "backgroundColor": "#f8f9fa",
      "fillStyle": "solid", "strokeWidth": 1, "roundness": { "type": 3 }
    },
    {
      "id": "panel-b-bg", "type": "rectangle",
      "x": 850, "y": 80, "width": 700, "height": 620,
      "strokeColor": "#ced4da", "backgroundColor": "#f8f9fa",
      "fillStyle": "solid", "strokeWidth": 1, "roundness": { "type": 3 }
    },
    {
      "id": "divider", "type": "line",
      "x": 800, "y": 50, "width": 0, "height": 680,
      "strokeColor": "#868e96", "strokeWidth": 2, "strokeStyle": "dashed",
      "points": [[0, 0], [0, 680]]
    },
    {
      "id": "label-a", "type": "text",
      "x": 300, "y": 30, "text": "Before",
      "fontSize": 28, "fontFamily": 3, "textAlign": "center"
    },
    {
      "id": "label-b", "type": "text",
      "x": 1100, "y": 30, "text": "After",
      "fontSize": 28, "fontFamily": 3, "textAlign": "center"
    }
  ]
}
```

## 2. Top / Bottom Stack

Two horizontal panels stacked vertically. Best when elements are wide (timelines,
pipelines) or when vertical space is less constrained than horizontal.

```
┌───────────────────── 1200 ─────────────────────┐
│  State A — x: 100–1300, y: 80–380              │
│  Content area: 1100 x 250                      │
└─────────────────────────────────────────────────┘
                  divider y=420
┌───────────────────── 1200 ─────────────────────┐
│  State B — x: 100–1300, y: 460–760             │
│  Content area: 1100 x 250                      │
└─────────────────────────────────────────────────┘
```

| Element        | x    | y   | width | height | Notes                      |
|---------------|------|-----|-------|--------|----------------------------|
| Panel A bg    | 100  | 60  | 1200  | 340    | Optional rounded rect      |
| Panel B bg    | 100  | 440 | 1200  | 340    | Optional rounded rect      |
| Divider line  | 80   | 420 | 1240  | 0      | Horizontal dashed line     |
| Label A       | 120  | 70  | —     | —      | Left-aligned, fontSize 24  |
| Label B       | 120  | 450 | —     | —      | Left-aligned, fontSize 24  |
| Content A     | 150  | 110 | 1100  | 250    | Inner content region       |
| Content B     | 150  | 490 | 1100  | 250    | Inner content region       |

**Camera frame:** `{ "x": 50, "y": 20, "width": 1300, "height": 800 }`

### Scaffold JSON

```json
{
  "elements": [
    {
      "id": "panel-a-bg", "type": "rectangle",
      "x": 100, "y": 60, "width": 1200, "height": 340,
      "strokeColor": "#ced4da", "backgroundColor": "#f8f9fa",
      "fillStyle": "solid", "strokeWidth": 1, "roundness": { "type": 3 }
    },
    {
      "id": "panel-b-bg", "type": "rectangle",
      "x": 100, "y": 440, "width": 1200, "height": 340,
      "strokeColor": "#ced4da", "backgroundColor": "#f8f9fa",
      "fillStyle": "solid", "strokeWidth": 1, "roundness": { "type": 3 }
    },
    {
      "id": "divider", "type": "line",
      "x": 80, "y": 420, "width": 1240, "height": 0,
      "strokeColor": "#868e96", "strokeWidth": 2, "strokeStyle": "dashed",
      "points": [[0, 0], [1240, 0]]
    },
    {
      "id": "label-a", "type": "text",
      "x": 120, "y": 70, "text": "Before",
      "fontSize": 24, "fontFamily": 3, "textAlign": "left"
    },
    {
      "id": "label-b", "type": "text",
      "x": 120, "y": 450, "text": "After",
      "fontSize": 24, "fontFamily": 3, "textAlign": "left"
    }
  ]
}
```

## 3. Split with Shared Center

Shared elements occupy the center column. Unique-to-A elements on the left,
unique-to-B elements on the right. Best for comparisons where most of the system
stays the same and only edges differ.

```
┌──── 400 ────┐ ┌──── 500 ────┐ ┌──── 400 ────┐
│ Unique to A  │ │   Shared    │ │ Unique to B  │
│ x: 50–450   │ │ x: 500–1000 │ │ x: 1050–1450 │
│ y: 100–700  │ │ y: 100–700  │ │ y: 100–700   │
└──────────────┘ └─────────────┘ └──────────────┘
            div x=475       div x=1025
```

| Element         | x    | y   | width | height | Notes                     |
|----------------|------|-----|-------|--------|---------------------------|
| Left zone bg   | 50   | 80  | 400   | 620    | Removal-tinted background |
| Center zone bg | 500  | 80  | 500   | 620    | Neutral background        |
| Right zone bg  | 1050 | 80  | 400   | 620    | Addition-tinted background|
| Divider left   | 475  | 50  | 0     | 680    | Dashed line               |
| Divider right  | 1025 | 50  | 0     | 680    | Dashed line               |
| Label left     | 200  | 30  | —     | —      | "Only in A"               |
| Label center   | 700  | 30  | —     | —      | "Shared"                  |
| Label right    | 1200 | 30  | —     | —      | "Only in B"               |

**Camera frame:** `{ "x": 0, "y": 0, "width": 1500, "height": 750 }`

### Usage Guidance

- Place **shared elements** in the center first, then add unique elements to each side.
- Draw arrows from shared elements outward to unique elements on each side.
- Animate center elements first (they provide context), then reveal sides.
- Color the left zone background with a subtle red tint (`#fff5f5`) and the right zone
  with a subtle green tint (`#f4fce3`) to reinforce the diff metaphor.
