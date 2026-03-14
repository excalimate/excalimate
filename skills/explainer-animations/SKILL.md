---
name: explainer-animations
description: >
  Create educational animated explainers that teach concepts step-by-step using the
  Excalimate MCP server. Use when asked to explain how something works, create tutorial
  animations, onboarding walkthroughs, concept breakdowns, or any content that needs
  to progressively build understanding — even if the user says "show me how" or "walk
  me through."
---

# Explainer Animations Skill

This skill specializes in creating educational animated explainers that break down complex concepts into digestible, step-by-step visual narratives using the Excalimate MCP server.

## When to Use This Skill

- User asks "explain how X works" or "show me how X works"
- Tutorial creation and onboarding walkthroughs
- Concept breakdowns and educational content
- Process visualization (workflows, algorithms, systems)
- Step-by-step instructions that benefit from progressive revelation
- Any request that needs to build understanding incrementally

## Core Workflow

1. **Concept Breakdown**: Analyze the topic and break it into 3-7 logical steps
2. **Base Diagram**: Create the foundational visual structure 
3. **Progressive Layering**: Each step adds ONE new concept or element
4. **Annotation Strategy**: Use callouts, arrows, highlights to guide attention
5. **Timing Orchestration**: Coordinate reveals with appropriate reading time
6. **Camera Focus**: Direct viewer attention to relevant areas per step

## Progressive Complexity Principles

- **Start Simple**: Begin with the most basic, familiar elements
- **One Concept Per Step**: Each animation step introduces exactly one new idea
- **Reading Time**: Allow 2-3 seconds per line of text for comprehension
- **Visual Hierarchy**: Use size, color, and position to indicate importance
- **Cognitive Load**: Never overwhelm with too much information at once

## Callout Patterns

### Essential Callout Types
1. **Callout Box**: Contrasting background rectangle with explanatory text
2. **Annotation Arrow**: Points from explanation to specific diagram element
3. **Highlight Overlay**: Semi-transparent rectangle to emphasize regions
4. **Step Number Badge**: Small circle with step number for sequence tracking
5. **Info Box**: Detailed explanation panel with structured information
6. **Warning/Alert Box**: Special emphasis for important caveats or notes

### Visual Design Guidelines
- Use high contrast colors for readability
- Maintain consistent styling across all callouts
- Position callouts to avoid obscuring key diagram elements
- Size callouts proportionally to content importance

## Pacing Formula

### Base Timing Calculation
**Per Step Duration** = Reveal Time + Reading Time + Transition Time
- **Reveal Time**: 500ms for callout/element appearance
- **Reading Time**: 2000ms per line of text content
- **Transition Time**: 300ms for smooth progression

### Total Animation Length
**Total Duration** = Sum of all steps + 1000ms buffer + camera movements

### Reading Time Guidelines
- Simple concepts: 2 seconds per line
- Technical terms: 3 seconds per line  
- Complex relationships: 4 seconds per line

## Animation Sequence Structure

### Standard Pattern
1. **Base Diagram** (0-1500ms): Core visual elements appear
2. **Step 1 Introduction** (1500-2500ms): First callout slides in, arrow draws
3. **Step 1 Reading Pause** (2500-4500ms): Allow comprehension time
4. **Step 2 Introduction** (4500-5500ms): Second callout appears
5. **Step 2 Reading Pause** (5500-8500ms): Reading and processing time
6. **Continue Pattern**: Repeat for remaining steps

### Transition Timing
- Callout slide-in: 500ms ease-out
- Arrow draw-on: 300ms linear
- Highlight fade-in: 200ms ease-in-out
- Camera movements: 800ms ease-in-out

## Camera Focus Strategy

### Progressive Zoom Pattern
- **Overview Shot**: Start with full diagram context
- **Detail Focus**: Zoom to specific area being explained
- **Context Return**: Pan back to show relationship to whole
- **Final Overview**: End with complete understanding view

### Focus Timing
- Zoom in: 800ms before step explanation
- Hold focus: During entire step explanation
- Zoom out: 600ms after step completion
- Pan movements: 1000ms for smooth transitions

