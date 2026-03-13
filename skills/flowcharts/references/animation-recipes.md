# Animation Recipes Reference

Complete keyframe animation patterns for common flowchart scenarios.

## 1. Sequential Path-Following Animation

Standard flow animation that reveals elements in logical order: node → arrow → node → arrow...

### Pattern Description
- Elements start invisible (opacity: 0)
- Each element fades in over 400ms
- Arrows draw on using strokeDashoffset animation 
- 600ms gap between each reveal for readable pacing
- Total duration scales with number of elements

### Complete Keyframes JSON
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
      "elementIds": ["step1", "step1-label"],
      "property": "opacity", 
      "keyframes": [
        {"time": 1000, "value": 0},
        {"time": 1400, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow2"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 1400, "value": 100},
        {"time": 2000, "value": 0}
      ]
    },
    {
      "elementIds": ["step2", "step2-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 2000, "value": 0},
        {"time": 2400, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow3"],
      "property": "strokeDashoffset", 
      "keyframes": [
        {"time": 2400, "value": 100},
        {"time": 3000, "value": 0}
      ]
    },
    {
      "elementIds": ["step3", "step3-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 3000, "value": 0},
        {"time": 3400, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow4"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 3400, "value": 100},
        {"time": 4000, "value": 0}
      ]
    },
    {
      "elementIds": ["end", "end-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 4000, "value": 0},
        {"time": 4400, "value": 1}
      ]
    }
  ]
}
```

## 2. Decision Highlight Animation

Special animation for decision points with pulse effect and branch revelation.

### Pattern Description
- Normal flow up to decision point
- Decision diamond pulses with scale animation (1 → 1.05 → 1)
- Brief pause for emphasis
- Both branch arrows draw simultaneously
- Both outcome boxes reveal together
- Convergence point animates last

### Complete Keyframes JSON
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
      "elementIds": ["input", "input-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 1000, "value": 0},
        {"time": 1400, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow2"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 1400, "value": 100},
        {"time": 2000, "value": 0}
      ]
    },
    {
      "elementIds": ["decision", "decision-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 2000, "value": 0},
        {"time": 2400, "value": 1}
      ]
    },
    {
      "elementIds": ["decision"],
      "property": "scale",
      "keyframes": [
        {"time": 2400, "value": 1},
        {"time": 2700, "value": 1.05},
        {"time": 3000, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow-yes", "arrow-no"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 3200, "value": 100},
        {"time": 3800, "value": 0}
      ]
    },
    {
      "elementIds": ["process-yes", "process-yes-label", "process-no", "process-no-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 3800, "value": 0},
        {"time": 4200, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow3", "arrow4"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 4200, "value": 100},
        {"time": 4800, "value": 0}
      ]
    },
    {
      "elementIds": ["connector"],
      "property": "opacity",
      "keyframes": [
        {"time": 4800, "value": 0},
        {"time": 5000, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow5"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 5000, "value": 100},
        {"time": 5400, "value": 0}
      ]
    },
    {
      "elementIds": ["end", "end-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 5400, "value": 0},
        {"time": 5800, "value": 1}
      ]
    }
  ]
}
```

## 3. Parallel Branch Reveal

Animation for flows where multiple branches execute simultaneously.

### Pattern Description
- Main flow proceeds normally until branch point
- All branch paths animate simultaneously  
- Parallel processes revealed at same time
- Synchronization point waits for all branches
- Final convergence happens together

### Complete Keyframes JSON
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
      "elementIds": ["init", "init-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 600, "value": 0},
        {"time": 1000, "value": 1}
      ]
    },
    {
      "elementIds": ["fork", "fork-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 1200, "value": 0},
        {"time": 1600, "value": 1}
      ]
    },
    {
      "elementIds": ["branch-arrow1", "branch-arrow2", "branch-arrow3"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 1800, "value": 100},
        {"time": 2400, "value": 0}
      ]
    },
    {
      "elementIds": ["process-a", "process-a-label", "process-b", "process-b-label", "process-c", "process-c-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 2400, "value": 0},
        {"time": 2800, "value": 1}
      ]
    },
    {
      "elementIds": ["process-a", "process-b", "process-c"],
      "property": "scale",
      "keyframes": [
        {"time": 2800, "value": 0.8},
        {"time": 3200, "value": 1}
      ]
    },
    {
      "elementIds": ["sync-arrow1", "sync-arrow2", "sync-arrow3"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 3400, "value": 100},
        {"time": 4000, "value": 0}
      ]
    },
    {
      "elementIds": ["sync", "sync-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 4000, "value": 0},
        {"time": 4400, "value": 1}
      ]
    },
    {
      "elementIds": ["final-arrow"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 4600, "value": 100},
        {"time": 5000, "value": 0}
      ]
    },
    {
      "elementIds": ["end", "end-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 5000, "value": 0},
        {"time": 5400, "value": 1}
      ]
    }
  ]
}
```

## 4. Swimlane-by-Swimlane Reveal

Animation for swimlane diagrams that reveals one actor/lane at a time.

### Pattern Description
- Lane frames fade in first to establish context
- Elements within each lane animate as a group
- Cross-lane arrows animate when both connected elements are visible
- Progressive revelation from left to right (or actor by actor)
- Maintains logical flow sequence while showing lanes

### Complete Keyframes JSON
```json
{
  "keyframes": [
    {
      "elementIds": ["lane1-frame", "lane1-title"],
      "property": "opacity",
      "keyframes": [
        {"time": 0, "value": 0},
        {"time": 500, "value": 1}
      ]
    },
    {
      "elementIds": ["lane2-frame", "lane2-title"],
      "property": "opacity",
      "keyframes": [
        {"time": 300, "value": 0},
        {"time": 800, "value": 1}
      ]
    },
    {
      "elementIds": ["lane3-frame", "lane3-title"],
      "property": "opacity",
      "keyframes": [
        {"time": 600, "value": 0},
        {"time": 1100, "value": 1}
      ]
    },
    {
      "elementIds": ["start", "start-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 1200, "value": 0},
        {"time": 1600, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow1"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 1600, "value": 100},
        {"time": 2000, "value": 0}
      ]
    },
    {
      "elementIds": ["request", "request-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 2000, "value": 0},
        {"time": 2400, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow2"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 2600, "value": 100},
        {"time": 3200, "value": 0}
      ]
    },
    {
      "elementIds": ["validate", "validate-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 3200, "value": 0},
        {"time": 3600, "value": 1}
      ]
    },
    {
      "elementIds": ["validate"],
      "property": "strokeColor",
      "keyframes": [
        {"time": 3600, "value": "#1971c2"},
        {"time": 3900, "value": "#f08c00"},
        {"time": 4200, "value": "#1971c2"}
      ]
    },
    {
      "elementIds": ["arrow3"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 4400, "value": 100},
        {"time": 5000, "value": 0}
      ]
    },
    {
      "elementIds": ["review", "review-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 5000, "value": 0},
        {"time": 5400, "value": 1}
      ]
    },
    {
      "elementIds": ["review"],
      "property": "scale",
      "keyframes": [
        {"time": 5400, "value": 0.9},
        {"time": 5700, "value": 1.02},
        {"time": 6000, "value": 1}
      ]
    },
    {
      "elementIds": ["arrow4"],
      "property": "strokeDashoffset",
      "keyframes": [
        {"time": 6200, "value": 100},
        {"time": 6800, "value": 0}
      ]
    },
    {
      "elementIds": ["notify", "notify-label"],
      "property": "opacity",
      "keyframes": [
        {"time": 6800, "value": 0},
        {"time": 7200, "value": 1}
      ]
    },
    {
      "elementIds": ["notify"],
      "property": "backgroundColor",
      "keyframes": [
        {"time": 7200, "value": "#99e9f2"},
        {"time": 7500, "value": "#51cf66"},
        {"time": 7800, "value": "#99e9f2"}
      ]
    }
  ]
}
```

## Animation Timing Guidelines

### Standard Durations
- **Opacity Fade**: 400ms for smooth but quick reveal
- **Arrow Draw**: 600ms for visible connection animation
- **Scale Pulse**: 300ms each direction (600ms total)
- **Color Flash**: 300ms per color transition
- **Pause Between Elements**: 200-400ms for readability

### Timing Calculations
- **Base Start Time**: Previous element end time + pause
- **Sequential Flow**: 1000ms per element (400ms fade + 600ms arrow)
- **Parallel Elements**: Same start time, stagger by 100-200ms if needed
- **Emphasis Effects**: Add 600-800ms for pulses or flashes
- **Total Duration**: Plan for 4-8 seconds depending on complexity

### Property Guidelines
- **opacity**: 0 to 1 for reveal animations
- **strokeDashoffset**: 100 to 0 for arrow drawing
- **scale**: 1 to 1.05 to 1 for subtle pulse emphasis
- **strokeColor/backgroundColor**: For attention-grabbing state changes
- **x/y position**: For slide-in effects (use sparingly)

## Usage Tips

1. **Test Timing**: Always preview animations to ensure readable pacing
2. **Group Related Elements**: Animate labels with their containers
3. **Stagger Parallel Elements**: Small delays prevent visual chaos
4. **Use Emphasis Sparingly**: Scale/color effects only for key decision points
5. **Consider Total Duration**: Keep under 10 seconds for user attention
6. **Maintain Logical Flow**: Animation order should match process logic
7. **Provide Clear Ending**: Final element should clearly signal completion