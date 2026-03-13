# Timeline Animation Recipes

## 1. Progressive Left-to-Right Reveal

**Pattern:** Timeline axis draws first, then milestones appear sequentially with bounce effect.

```json
{
  "action": "add_keyframes_batch",
  "keyframes": [
    {
      "element": "main-axis",
      "property": "drawProgress",
      "from": 0,
      "to": 1,
      "duration": 1800,
      "easing": "ease-out",
      "delay": 0
    },
    {
      "element": "milestone-1",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 300,
      "delay": 2000
    },
    {
      "element": "milestone-1",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 2000
    },
    {
      "element": "milestone-1",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 2000
    },
    {
      "element": "milestone-2",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 300,
      "delay": 2500
    },
    {
      "element": "milestone-2",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 2500
    },
    {
      "element": "milestone-2",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 2500
    },
    {
      "element": "milestone-3",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 300,
      "delay": 3000
    },
    {
      "element": "milestone-3",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 3000
    },
    {
      "element": "milestone-3",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 3000
    }
  ]
}
```

## 2. Phase-by-Phase Revelation

**Pattern:** Each project phase appears as a block, then individual milestones within that phase animate in.

```json
{
  "action": "add_keyframes_batch",
  "keyframes": [
    {
      "element": "phase-1-block",
      "property": "opacity",
      "from": 0,
      "to": 0.6,
      "duration": 800,
      "easing": "ease-in-out",
      "delay": 0
    },
    {
      "element": "phase-1-block",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 800,
      "easing": "ease-out",
      "delay": 0
    },
    {
      "element": "phase-1-milestone-1",
      "property": "y",
      "from": -50,
      "to": 200,
      "duration": 600,
      "easing": "easeOutBounce",
      "delay": 800
    },
    {
      "element": "phase-1-milestone-2",
      "property": "y",
      "from": -50,
      "to": 200,
      "duration": 600,
      "easing": "easeOutBounce",
      "delay": 1100
    },
    {
      "element": "phase-2-block",
      "property": "opacity",
      "from": 0,
      "to": 0.6,
      "duration": 800,
      "easing": "ease-in-out",
      "delay": 1400
    },
    {
      "element": "phase-2-block",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 800,
      "easing": "ease-out",
      "delay": 1400
    },
    {
      "element": "phase-2-milestone-1",
      "property": "y",
      "from": -50,
      "to": 350,
      "duration": 600,
      "easing": "easeOutBounce",
      "delay": 2200
    },
    {
      "element": "phase-2-milestone-2",
      "property": "y",
      "from": -50,
      "to": 350,
      "duration": 600,
      "easing": "easeOutBounce",
      "delay": 2500
    }
  ]
}
```

## 3. Camera Scroll for Wide Timelines

**Pattern:** Timeline is wider than viewport. Camera starts left and pans right to reveal the full timeline, with milestones appearing as they come into view.

```json
{
  "action": "add_keyframes_batch",
  "keyframes": [
    {
      "element": "main-axis",
      "property": "drawProgress",
      "from": 0,
      "to": 1,
      "duration": 2000,
      "easing": "ease-out",
      "delay": 0
    },
    {
      "element": "camera",
      "property": "x",
      "from": 0,
      "to": -400,
      "duration": 8000,
      "easing": "ease-in-out",
      "delay": 2000
    },
    {
      "element": "milestone-1",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 400,
      "delay": 2500
    },
    {
      "element": "milestone-1",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 2500
    },
    {
      "element": "milestone-1",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 2500
    },
    {
      "element": "milestone-2",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 400,
      "delay": 4000
    },
    {
      "element": "milestone-2",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 4000
    },
    {
      "element": "milestone-2",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 4000
    },
    {
      "element": "milestone-3",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 400,
      "delay": 5500
    },
    {
      "element": "milestone-3",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 5500
    },
    {
      "element": "milestone-3",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 5500
    },
    {
      "element": "milestone-4",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 400,
      "delay": 7000
    },
    {
      "element": "milestone-4",
      "property": "scaleX",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 7000
    },
    {
      "element": "milestone-4",
      "property": "scaleY",
      "from": 0,
      "to": 1,
      "duration": 500,
      "easing": "easeOutBack",
      "delay": 7000
    }
  ]
}
```

## 4. Milestone Popup Sequence

**Pattern:** All milestones start small and grow to full size with staggered timing and different easing effects.

```json
{
  "action": "add_keyframes_batch",
  "keyframes": [
    {
      "element": "milestone-1",
      "property": "scaleX",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutQuart",
      "delay": 500
    },
    {
      "element": "milestone-1",
      "property": "scaleY",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutQuart",
      "delay": 500
    },
    {
      "element": "milestone-1",
      "property": "scaleX",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 900
    },
    {
      "element": "milestone-1",
      "property": "scaleY",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 900
    },
    {
      "element": "milestone-2",
      "property": "scaleX",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 800
    },
    {
      "element": "milestone-2",
      "property": "scaleY",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutBack",
      "delay": 800
    },
    {
      "element": "milestone-2",
      "property": "scaleX",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 1200
    },
    {
      "element": "milestone-2",
      "property": "scaleY",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 1200
    },
    {
      "element": "milestone-3",
      "property": "scaleX",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutElastic",
      "delay": 1100
    },
    {
      "element": "milestone-3",
      "property": "scaleY",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutElastic",
      "delay": 1100
    },
    {
      "element": "milestone-3",
      "property": "scaleX",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 1500
    },
    {
      "element": "milestone-3",
      "property": "scaleY",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 1500
    },
    {
      "element": "milestone-4",
      "property": "scaleX",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutBounce",
      "delay": 1400
    },
    {
      "element": "milestone-4",
      "property": "scaleY",
      "from": 0.1,
      "to": 1.2,
      "duration": 400,
      "easing": "easeOutBounce",
      "delay": 1400
    },
    {
      "element": "milestone-4",
      "property": "scaleX",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 1800
    },
    {
      "element": "milestone-4",
      "property": "scaleY",
      "from": 1.2,
      "to": 1,
      "duration": 200,
      "easing": "easeInQuart",
      "delay": 1800
    }
  ]
}
```

## Animation Timing Guidelines

**Sequence Structure:**
1. **Setup (0-500ms)**: Initial state, any background elements
2. **Foundation (500-2000ms)**: Main timeline axis, grid, or structure
3. **Content reveal (2000ms+)**: Milestones, events, labels with staggering
4. **Polish (final 20%)**: Hover states, final adjustments, current indicator

**Stagger Timing:**
- **Quick sequence**: 200-300ms between elements
- **Standard sequence**: 400-500ms between elements  
- **Dramatic sequence**: 800-1000ms between elements

**Easing by Element:**
- **Axes/lines**: `ease-out` for drawing effect
- **Milestone markers**: `easeOutBack` for bounce effect
- **Event cards**: `easeOutQuart` for smooth appearance
- **Phase blocks**: `ease-in-out` for gradual reveal
- **Camera movement**: `ease-in-out` for smooth panning

**Duration Guidelines:**
- **Line drawing**: 1500-2000ms
- **Element pop-in**: 400-600ms
- **Scale animations**: 300-500ms
- **Camera movement**: 6000-10000ms (for full timeline pan)
- **Opacity transitions**: 200-400ms