## Complete Example: "How HTTP Request Works"

This example demonstrates a 4-step explanation with full JSON structure:

```json
{
  "elements": [
    {
      "id": "browser",
      "type": "rectangle",
      "x": 100, "y": 200,
      "width": 120, "height": 80,
      "strokeColor": "#4A90E2",
      "backgroundColor": "#E8F4FD",
      "label": {
        "text": "Web Browser",
        "fontSize": 14
      }
    },
    {
      "id": "server",
      "type": "rectangle", 
      "x": 600, "y": 200,
      "width": 120, "height": 80,
      "strokeColor": "#7ED321",
      "backgroundColor": "#F0F9E8",
      "label": {
        "text": "Web Server",
        "fontSize": 14
      }
    },
    {
      "id": "request-arrow",
      "type": "arrow",
      "points": [[220, 230], [600, 230]],
      "strokeColor": "#F5A623",
      "strokeWidth": 3,
      "label": {
        "text": "HTTP Request",
        "fontSize": 12
      }
    },
    {
      "id": "callout-1",
      "type": "rectangle",
      "x": 50, "y": 50,
      "width": 200, "height": 80,
      "strokeColor": "#BD10E0",
      "backgroundColor": "#FFFFFF",
      "label": {
        "text": "1. User types URL\nBrowser prepares request",
        "fontSize": 12
      }
    }
  ],
  "animations": [
    {
      "id": "base-setup",
      "keyframes": [
        {
          "time": 0,
          "elements": {
            "browser": {"opacity": 0},
            "server": {"opacity": 0}
          }
        },
        {
          "time": 1500,
          "elements": {
            "browser": {"opacity": 1},
            "server": {"opacity": 1}
          }
        }
      ]
    },
    {
      "id": "step-1-explanation",
      "keyframes": [
        {
          "time": 1500,
          "elements": {
            "callout-1": {"opacity": 0, "x": 20}
          }
        },
        {
          "time": 2000,
          "elements": {
            "callout-1": {"opacity": 1, "x": 50}
          }
        }
      ]
    }
  ],
  "camera": [
    {
      "time": 0,
      "x": 400, "y": 200,
      "zoom": 0.8
    },
    {
      "time": 1500,
      "x": 200, "y": 150,
      "zoom": 1.2
    }
  ],
  "duration": 12000
}
```

## Quality Checklist

Before finalizing any explainer animation:

### Content Clarity
- [ ] Each step introduces exactly one concept
- [ ] Steps follow logical progression
- [ ] Technical terms are explained when introduced
- [ ] Examples support abstract concepts

### Visual Design
- [ ] High contrast for all text elements
- [ ] Consistent color coding throughout
- [ ] Clear visual hierarchy established
- [ ] No critical information is obscured

### Timing and Flow
- [ ] Adequate reading time for each text element
- [ ] Smooth transitions between steps
- [ ] Camera movements enhance rather than distract
- [ ] Overall pacing feels natural and unhurried

### Educational Value
- [ ] Builds understanding progressively
- [ ] Connects new concepts to familiar ones
- [ ] Provides sufficient context for comprehension
- [ ] Ends with clear takeaway or summary

## Advanced Techniques

### Staggered Reveals
Use slight delays between related elements for emphasis:
```json
{
  "time": 3000,
  "elements": {
    "element-1": {"opacity": 1},
    "element-2": {"opacity": 1, "delay": 200},
    "element-3": {"opacity": 1, "delay": 400}
  }
}
```

### Contextual Highlighting
Fade background elements while emphasizing current focus:
```json
{
  "background-elements": {"opacity": 0.3},
  "current-focus": {"opacity": 1, "strokeWidth": 3}
}
```

### Progressive Drawing
Build complex diagrams element by element:
```json
{
  "draw-sequence": [
    {"element": "foundation", "time": 1000},
    {"element": "layer-1", "time": 2000},
    {"element": "layer-2", "time": 3000}
  ]
}
```

Remember: The goal is not just to show information, but to facilitate genuine understanding through thoughtful visual storytelling.