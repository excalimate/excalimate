---
name: timeline-roadmaps
description: >
  Create animated timelines and project roadmaps using the Excalimate MCP server.
  Use when asked to visualize project timelines, product roadmaps, release schedules,
  sprint plans, historical sequences, milestones, Gantt-style views, or any
  chronological sequence — even if the user just says "show the plan" or "roadmap."
---

# Timeline & Roadmap Creation Skill

Create animated timelines and project roadmaps with hand-drawn aesthetics using Excalimate.

## Workflow

1. **List events chronologically** - Extract all timeline items, dates, and durations
2. **Choose layout** - Horizontal (most common), vertical, multi-track, or curved
3. **Position proportionally** - Space events along time axis based on actual dates or equal spacing
4. **Animate left-to-right** - Timeline axis draws first, then milestones appear in sequence

## Horizontal Timeline Layout

**Main Structure:**
- Axis line: y=300, from x=100 to x=1500
- Milestones: alternating above (y=200) and below (y=400)
- Spacing: 200px equal intervals or proportional to time gaps

**Components:**
- **Marker dots**: Small ellipse 20×20 centered on axis line
- **Event cards**: Rectangle 180×80 positioned above/below axis
- **Date labels**: Small text positioned 30px below axis line
- **Connector lines**: Vertical line from axis to event card
- **Phase blocks**: Wide rectangles spanning multiple milestones

**Coordinates Example (5 milestones):**
```
Axis: (100,300) to (1500,300)
Event 1: marker (200,300), card (110,160), label (200,340)
Event 2: marker (400,300), card (310,380), label (400,340)  
Event 3: marker (600,300), card (510,160), label (600,340)
Event 4: marker (800,300), card (710,380), label (800,340)
Event 5: marker (1000,300), card (910,160), label (1000,340)
```

## Multi-Track Phase Layout

For parallel workstreams or Gantt-style roadmaps:

**Track Structure:**
- Track 1: y=200 (Development)
- Track 2: y=350 (Design) 
- Track 3: y=500 (Testing)
- Track headers: Rectangle 150×40 at x=20 for each track
- Phase blocks: Rectangle spanning duration on each track

## Color Coding by Status

```
Completed: #2f9e44 (dark green) / #b2f2bb (light green)
Current: #1971c2 (blue) / #a5d8ff (light blue)
Upcoming: #6741d9 (purple) / #d0bfff (light purple)
Milestone: #f08c00 (orange) / #ffec99 (light orange)
Blocked: #e03131 (red) / #ffc9c9 (light red)
```

**Usage:**
- Event cards: Use light colors for background, dark for borders
- Marker dots: Use dark colors
- Phase blocks: Use light colors with 60% opacity

## Animation Patterns

**Timeline Axis Drawing (0-1500ms):**
```json
{
  "element": "main-axis",
  "property": "drawProgress", 
  "from": 0,
  "to": 1,
  "duration": 1500,
  "easing": "ease-out"
}
```

**Milestone Pop-in Sequence:**
- Start at 1500ms (after axis completes)
- 400ms stagger delay between each milestone
- Scale from 0 to 1 with easeOutBack for bounce effect

**Camera Scroll (for wide timelines):**
```json
{
  "element": "camera",
  "property": "x",
  "from": 0,
  "to": -800,
  "duration": 3000,
  "easing": "ease-in-out"
}
```

## Complete Example: Software Release Timeline

