# Mind Map Animation Recipes

## 1. Center-Out Burst (Classic)
The standard mind map reveal: center pops in, then branches slide out radially.

### Timing Structure
```
0ms     Center pop-in (scale 0→1, easeOutBack)
600ms   First primary branch slides in
900ms   Second primary branch slides in  
1200ms  Third primary branch slides in
1800ms  All sub-branches fade in by group
```

### Implementation
```json
{
  "keyframes": [
    {
      "timestamp": 0,
      "elements": {
        "center": {"scale": 0, "opacity": 0}
      }
    },
    {
      "timestamp": 600, 
      "elements": {
        "center": {"scale": 1, "opacity": 100}
      },
      "ease": "easeOutBack"
    },
    {
      "timestamp": 600,
      "elements": {
        "branch1": {"x": "centerX", "opacity": 0}
      }
    },
    {
      "timestamp": 900,
      "elements": {
        "branch1": {"x": "finalX", "opacity": 100}
      }
    }
  ]
}
```

### Best For
- Initial concept presentation
- General brainstorming reveals
- Educational content
- Feature introductions

## 2. Branch-by-Branch Growth
Builds the mind map one complete branch at a time.

### Timing Structure
```
0ms     Center appears
500ms   Branch 1 + all its children
1500ms  Branch 2 + all its children
2500ms  Branch 3 + all its children
3500ms  Branch 4 + all its children
```

### Animation Pattern
Each branch sequence:
1. Main branch slides in (300ms)
2. Connector draws (200ms)  
3. Sub-branches fade in staggered (400ms)
4. Brief pause before next branch (200ms)

### Best For
- Step-by-step explanations
- Sequential topic exploration  
- Tutorial-style presentations
- Complex hierarchies

## 3. Level-by-Level Reveal
Reveals all nodes at the same hierarchy level simultaneously.

### Timing Structure
```
0ms     All center nodes
800ms   All primary branches  
1600ms  All secondary branches
2400ms  All tertiary branches
```

### Wave Effect
```json
{
  "keyframes": [
    {
      "timestamp": 800,
      "elements": {
        "branch1": {"opacity": 0, "scale": 0},
        "branch2": {"opacity": 0, "scale": 0}, 
        "branch3": {"opacity": 0, "scale": 0}
      }
    },
    {
      "timestamp": 1200,
      "elements": {
        "branch1": {"opacity": 100, "scale": 1}
      }
    },
    {
      "timestamp": 1300, 
      "elements": {
        "branch2": {"opacity": 100, "scale": 1}
      }
    },
    {
      "timestamp": 1400,
      "elements": {
        "branch3": {"opacity": 100, "scale": 1}
      }
    }
  ]
}
```

### Best For
- Showing information hierarchy
- Comparative presentations
- Structured overviews
- Academic content

## 4. Zoom-to-Branch Focus
Highlights one branch by dimming others and zooming in.

### Camera Animation
```json
{
  "keyframes": [
    {
      "timestamp": 0,
      "camera": {"x": 800, "y": 500, "zoom": 1}
    },
    {
      "timestamp": 1000,
      "camera": {"x": 1100, "y": 400, "zoom": 1.5}
    },
    {
      "timestamp": 1000,
      "elements": {
        "otherBranches": {"opacity": 30}
      }
    },
    {
      "timestamp": 1200,
      "elements": {
        "targetBranch": {"strokeWidth": 4, "opacity": 100}
      }
    }
  ]
}
```

### Focus Sequence
1. Fade non-target elements to 30% opacity
2. Pan camera to focus on target branch  
3. Zoom in slightly (1.2x-1.5x)
4. Highlight target with thicker stroke
5. Reveal sub-elements of focused branch

### Best For
- Detailed explanations
- Interactive presentations
- Q&A sessions
- Deep dives into specific topics

## Advanced Animation Techniques

### Elastic Bounce Entrance
```json
{
  "ease": "easeOutElastic",
  "duration": 800
}
```

### Staggered Reveals
```javascript
// Calculate stagger delay based on distance from center
const staggerDelay = distanceFromCenter * 2; // 2ms per pixel
const startTime = baseTime + staggerDelay;
```

### Connector Drawing Animation
```json
{
  "keyframes": [
    {
      "timestamp": 0,
      "elements": {
        "connector": {"strokeDasharray": "1000", "strokeDashoffset": "1000"}
      }
    },
    {
      "timestamp": 500,
      "elements": {
        "connector": {"strokeDashoffset": "0"}
      }
    }
  ]
}
```

### Pulse Emphasis
```json
{
  "keyframes": [
    {"timestamp": 0, "elements": {"node": {"scale": 1}}},
    {"timestamp": 200, "elements": {"node": {"scale": 1.1}}},
    {"timestamp": 400, "elements": {"node": {"scale": 1}}}
  ]
}
```

## Performance Guidelines

### Timing Best Practices
- **Total duration**: 3-6 seconds for complete reveal
- **Minimum gap**: 100ms between elements
- **Stagger increment**: 200-300ms for similar elements
- **Pause for impact**: 500ms after key reveals

### Easing Functions
- **easeOutBack**: Great for pop-ins, creates overshoot
- **easeOutElastic**: Bouncy, attention-grabbing
- **easeInOutCubic**: Smooth, professional
- **linear**: Use sparingly, feels mechanical

### Element Limits
- **Simultaneous animations**: Max 8-10 elements
- **Complex paths**: Limit to 3-4 moving connectors  
- **Camera movements**: One at a time
- **Particle effects**: Use sparingly

## Animation Debugging

### Common Issues
1. **Overlapping timelines** → Elements jumping unexpectedly
2. **Missing initial states** → Elements visible before animation
3. **Inconsistent easing** → Jerky movement
4. **Too fast transitions** → Users can't follow

### Testing Checklist
- [ ] All elements start in correct initial state
- [ ] No gaps in timeline continuity
- [ ] Animation speed feels natural
- [ ] Focus elements are clearly emphasized
- [ ] Performance is smooth on target devices