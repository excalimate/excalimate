# Stagger Patterns

Multi-element reveal patterns for the Excalimate MCP server. Staggering means revealing elements one after another with a consistent delay between them.

---

## The `create_sequence` Shortcut

The fastest way to stagger reveals:

```
create_sequence({
  elementIds: ["e1","e2","e3","e4","e5"],
  property: "opacity",
  startTime: 0,
  delay: 400,
  duration: 600
})
```

**Parameters:**
- `elementIds` — array of element IDs in reveal order (order matters!)
- `property` — the property to animate (default: `"opacity"`)
- `startTime` — when the first element starts animating (ms)
- `delay` — gap between each element's start time (ms)
- `duration` — how long each individual animation lasts (ms)

**Generated timeline for the example above:**
| Element | Start | End |
|---------|-------|-----|
| e1 | 0ms | 600ms |
| e2 | 400ms | 1000ms |
| e3 | 800ms | 1400ms |
| e4 | 1200ms | 1800ms |
| e5 | 1600ms | 2200ms |

Total animation: 2200ms. Set clip range to 2700ms.

---

## Manual Stagger

For more control, calculate offsets yourself. This lets you combine multiple properties and vary easing per element.

### Left-to-Right Reveal

Order elements by their X position on canvas. Commonly used for horizontal layouts like pipelines.

```json
[
  {"targetId":"left","property":"opacity","time":0,"value":0},
  {"targetId":"left","property":"opacity","time":500,"value":1,"easing":"easeOut"},
  {"targetId":"left","property":"translateX","time":0,"value":-100},
  {"targetId":"left","property":"translateX","time":500,"value":0,"easing":"easeOutCubic"},

  {"targetId":"center","property":"opacity","time":0,"value":0},
  {"targetId":"center","property":"opacity","time":400,"value":0},
  {"targetId":"center","property":"opacity","time":900,"value":1,"easing":"easeOut"},
  {"targetId":"center","property":"translateX","time":400,"value":-100},
  {"targetId":"center","property":"translateX","time":900,"value":0,"easing":"easeOutCubic"},

  {"targetId":"right","property":"opacity","time":0,"value":0},
  {"targetId":"right","property":"opacity","time":800,"value":0},
  {"targetId":"right","property":"opacity","time":1300,"value":1,"easing":"easeOut"},
  {"targetId":"right","property":"translateX","time":800,"value":-100},
  {"targetId":"right","property":"translateX","time":1300,"value":0,"easing":"easeOutCubic"}
]
```

### Top-to-Bottom Reveal

Order elements by their Y position. Commonly used for lists, stacks, and vertical layouts.

```json
[
  {"targetId":"top","property":"opacity","time":0,"value":0},
  {"targetId":"top","property":"opacity","time":500,"value":1,"easing":"easeOut"},
  {"targetId":"top","property":"translateY","time":0,"value":-80},
  {"targetId":"top","property":"translateY","time":500,"value":0,"easing":"easeOutCubic"},

  {"targetId":"middle","property":"opacity","time":0,"value":0},
  {"targetId":"middle","property":"opacity","time":350,"value":0},
  {"targetId":"middle","property":"opacity","time":850,"value":1,"easing":"easeOut"},
  {"targetId":"middle","property":"translateY","time":350,"value":-80},
  {"targetId":"middle","property":"translateY","time":850,"value":0,"easing":"easeOutCubic"},

  {"targetId":"bottom","property":"opacity","time":0,"value":0},
  {"targetId":"bottom","property":"opacity","time":700,"value":0},
  {"targetId":"bottom","property":"opacity","time":1200,"value":1,"easing":"easeOut"},
  {"targetId":"bottom","property":"translateY","time":700,"value":-80},
  {"targetId":"bottom","property":"translateY","time":1200,"value":0,"easing":"easeOutCubic"}
]
```

### Center-Out Reveal

Order elements by distance from the center — center element first, then expanding outward. Creates a radial/burst effect.

```json
[
  {"targetId":"center","property":"opacity","time":0,"value":0},
  {"targetId":"center","property":"opacity","time":400,"value":1,"easing":"easeOut"},
  {"targetId":"center","property":"scaleX","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"center","property":"scaleX","time":400,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"center","property":"scaleY","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"center","property":"scaleY","time":400,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},

  {"targetId":"inner1","property":"opacity","time":0,"value":0},
  {"targetId":"inner1","property":"opacity","time":300,"value":0},
  {"targetId":"inner1","property":"opacity","time":700,"value":1,"easing":"easeOut"},
  {"targetId":"inner2","property":"opacity","time":0,"value":0},
  {"targetId":"inner2","property":"opacity","time":300,"value":0},
  {"targetId":"inner2","property":"opacity","time":700,"value":1,"easing":"easeOut"},

  {"targetId":"outer1","property":"opacity","time":0,"value":0},
  {"targetId":"outer1","property":"opacity","time":600,"value":0},
  {"targetId":"outer1","property":"opacity","time":1000,"value":1,"easing":"easeOut"},
  {"targetId":"outer2","property":"opacity","time":0,"value":0},
  {"targetId":"outer2","property":"opacity","time":600,"value":0},
  {"targetId":"outer2","property":"opacity","time":1000,"value":1,"easing":"easeOut"},
  {"targetId":"outer3","property":"opacity","time":0,"value":0},
  {"targetId":"outer3","property":"opacity","time":600,"value":0},
  {"targetId":"outer3","property":"opacity","time":1000,"value":1,"easing":"easeOut"},
  {"targetId":"outer4","property":"opacity","time":0,"value":0},
  {"targetId":"outer4","property":"opacity","time":600,"value":0},
  {"targetId":"outer4","property":"opacity","time":1000,"value":1,"easing":"easeOut"}
]
```

