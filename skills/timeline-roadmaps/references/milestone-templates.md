# Milestone Component Templates

## Milestone Marker (Dot)

```json
{
  "type": "ellipse",
  "cx": 400,
  "cy": 300,
  "rx": 12,
  "ry": 12,
  "fill": "#1971c2",
  "stroke": "#ffffff",
  "strokeWidth": 3
}
```

## Event Card Above Timeline

```json
{
  "type": "group",
  "children": [
    {
      "type": "rectangle",
      "x": 310,
      "y": 160,
      "width": 180,
      "height": 80,
      "fill": "#a5d8ff", 
      "stroke": "#1971c2",
      "strokeWidth": 2,
      "rx": 8,
      "ry": 8
    },
    {
      "type": "text",
      "x": 400,
      "y": 190,
      "text": "Event Title",
      "fontSize": 14,
      "fontWeight": "bold",
      "fill": "#1971c2",
      "textAnchor": "middle"
    },
    {
      "type": "text", 
      "x": 400,
      "y": 210,
      "text": "Description line",
      "fontSize": 11,
      "fill": "#495057",
      "textAnchor": "middle"
    }
  ]
}
```

## Event Card Below Timeline

```json
{
  "type": "group",
  "children": [
    {
      "type": "rectangle",
      "x": 310,
      "y": 340,
      "width": 180,
      "height": 80,
      "fill": "#b2f2bb",
      "stroke": "#2f9e44", 
      "strokeWidth": 2,
      "rx": 8,
      "ry": 8
    },
    {
      "type": "text",
      "x": 400,
      "y": 370,
      "text": "Event Title",
      "fontSize": 14,
      "fontWeight": "bold", 
      "fill": "#2f9e44",
      "textAnchor": "middle"
    },
    {
      "type": "text",
      "x": 400,
      "y": 390,
      "text": "Description line",
      "fontSize": 11,
      "fill": "#495057",
      "textAnchor": "middle"
    }
  ]
}
```

## Date Label

```json
{
  "type": "text",
  "x": 400,
  "y": 330,
  "text": "Mar 2024",
  "fontSize": 12,
  "fill": "#868e96",
  "textAnchor": "middle",
  "fontFamily": "monospace"
}
```

## Phase Block (Spanning Multiple Events)

```json
{
  "type": "rectangle", 
  "x": 200,
  "y": 120,
  "width": 400,
  "height": 60,
  "fill": "#d0bfff",
  "stroke": "#6741d9",
  "strokeWidth": 2,
  "opacity": 0.6,
  "rx": 12,
  "ry": 12
}
```

## Track Header (Multi-track Layout)

```json
{
  "type": "group",
  "children": [
    {
      "type": "rectangle",
      "x": 20,
      "y": 180,
      "width": 150,
      "height": 40,
      "fill": "#f8f9fa",
      "stroke": "#495057",
      "strokeWidth": 2,
      "rx": 6
    },
    {
      "type": "text",
      "x": 95,
      "y": 205,
      "text": "Development",
      "fontSize": 12,
      "fontWeight": "bold",
      "fill": "#495057", 
      "textAnchor": "middle"
    }
  ]
}
```

## Connector Line (Vertical)

```json
{
  "type": "line",
  "x1": 400,
  "y1": 300,
  "x2": 400, 
  "y2": 240,
  "stroke": "#868e96",
  "strokeWidth": 2,
  "strokeDasharray": "3,3"
}
```

## Highlighted Current Marker

```json
{
  "type": "group",
  "children": [
    {
      "type": "ellipse",
      "cx": 400,
      "cy": 300,
      "rx": 20,
      "ry": 20,
      "fill": "#f08c00",
      "opacity": 0.3
    },
    {
      "type": "ellipse", 
      "cx": 400,
      "cy": 300,
      "rx": 12,
      "ry": 12,
      "fill": "#f08c00",
      "stroke": "#ffffff",
      "strokeWidth": 3
    },
    {
      "type": "text",
      "x": 400,
      "y": 306,
      "text": "NOW",
      "fontSize": 8,
      "fontWeight": "bold",
      "fill": "#ffffff",
      "textAnchor": "middle"
    }
  ]
}
```

## Section Divider

```json
{
  "type": "group",
  "children": [
    {
      "type": "line",
      "x1": 100,
      "y1": 500,
      "x2": 1400,
      "y2": 500,
      "stroke": "#dee2e6",
      "strokeWidth": 2,
      "strokeDasharray": "10,5"
    },
    {
      "type": "text",
      "x": 750,
      "y": 520,
      "text": "Phase 2: Implementation",
      "fontSize": 14,
      "fontWeight": "bold",
      "fill": "#495057",
      "textAnchor": "middle"
    }
  ]
}
```

## Usage Notes

**Color Combinations by Status:**
- **Completed**: fill: #b2f2bb, stroke: #2f9e44, text: #2f9e44
- **Current**: fill: #a5d8ff, stroke: #1971c2, text: #1971c2  
- **Upcoming**: fill: #d0bfff, stroke: #6741d9, text: #6741d9
- **Milestone**: fill: #ffec99, stroke: #f08c00, text: #f08c00
- **Blocked**: fill: #ffc9c9, stroke: #e03131, text: #e03131

**Positioning Guidelines:**
- Event cards: 180×80 rectangles
- Marker dots: 12px radius (24px diameter)
- Connector lines: 2px stroke, optional dash pattern
- Text hierarchy: Title 14px bold, description 11px regular, dates 12px monospace
- Phase blocks: 60-80px height, 0.6 opacity, 12px border radius