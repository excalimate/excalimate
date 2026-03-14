---
name: org-charts
description: >
  Create animated organizational charts and hierarchy diagrams using the Excalimate
  MCP server. Use when asked to visualize org structures, team hierarchies, reporting
  lines, management chains, company structure, department layouts, or any tree-structured
  hierarchy with people, roles, or departments.
---

# Org Charts Agent Skill

This skill creates animated organizational charts and hierarchy diagrams using hand-drawn Excalidraw elements with smooth keyframe animations.

## Core Workflow

1. **Parse Hierarchy**: Extract roles and reporting structure from user input
2. **Build Tree**: Organize roles into hierarchical tree structure
3. **Calculate Layout**: Position elements using balanced top-down algorithm
4. **Create Elements**: Generate role cards and connecting lines
5. **Animate**: Apply level-by-level reveal animations

## Tree Layout Algorithm

### Positioning Rules
- **Root**: Positioned at top-center of canvas
- **Levels**: Each level 180px below the previous
- **Children**: Centered horizontally under parent with 30px gaps
- **Card Width**: 200px standard width
- **Layout Formula**: 
  - N children: totalWidth = N × 200 + (N-1) × 30
  - Starting X: parentCenterX - totalWidth/2
  - Child positions: startX + i × (200 + 30)

### Example Layout
```
       CEO (x=500)
         |
    ┌────┼────┐
   VP1   VP2   VP3
 (x=315)(x=500)(x=685)
```

## Role Card Design

### Card Specifications
- **Dimensions**: 200px × 80px rectangle
- **Content**: Two-line text "Name\nTitle"
- **Styling**: Hand-drawn with slight roughness
- **Colors by Level**:
  - Executive: Fill=#d0bfff, Stroke=#6741d9
  - Director: Fill=#a5d8ff, Stroke=#1971c2
  - Manager: Fill=#99e9f2, Stroke=#0c8599
  - Individual Contributor: Fill=#b2f2bb, Stroke=#2f9e44

### Role Detection
- Executive: CEO, CTO, CFO, COO, President
- Director: Director, VP, Head of
- Manager: Manager, Lead, Senior Manager
- IC: Engineer, Designer, Analyst, Specialist

## Connector Lines

### Line Structure
- **Vertical Line**: From parent bottom-center downward (90px)
- **Horizontal Line**: Across all children at mid-level
- **Child Connectors**: Vertical up to each child top-center
- **Style**: Simple lines without arrowheads, stroke=#868e96

### Connection Algorithm
```javascript
// Parent to horizontal line
parentBottomY + 90 = horizontalLineY

// Horizontal line spans
leftmostChildX to rightmostChildX

// Child connectors
horizontalLineY to childTopY
```

## Animation Patterns

### Level-by-Level Reveal
1. **Root Pop-in**: 0-500ms scale animation
2. **Level 1 Stagger**: 500-1500ms, 200ms delays between siblings
3. **Connectors Draw**: 1500-2200ms stroke-dasharray animation
4. **Level 2 Stagger**: 2200-3200ms
5. **Continue**: Each level adds 1000ms base + stagger

### Timing Formula
```javascript
levelStartTime = 500 + (level - 1) * 1000
elementTime = levelStartTime + siblingIndex * 200
connectorTime = levelStartTime + 500
```

## Complete Example

### Input
"Create org chart for CEO with 3 VPs (Engineering, Sales, Marketing). Each VP has 2 Directors."

### Output Structure
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "type": "rectangle",
      "id": "ceo-card",
      "x": 400, "y": 50,
      "width": 200, "height": 80,
      "strokeColor": "#6741d9",
      "backgroundColor": "#d0bfff",
      "text": "Sarah Johnson\nCEO"
    },
    {
      "type": "rectangle", 
      "id": "vp-eng-card",
      "x": 115, "y": 230,
      "width": 200, "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "text": "Mike Chen\nVP Engineering"
    },
    {
      "type": "rectangle",
      "id": "vp-sales-card", 
      "x": 400, "y": 230,
      "width": 200, "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "text": "Lisa Rodriguez\nVP Sales"
    },
    {
      "type": "rectangle",
      "id": "vp-mkt-card",
      "x": 685, "y": 230, 
      "width": 200, "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "text": "David Kim\nVP Marketing"
    },
    {
      "type": "line",
      "id": "ceo-main-line",
      "points": [[500, 130], [500, 220]],
      "strokeColor": "#868e96"
    },
    {
      "type": "line", 
      "id": "horizontal-line",
      "points": [[215, 220], [785, 220]],
      "strokeColor": "#868e96"
    },
    {
      "type": "line",
      "id": "vp-eng-connector", 
      "points": [[215, 220], [215, 230]],
      "strokeColor": "#868e96"
    },
    {
      "type": "line",
      "id": "vp-sales-connector",
      "points": [[500, 220], [500, 230]], 
      "strokeColor": "#868e96"
    },
    {
      "type": "line",
      "id": "vp-mkt-connector",
      "points": [[785, 220], [785, 230]],
      "strokeColor": "#868e96"
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

### Animation Keyframes
```json
{
  "animations": [
    {
      "elementId": "ceo-card",
      "keyframes": [
        {"time": 0, "scale": 0},
        {"time": 500, "scale": 1}
      ]
    },
    {
      "elementIds": ["vp-eng-card", "vp-sales-card", "vp-mkt-card"],
      "type": "stagger",
      "keyframes": [
        {"time": 500, "opacity": 0, "scale": 0},
        {"time": 700, "opacity": 1, "scale": 1}
      ],
      "delay": 200
    },
    {
      "elementIds": ["ceo-main-line", "horizontal-line", "vp-eng-connector", "vp-sales-connector", "vp-mkt-connector"],
      "keyframes": [
        {"time": 1500, "strokeDasharray": "0,100"},
        {"time": 2200, "strokeDasharray": "100,0"}
      ]
    }
  ]
}
```

## Best Practices

### Layout Tips
- Keep org charts under 4 levels for readability
- Use consistent spacing and alignment
- Group related roles visually
- Consider canvas size for large hierarchies

### Animation Guidelines  
- Start with top-level roles for context
- Use staggered reveals to show relationships
- Draw connectors after roles are visible
- Keep total animation under 5 seconds

### Content Formatting
- Use "FirstName LastName\nJob Title" format
- Keep titles concise and clear
- Use consistent role terminology
- Highlight key reporting relationships

## Error Handling

- **Missing hierarchy**: Request clarification of reporting structure
- **Too many levels**: Suggest grouping or multiple charts
- **Unclear roles**: Ask for title standardization
- **Complex matrix**: Recommend simplified view with primary reporting lines

This skill transforms organizational data into clear, animated hierarchy visualizations that reveal structure and relationships through motion.