---
name: mind-maps
description: >
  Create animated mind maps and concept diagrams using the Excalimate MCP server.
  Use when asked to brainstorm, visualize concepts, create idea trees, knowledge maps,
  feature maps, topic clusters, or any radial/hierarchical concept exploration — even
  if the user just says "map out the ideas" or "brainstorm this."
---

# Mind Maps Agent Skill

## Quick Start
When users mention brainstorming, mapping ideas, visualizing concepts, or organizing thoughts, create an animated mind map with a central concept branching out radially.

## Workflow
1. **Central Concept**: Place the main topic at center (800, 500)
2. **Primary Branches**: Create 5-8 main branches at equal angles around center
3. **Sub-branches**: Add 2-4 sub-concepts per primary branch
4. **Radial Layout**: Use mathematical positioning for clean spacing
5. **Animate Center-Out**: Start with center, then primary branches, then sub-branches

## Layout System

### Positioning Formula
For radial layout around center point (800, 500):
```
angle = (2 * Math.PI * index) / totalBranches
x = centerX + distance * Math.cos(angle)  
y = centerY + distance * Math.sin(angle)
```

### Distance Guidelines
- **Primary branches**: 300px from center
- **Sub-branches**: 200px from parent node
- **Minimum spacing**: 150px between adjacent nodes

### Node Hierarchy
- **Center node**: 280×100px, fontSize 28, bold
- **Primary branches**: 200×70px, fontSize 20, semibold  
- **Sub-branches**: 160×50px, fontSize 16, regular

## Color System
Use distinct colors for each primary branch and inherit for sub-branches:

1. **Branch 1**: Blue - stroke: #1971c2, fill: #a5d8ff
2. **Branch 2**: Green - stroke: #2f9e44, fill: #b2f2bb
3. **Branch 3**: Orange - stroke: #f08c00, fill: #ffec99
4. **Branch 4**: Purple - stroke: #6741d9, fill: #d0bfff
5. **Branch 5**: Teal - stroke: #0c8599, fill: #99e9f2
6. **Branch 6**: Red - stroke: #e03131, fill: #ffc9c9

Sub-branches inherit parent branch colors but with 70% opacity.

## Connector Style
- **Type**: "line" (not arrows) for organic mind map feel
- **Style**: Curved 3-point lines connecting center to branches
- **Color**: Match the target node's stroke color
- **Width**: 3px for primary, 2px for sub-branches

## Animation Sequence
1. **Center Pop-in** (0-600ms): Scale from 0 to 1, easeOutBack
2. **Primary Branches** (600-2400ms): Slide in radially, staggered by 300ms each
3. **Sub-branches** (2400ms+): Fade in grouped by parent branch, 200ms stagger

## Complete Example

```json
{
  "elements": [
    {
      "id": "center",
      "type": "rectangle",
      "x": 720,
      "y": 450,
      "width": 280,
      "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 3,
      "roughness": 1,
      "text": {
        "text": "Project Planning",
        "fontSize": 28,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    {
      "id": "branch1",
      "type": "rectangle", 
      "x": 1020,
      "y": 415,
      "width": 200,
      "height": 70,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "text": {
        "text": "Requirements",
        "fontSize": 20,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    {
      "id": "branch2", 
      "type": "rectangle",
      "x": 950,
      "y": 650,
      "width": 200,
      "height": 70,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb", 
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "text": {
        "text": "Resources",
        "fontSize": 20,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    {
      "id": "branch3",
      "type": "rectangle",
      "x": 650,
      "y": 750,
      "width": 200,
      "height": 70,
      "strokeColor": "#f08c00",
      "backgroundColor": "#ffec99",
      "fillStyle": "solid", 
      "strokeWidth": 2,
      "roughness": 1,
      "text": {
        "text": "Timeline",
        "fontSize": 20,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    {
      "id": "branch4",
      "type": "rectangle",
      "x": 350,
      "y": 650,
      "width": 200,
      "height": 70,
      "strokeColor": "#6741d9",
      "backgroundColor": "#d0bfff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "text": {
        "text": "Risks",
        "fontSize": 20,
        "fontFamily": 1,
        "textAlign": "center", 
        "verticalAlign": "middle"
      }
    },
    {
      "id": "sub1a",
      "type": "rectangle",
      "x": 1180,
      "y": 280,
      "width": 160,
      "height": 50,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 1,
      "opacity": 70,
      "text": {
        "text": "User Stories",
        "fontSize": 16,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    {
      "id": "sub1b",
      "type": "rectangle",
      "x": 1280,
      "y": 380,
      "width": 160,
      "height": 50,
      "strokeColor": "#1971c2", 
      "backgroundColor": "#a5d8ff",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 1,
      "opacity": 70,
      "text": {
        "text": "Acceptance Criteria",
        "fontSize": 16,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    {
      "id": "sub2a",
      "type": "rectangle",
      "x": 1100,
      "y": 780,
      "width": 160,
      "height": 50,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 1,
      "opacity": 70,
      "text": {
        "text": "Team Members",
        "fontSize": 16,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    {
      "id": "sub2b",
      "type": "rectangle",
      "x": 1180,
      "y": 580,
      "width": 160,
      "height": 50,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 1,
      "opacity": 70,
      "text": {
        "text": "Budget",
        "fontSize": 16,
        "fontFamily": 1,
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    }
  ],
  "appState": {
    "viewBackgroundColor": "#f8f9fa"
  }
}
```

## Animation JSON

```json
{
  "keyframes": [
    {
      "timestamp": 0,
      "elements": {
        "center": {"opacity": 0, "scale": 0}
      }
    },
    {
      "timestamp": 600,
      "elements": {
        "center": {"opacity": 100, "scale": 1}
      },
      "ease": "easeOutBack"
    },
    {
      "timestamp": 600,
      "elements": {
        "branch1": {"x": 860, "opacity": 0},
        "branch2": {"x": 860, "opacity": 0},
        "branch3": {"x": 860, "opacity": 0},
        "branch4": {"x": 860, "opacity": 0}
      }
    },
    {
      "timestamp": 900,
      "elements": {
        "branch1": {"x": 1020, "opacity": 100}
      }
    },
    {
      "timestamp": 1200,
      "elements": {
        "branch2": {"x": 950, "opacity": 100}
      }
    },
    {
      "timestamp": 1500,
      "elements": {
        "branch3": {"x": 650, "opacity": 100}
      }
    },
    {
      "timestamp": 1800,
      "elements": {
        "branch4": {"x": 350, "opacity": 100}
      }
    },
    {
      "timestamp": 2400,
      "elements": {
        "sub1a": {"opacity": 0},
        "sub1b": {"opacity": 0},
        "sub2a": {"opacity": 0},
        "sub2b": {"opacity": 0}
      }
    },
    {
      "timestamp": 2800,
      "elements": {
        "sub1a": {"opacity": 70},
        "sub1b": {"opacity": 70}
      }
    },
    {
      "timestamp": 3200,
      "elements": {
        "sub2a": {"opacity": 70},
        "sub2b": {"opacity": 70}
      }
    }
  ]
}
```

## Tips for Great Mind Maps
1. **Keep text concise** - 1-3 words per node
2. **Use consistent spacing** - Mathematical positioning ensures visual balance
3. **Color code meaningfully** - Group related concepts with same colors
4. **Animate thoughtfully** - Reveal information in logical order
5. **Leave whitespace** - Don't overcrowd the canvas
6. **Consider the user's mental model** - Organize branches by importance or logical flow