```json
{
  "action": "create_scene",
  "elements": [
    {
      "id": "main-axis",
      "type": "line",
      "x1": 100, "y1": 300,
      "x2": 1300, "y2": 300,
      "stroke": "#343a40",
      "strokeWidth": 4,
      "drawProgress": 0
    },
    {
      "id": "milestone-1",
      "type": "group",
      "opacity": 0,
      "scaleX": 0,
      "scaleY": 0,
      "children": [
        {
          "type": "ellipse",
          "cx": 200, "cy": 300,
          "rx": 10, "ry": 10,
          "fill": "#1971c2"
        },
        {
          "type": "rectangle",
          "x": 110, "y": 160,
          "width": 180, "height": 80,
          "fill": "#a5d8ff",
          "stroke": "#1971c2",
          "strokeWidth": 2,
          "rx": 8
        },
        {
          "type": "text",
          "x": 200, "y": 200,
          "text": "Planning Phase",
          "fontSize": 14,
          "fill": "#1971c2",
          "textAnchor": "middle"
        },
        {
          "type": "line",
          "x1": 200, "y1": 300,
          "x2": 200, "y2": 240,
          "stroke": "#868e96",
          "strokeWidth": 2
        },
        {
          "type": "text",
          "x": 200, "y": 340,
          "text": "Jan 2024",
          "fontSize": 12,
          "fill": "#868e96",
          "textAnchor": "middle"
        }
      ]
    },
    {
      "id": "milestone-2", 
      "type": "group",
      "opacity": 0,
      "scaleX": 0,
      "scaleY": 0,
      "children": [
        {
          "type": "ellipse",
          "cx": 450, "cy": 300,
          "rx": 10, "ry": 10,
          "fill": "#2f9e44"
        },
        {
          "type": "rectangle",
          "x": 360, "y": 380,
          "width": 180, "height": 80,
          "fill": "#b2f2bb",
          "stroke": "#2f9e44",
          "strokeWidth": 2,
          "rx": 8
        },
        {
          "type": "text",
          "x": 450, "y": 420,
          "text": "Development",
          "fontSize": 14,
          "fill": "#2f9e44", 
          "textAnchor": "middle"
        },
        {
          "type": "line",
          "x1": 450, "y1": 300,
          "x2": 450, "y2": 380,
          "stroke": "#868e96",
          "strokeWidth": 2
        },
        {
          "type": "text",
          "x": 450, "y": 340,
          "text": "Mar 2024",
          "fontSize": 12,
          "fill": "#868e96",
          "textAnchor": "middle"
        }
      ]
    },
    {
      "id": "milestone-3",
      "type": "group", 
      "opacity": 0,
      "scaleX": 0,
      "scaleY": 0,
      "children": [
        {
          "type": "ellipse",
          "cx": 700, "cy": 300,
          "rx": 10, "ry": 10,
          "fill": "#f08c00"
        },
        {
          "type": "rectangle",
          "x": 610, "y": 160,
          "width": 180, "height": 80,
          "fill": "#ffec99",
          "stroke": "#f08c00", 
          "strokeWidth": 2,
          "rx": 8
        },
        {
          "type": "text",
          "x": 700, "y": 200,
          "text": "Beta Release",
          "fontSize": 14,
          "fill": "#f08c00",
          "textAnchor": "middle"
        },
        {
          "type": "line",
          "x1": 700, "y1": 300,
          "x2": 700, "y2": 240,
          "stroke": "#868e96",
          "strokeWidth": 2
        },
        {
          "type": "text",
          "x": 700, "y": 340,
          "text": "May 2024",
          "fontSize": 12,
          "fill": "#868e96",
          "textAnchor": "middle"
        }
      ]
    },
    {
      "id": "milestone-4",
      "type": "group",
      "opacity": 0,
      "scaleX": 0, 
      "scaleY": 0,
      "children": [
        {
          "type": "ellipse",
          "cx": 950, "cy": 300,
          "rx": 10, "ry": 10,
          "fill": "#6741d9"
        },
        {
          "type": "rectangle", 
          "x": 860, "y": 380,
          "width": 180, "height": 80,
          "fill": "#d0bfff",
          "stroke": "#6741d9",
          "strokeWidth": 2,
          "rx": 8
        },
        {
          "type": "text",
          "x": 950, "y": 420,
          "text": "Launch Ready",
          "fontSize": 14,
          "fill": "#6741d9",
          "textAnchor": "middle"
        },
        {
          "type": "line",
          "x1": 950, "y1": 300,
          "x2": 950, "y2": 380,
          "stroke": "#868e96",
          "strokeWidth": 2
        },
        {
          "type": "text",
          "x": 950, "y": 340,
          "text": "Jul 2024",
          "fontSize": 12,
          "fill": "#868e96",
          "textAnchor": "middle"
        }
      ]
    }
  ]
}
```

```json
{
  "action": "add_keyframes_batch",
  "keyframes": [
    {
      "element": "main-axis",
      "property": "drawProgress",
      "from": 0,
      "to": 1,
      "duration": 1500,
      "easing": "ease-out",
      "delay": 0
    },
    {
      "element": "milestone-1",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 300,
      "delay": 1500
    },
    {
      "element": "milestone-1",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 1500
    },
    {
      "element": "milestone-1", 
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 1500
    },
    {
      "element": "milestone-2",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 300,
      "delay": 1900
    },
    {
      "element": "milestone-2",
      "property": "scaleX", 
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 1900
    },
    {
      "element": "milestone-2",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 1900
    },
    {
      "element": "milestone-3",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 300,
      "delay": 2300
    },
    {
      "element": "milestone-3",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeOutBack", 
      "delay": 2300
    },
    {
      "element": "milestone-3",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 2300
    },
    {
      "element": "milestone-4",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 300,
      "delay": 2700
    },
    {
      "element": "milestone-4",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 2700
    },
    {
      "element": "milestone-4",
      "property": "scaleY",
      "from": 0,
      "to": 1, 
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 2700
    }
  ]
}
```

## Quick Reference

- **Horizontal**: Main axis y=300, events alternate above/below
- **Spacing**: 200px intervals or proportional to time
- **Colors**: Green (done), blue (current), purple (future), orange (milestone)
- **Animation**: Axis first (1500ms), then milestones staggered (400ms delay)
- **Coordinates**: Start x=100, typical end x=1300-1500

Always include proper JSON structure with `create_scene` followed by `add_keyframes_batch` for animations.