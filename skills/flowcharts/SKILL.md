---
name: flowcharts
description: >
  Create professional flowcharts and process diagrams with step-by-step animations
  using the Excalimate MCP server. Use when asked to visualize workflows, decision
  trees, business processes, approval flows, deployment pipelines, CI/CD flows, or
  any sequential or branching process — even if the user just says "show me the steps."
---

# Flowcharts Agent Skill

Creates professional flowcharts and process diagrams with smooth step-by-step animations using the Excalimate MCP server.

## Flowchart Workflow

The systematic approach to creating flowcharts:

1. **Parse Process**: Break down the workflow into discrete steps, identifying decision points and endpoints
2. **Assign Standard Symbols**: Map each step to the appropriate flowchart symbol (terminal, process, decision, I/O)
3. **Layout Top-to-Bottom**: Position elements with consistent spacing and alignment
4. **Connect with Bound Arrows**: Use bound arrows that automatically maintain connections
5. **Animate Following Process Flow**: Create sequential animations that follow the logical flow

## Standard Symbols

All symbols use bound elements for labels. Here are the standard symbol definitions:

### Start/End Terminal (Ellipse)
```json
{"type": "ellipse", "width": 140, "height": 60, "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "boundElements": [{"type": "text", "text": "Start"}]}
```

### Process Step (Rectangle)  
```json
{"type": "rectangle", "width": 180, "height": 80, "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "boundElements": [{"type": "text", "text": "Process Step"}]}
```

### Decision Diamond
```json
{"type": "diamond", "width": 160, "height": 140, "strokeColor": "#f08c00", "backgroundColor": "#ffec99", "boundElements": [{"type": "text", "text": "Decision?"}]}
```

### Input/Output Box
```json
{"type": "rectangle", "width": 180, "height": 70, "strokeColor": "#0c8599", "backgroundColor": "#99e9f2", "boundElements": [{"type": "text", "text": "Input/Output"}]}
```

### Error/Reject Box
```json
{"type": "rectangle", "width": 180, "height": 80, "strokeColor": "#e03131", "backgroundColor": "#ffc9c9", "boundElements": [{"type": "text", "text": "Error/Reject"}]}
```

## Top-Down Layout

Standard layout principles:
- **Start Position**: Top center (centerX - width/2, 50)
- **Vertical Spacing**: 150px between elements
- **Decision Branches**: Yes continues down, No branches right (+300px)
- **Standard Widths**: Process 180px, Decision 160px, Terminal 140px

## Decision Branch Layout

For decision points:
- **Main Path (Yes)**: Continue straight down
- **Alternate Path (No)**: Branch right by 300px
- **Labels**: "Yes"/"No" as small text labels positioned near arrows
- **Rejoining**: Branches can rejoin the main flow below

## Color Coding

| Element Type | Color | Hex Codes |
|-------------|--------|-----------|
| Start/End | Green | Stroke: #2f9e44, Fill: #b2f2bb |
| Process | Blue | Stroke: #1971c2, Fill: #a5d8ff |
| Decision | Orange | Stroke: #f08c00, Fill: #ffec99 |
| Input/Output | Teal | Stroke: #0c8599, Fill: #99e9f2 |
| Error/Reject | Red | Stroke: #e03131, Fill: #ffc9c9 |

## Animation Pattern - Follow the Flow

Sequential animation that follows the logical process flow:

1. **Start Terminal**: Fade in 0-400ms
2. **First Arrow**: Draw animation 400-1000ms  
3. **First Process**: Fade in 1000-1500ms
4. **Second Arrow**: Draw animation 1500-2100ms
5. **Decision Point**: Fade in 2100-2600ms
6. **Branch Arrows**: Draw both paths 2600-3200ms
7. **Branch Outcomes**: Both paths fade in 3200-4200ms
8. **End Terminal**: Final fade in 4200-4600ms

## Complete Working Example

Here's a 5-step approval process with decision branch:

### Scene Creation
```json
{
  "elements": [
    {
      "id": "start",
      "type": "ellipse",
      "x": 360,
      "y": 50,
      "width": 140,
      "height": 60,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "boundElements": [{"id": "start-label", "type": "text"}]
    },
    {
      "id": "start-label",
      "type": "text",
      "text": "Start",
      "containerId": "start"
    },
    {
      "id": "submit",
      "type": "rectangle", 
      "x": 320,
      "y": 200,
      "width": 180,
      "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "boundElements": [{"id": "submit-label", "type": "text"}]
    },
    {
      "id": "submit-label",
      "type": "text",
      "text": "Submit Request",
      "containerId": "submit"
    },
    {
      "id": "review",
      "type": "diamond",
      "x": 340,
      "y": 350,
      "width": 160,
      "height": 140,
      "strokeColor": "#f08c00", 
      "backgroundColor": "#ffec99",
      "boundElements": [{"id": "review-label", "type": "text"}]
    },
    {
      "id": "review-label",
      "type": "text",
      "text": "Approved?",
      "containerId": "review"
    },
    {
      "id": "approve",
      "type": "rectangle",
      "x": 320,
      "y": 550,
      "width": 180,
      "height": 80,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "boundElements": [{"id": "approve-label", "type": "text"}]
    },
    {
      "id": "approve-label",
      "type": "text",
      "text": "Process Approval",
      "containerId": "approve"
    },
    {
      "id": "reject",
      "type": "rectangle",
      "x": 640,
      "y": 550,
      "width": 180,
      "height": 80,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffc9c9",
      "boundElements": [{"id": "reject-label", "type": "text"}]
    },
    {
      "id": "reject-label",
      "type": "text", 
      "text": "Send Rejection",
      "containerId": "reject"
    },
    {
      "id": "end",
      "type": "ellipse",
      "x": 360,
      "y": 700,
      "width": 140,
      "height": 60,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "boundElements": [{"id": "end-label", "type": "text"}]
    },
    {
      "id": "end-label",
      "type": "text",
      "text": "End",
      "containerId": "end"
    },
    {
      "id": "arrow1",
      "type": "arrow",
      "startBinding": {"elementId": "start"},
      "endBinding": {"elementId": "submit"}
    },
    {
      "id": "arrow2", 
      "type": "arrow",
      "startBinding": {"elementId": "submit"},
      "endBinding": {"elementId": "review"}
    },
    {
      "id": "arrow3",
      "type": "arrow",
      "startBinding": {"elementId": "review"},
      "endBinding": {"elementId": "approve"},
      "label": {"text": "Yes"}
    },
    {
      "id": "arrow4",
      "type": "arrow", 
      "startBinding": {"elementId": "review"},
      "endBinding": {"elementId": "reject"},
      "label": {"text": "No"}
    },
    {
      "id": "arrow5",
      "type": "arrow",
      "startBinding": {"elementId": "approve"},
      "endBinding": {"elementId": "end"}
    },
    {
      "id": "arrow6",
      "type": "arrow",
      "startBinding": {"elementId": "reject"}, 
      "endBinding": {"elementId": "end"}
    }
  ]
}
```

### Animation Keyframes
```json
{
  "keyframes": [
    {
      "elementIds": ["start", "start-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 0, "value": 0},
        {"time": 400, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow1"], 
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 400, "value": 100},
        {"time": 1000, "value": 0}
      ]
    },
    {
      "elementIds": ["submit", "submit-label"],
      "property": "opacity", 
      "keyframes": [
        {"time": 1000, "value": 0},
        {"time": 1500, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow2"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 1500, "value": 100},
        {"time": 2100, "value": 0}
      ]
    },
    {
      "elementIds": ["review", "review-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 2100, "value": 0},
        {"time": 2600, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow3", "arrow4"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 2600, "value": 100},
        {"time": 3200, "value": 0}
      ]
    },
    {
      "elementIds": ["approve", "approve-label", "reject", "reject-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 3200, "value": 0},
        {"time": 4200, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow5", "arrow6"],
      "property": "strokeDashoffset", 
      "keyframes": [
        {"time": 4200, "value": 100},
        {"time": 4800, "value": 0}
      ]
    },
    {
      "elementIds": ["end", "end-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 4800, "value": 0},
        {"time": 5200, "value": 1}
      ]
    }
  ]
}
```

## Usage Tips

1. **Always use bound elements** for text labels to maintain relationships
2. **Keep consistent spacing** - 150px vertical gaps work well for most flows
3. **Color-code by function** - not randomly, but by element purpose
4. **Animate logically** - follow the actual process flow, not just top-to-bottom
5. **Label decision branches clearly** - "Yes"/"No" or specific conditions
6. **Consider swimlanes** for complex processes with multiple actors
7. **Test the flow** - walk through the logic before finalizing