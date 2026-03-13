# Narrative Patterns for Animated Presentations

Proven storytelling structures with timing guidelines for different presentation types.

## 1. Problem→Solution→Benefits Pattern
**Best for**: Product pitches, business proposals, technical solutions
**Total duration**: 15-20 seconds (3-4 scenes)

### Structure & Timing
```
Scene 1: Problem Setup (0-5000ms)
- State the pain point clearly
- Use statistics or examples
- Build tension/urgency

Scene 2: Solution Reveal (5000-10000ms)  
- Introduce your solution
- Show how it addresses the problem
- Include key features/mechanisms

Scene 3: Benefits & Impact (10000-15000ms)
- Quantified outcomes
- Stakeholder benefits  
- Call to action

Optional Scene 4: Next Steps (15000-20000ms)
- Timeline or roadmap
- How to get started
- Contact information
```

### Example Implementation
```javascript
// Scene layout: horizontal strip
// Problem (x=0), Solution (x=2000), Benefits (x=4000)

create_scene([
  // Problem scene
  { type: "text", text: "73% of teams struggle with...", x: 800, y: 300, fontSize: 36 },
  { type: "chart", x: 400, y: 500, width: 800, height: 300, data: "declining-metrics" },
  
  // Solution scene  
  { type: "text", text: "Introducing ProductX", x: 2800, y: 200, fontSize: 48, bold: true },
  { type: "flowchart", x: 2200, y: 400, width: 1200, height: 400 },
  
  // Benefits scene
  { type: "text", text: "Results in 30 days:", x: 4800, y: 250, fontSize: 32 },
  { type: "bullet-list", x: 4400, y: 400, items: ["50% faster", "90% accuracy", "$2M savings"] }
])
```

## 2. Step-by-Step Tutorial Pattern  
**Best for**: How-to guides, process explanations, educational content
**Total duration**: 20-30 seconds (4-6 scenes)

### Structure & Timing
```
Scene 1: Overview/Goal (0-4000ms)
- What we'll accomplish
- Why it matters
- Prerequisites

Scene 2-N: Individual Steps (4000ms intervals)
- One clear action per scene
- Visual demonstration
- Key tips or warnings

Final Scene: Summary/Next Steps
- Recap of process
- Common troubleshooting
- Advanced techniques
```

### Timing Formula
```
Total scenes = steps + 2 (overview + summary)
Per scene = 3000-5000ms
Total duration = scenes × 4000ms average

Example: 5-step process
- 7 total scenes × 4000ms = 28000ms (28 seconds)
```

## 3. Before/After Comparison Pattern
**Best for**: Transformations, improvements, case studies  
**Total duration**: 12-18 seconds (3 scenes)

### Structure & Timing
```
Scene 1: Before State (0-5000ms)
- Current problematic situation  
- Pain points and inefficiencies
- Stakeholder frustration

Scene 2: Transformation Process (5000-10000ms)
- What changed
- Key interventions
- Implementation timeline

Scene 3: After State (10000-15000ms)  
- Improved outcomes
- Happy stakeholders
- Measured improvements
```

### Visual Techniques
```javascript
// Split-screen comparison
create_scene([
  // Before (left side of scene)
  { type: "rectangle", x: 200, y: 200, width: 600, height: 500, 
    fillColor: "#ffebee", label: "Before: Chaotic Process" },
  
  // After (right side of scene)  
  { type: "rectangle", x: 1000, y: 200, width: 600, height: 500,
    fillColor: "#e8f5e8", label: "After: Streamlined Flow" },
    
  // Transformation arrow
  { type: "arrow", startX: 800, startY: 450, endX: 1000, endY: 450,
    strokeWidth: 4, color: "#4caf50" }
])
```

## 4. Story Arc Pattern (Intro→Climax→Resolution)
**Best for**: Narrative presentations, case studies, vision statements
**Total duration**: 25-35 seconds (5-7 scenes)

### Structure & Timing  
```
Scene 1: Setup/Context (0-5000ms)
- Setting the stage
- Key characters/stakeholders
- Initial situation

Scene 2: Rising Action (5000-10000ms)
- Challenges emerge
- Stakes get higher
- Tension builds

Scene 3: Climax (10000-15000ms)
- Critical moment
- Major decision point
- Peak drama/significance

Scene 4: Falling Action (15000-20000ms)
- Consequences unfold
- Resolution begins
- New equilibrium

Scene 5: Resolution (20000-25000ms)
- Final outcome
- Lessons learned  
- Future implications

Optional Scene 6-7: Epilogue (25000-30000ms)
- Long-term impact
- Call to action
- Vision for future
```

### Emotional Pacing
```
Tension curve:
Low (setup) → Rising → Peak (climax) → Falling → Resolution

Animation intensity should match:
- Slow, steady reveals during setup
- Faster, more dramatic during climax
- Smooth, satisfying during resolution
```

## Universal Timing Guidelines

### Scene Duration Standards
```
Quick/Energetic Pace: 3000-4000ms per scene
Standard Professional: 4000-5000ms per scene  
Detailed/Educational: 5000-8000ms per scene
Dramatic/Cinematic: 6000-10000ms per scene
```

### Element Reveal Timing Within Scenes
```
Title/Header: First 500-1000ms
Supporting visuals: 1000-2000ms  
Details/annotations: 1500-3000ms
Reading pause: Final 1000-2000ms
```

### Transition Buffer Times
```
Between scenes: 200-500ms
Between major sections: 500-1000ms
Before finale: 1000-1500ms
```

## Pattern Selection Guide

**Choose Problem→Solution→Benefits when**:
- Selling or proposing something
- Clear pain point exists
- Quantifiable improvements available

**Choose Step-by-Step when**:
- Teaching a process
- Complex procedures need breakdown
- Audience needs to replicate actions

**Choose Before/After when**:
- Showcasing transformations
- Dramatic improvements occurred  
- Visual comparison is compelling

**Choose Story Arc when**:
- Rich narrative context exists
- Emotional engagement needed
- Complex journey to communicate
- Building vision or inspiring action

Remember: **Always end with forward momentum** - next steps, call to action, or inspiring vision of the future.