Elements in the same ring (same distance from center) reveal simultaneously.

### Random Stagger

Shuffle the element order for an organic, less mechanical feel. Best for decorative elements or backgrounds.

```json
[
  {"targetId":"el_c","property":"opacity","time":0,"value":0},
  {"targetId":"el_c","property":"opacity","time":400,"value":1,"easing":"easeOut"},

  {"targetId":"el_a","property":"opacity","time":0,"value":0},
  {"targetId":"el_a","property":"opacity","time":250,"value":0},
  {"targetId":"el_a","property":"opacity","time":650,"value":1,"easing":"easeOut"},

  {"targetId":"el_e","property":"opacity","time":0,"value":0},
  {"targetId":"el_e","property":"opacity","time":500,"value":0},
  {"targetId":"el_e","property":"opacity","time":900,"value":1,"easing":"easeOut"},

  {"targetId":"el_b","property":"opacity","time":0,"value":0},
  {"targetId":"el_b","property":"opacity","time":750,"value":0},
  {"targetId":"el_b","property":"opacity","time":1150,"value":1,"easing":"easeOut"},

  {"targetId":"el_d","property":"opacity","time":0,"value":0},
  {"targetId":"el_d","property":"opacity","time":1000,"value":0},
  {"targetId":"el_d","property":"opacity","time":1400,"value":1,"easing":"easeOut"}
]
```

Note the non-alphabetical element order. Use a shorter delay (200–300ms) for random stagger to create a "popcorn" feel.

---

## Wave Pattern

Combine `create_sequence` for opacity with manual `translateY` keyframes for a wave motion.

First, use `create_sequence` for the opacity stagger:
```
create_sequence({
  elementIds: ["w1","w2","w3","w4","w5"],
  property: "opacity",
  startTime: 0,
  delay: 200,
  duration: 400
})
```

Then, add manual translateY keyframes for the wave bounce:
```json
[
  {"targetId":"w1","property":"translateY","time":0,"value":-40},
  {"targetId":"w1","property":"translateY","time":400,"value":0,"easing":"easeOutBounce"},

  {"targetId":"w2","property":"translateY","time":200,"value":-40},
  {"targetId":"w2","property":"translateY","time":600,"value":0,"easing":"easeOutBounce"},

  {"targetId":"w3","property":"translateY","time":400,"value":-40},
  {"targetId":"w3","property":"translateY","time":800,"value":0,"easing":"easeOutBounce"},

  {"targetId":"w4","property":"translateY","time":600,"value":-40},
  {"targetId":"w4","property":"translateY","time":1000,"value":0,"easing":"easeOutBounce"},

  {"targetId":"w5","property":"translateY","time":800,"value":-40},
  {"targetId":"w5","property":"translateY","time":1200,"value":0,"easing":"easeOutBounce"}
]
```

The `translateY` stagger uses the same 200ms delay as the opacity sequence, keeping both in sync.

---

## Delay Guidelines

| Scenario | Recommended Delay | Duration |
|----------|------------------|----------|
| Fast list reveal | 150–250ms | 300–400ms |
| Standard stagger | 300–500ms | 500–700ms |
| Deliberate pace | 600–1000ms | 500–800ms |
| Presentation bullets | 400–600ms | 400–600ms |
| Icon grid | 100–200ms | 300–500ms |
| Architecture nodes | 500–800ms | 400–600ms |

**Rule of thumb:** `delay` should be 40–70% of `duration` for overlapping reveals. If `delay >= duration`, elements appear strictly one after another with no overlap.

---

## Combining Stagger with Other Patterns

### Stagger + Arrow Draw

Reveal nodes in sequence, drawing arrows between them:

```json
[
  {"targetId":"n1","property":"opacity","time":0,"value":0},
  {"targetId":"n1","property":"opacity","time":500,"value":1,"easing":"easeOut"},

  {"targetId":"a1","property":"opacity","time":500,"value":0},
  {"targetId":"a1","property":"opacity","time":500,"value":1},
  {"targetId":"a1","property":"drawProgress","time":500,"value":0},
  {"targetId":"a1","property":"drawProgress","time":1200,"value":1,"easing":"easeInOut"},

  {"targetId":"n2","property":"opacity","time":0,"value":0},
  {"targetId":"n2","property":"opacity","time":1200,"value":0},
  {"targetId":"n2","property":"opacity","time":1700,"value":1,"easing":"easeOut"},

  {"targetId":"a2","property":"opacity","time":1700,"value":0},
  {"targetId":"a2","property":"opacity","time":1700,"value":1},
  {"targetId":"a2","property":"drawProgress","time":1700,"value":0},
  {"targetId":"a2","property":"drawProgress","time":2400,"value":1,"easing":"easeInOut"},

  {"targetId":"n3","property":"opacity","time":0,"value":0},
  {"targetId":"n3","property":"opacity","time":2400,"value":0},
  {"targetId":"n3","property":"opacity","time":2900,"value":1,"easing":"easeOut"}
]
```

### Stagger + Camera

Reveal elements in batches, then pan camera to next batch:

1. Batch 1 elements: stagger reveal 0–1500ms
2. Camera holds 1500–2000ms
3. Camera pans 2000–3500ms
4. Batch 2 elements: stagger reveal 3500–5000ms
5. Set clip range with 500ms padding after last keyframe
