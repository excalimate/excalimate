# Advanced Animation Patterns

Complex animation techniques for the Excalimate MCP server. Build on the 5 core patterns (fade, slide, pop, arrow draw, camera) for richer animations.

---

## Combined Transforms

Apply opacity + translate + scale simultaneously for a rich, cinematic entrance.

```json
[
  {"targetId":"hero","property":"opacity","time":0,"value":0},
  {"targetId":"hero","property":"opacity","time":400,"value":1,"easing":"easeOut"},

  {"targetId":"hero","property":"translateY","time":0,"value":60},
  {"targetId":"hero","property":"translateY","time":800,"value":0,"easing":"easeOutCubic"},

  {"targetId":"hero","property":"scaleX","time":0,"value":0.8,"scaleOrigin":"center"},
  {"targetId":"hero","property":"scaleX","time":800,"value":1,"easing":"easeOutCubic","scaleOrigin":"center"},
  {"targetId":"hero","property":"scaleY","time":0,"value":0.8,"scaleOrigin":"center"},
  {"targetId":"hero","property":"scaleY","time":800,"value":1,"easing":"easeOutCubic","scaleOrigin":"center"}
]
```

The opacity finishes first (400ms) while translate and scale continue (800ms), creating a layered reveal where the element becomes visible before it finishes moving into place.

---

## Sequential Chain

A → Arrow → B → Arrow → C with precise timing offsets. The building block for flow diagrams.

```json
[
  {"targetId":"A","property":"opacity","time":0,"value":0},
  {"targetId":"A","property":"opacity","time":500,"value":1,"easing":"easeOut"},
  {"targetId":"A","property":"scaleX","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"A","property":"scaleX","time":500,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"A","property":"scaleY","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"A","property":"scaleY","time":500,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},

  {"targetId":"arr_AB","property":"opacity","time":500,"value":0},
  {"targetId":"arr_AB","property":"opacity","time":500,"value":1},
  {"targetId":"arr_AB","property":"drawProgress","time":500,"value":0},
  {"targetId":"arr_AB","property":"drawProgress","time":1300,"value":1,"easing":"easeInOut"},

  {"targetId":"B","property":"opacity","time":0,"value":0},
  {"targetId":"B","property":"opacity","time":1300,"value":0},
  {"targetId":"B","property":"opacity","time":1800,"value":1,"easing":"easeOut"},
  {"targetId":"B","property":"scaleX","time":1300,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"B","property":"scaleX","time":1800,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"B","property":"scaleY","time":1300,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"B","property":"scaleY","time":1800,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},

  {"targetId":"arr_BC","property":"opacity","time":1800,"value":0},
  {"targetId":"arr_BC","property":"opacity","time":1800,"value":1},
  {"targetId":"arr_BC","property":"drawProgress","time":1800,"value":0},
  {"targetId":"arr_BC","property":"drawProgress","time":2600,"value":1,"easing":"easeInOut"},

  {"targetId":"C","property":"opacity","time":0,"value":0},
  {"targetId":"C","property":"opacity","time":2600,"value":0},
  {"targetId":"C","property":"opacity","time":3100,"value":1,"easing":"easeOut"},
  {"targetId":"C","property":"scaleX","time":2600,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"C","property":"scaleX","time":3100,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"C","property":"scaleY","time":2600,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"C","property":"scaleY","time":3100,"value":1,"easing":"easeOutBack","scaleOrigin":"center"}
]
```

Set clip range: `set_clip_range({start:0, end:3600})`

**Offset formula:** Each node takes ~500ms (pop), each arrow takes ~800ms (draw). So node N starts at `(N-1) × 1300` ms.

---

## Emphasis Pulse

Draw attention to an already-visible element with a subtle scale pulse.

```json
[
  {"targetId":"highlight","property":"scaleX","time":0,"value":1,"scaleOrigin":"center"},
  {"targetId":"highlight","property":"scaleX","time":400,"value":1.15,"easing":"easeInOutBack","scaleOrigin":"center"},
  {"targetId":"highlight","property":"scaleX","time":800,"value":1,"easing":"easeInOutBack","scaleOrigin":"center"},
  {"targetId":"highlight","property":"scaleY","time":0,"value":1,"scaleOrigin":"center"},
  {"targetId":"highlight","property":"scaleY","time":400,"value":1.15,"easing":"easeInOutBack","scaleOrigin":"center"},
  {"targetId":"highlight","property":"scaleY","time":800,"value":1,"easing":"easeInOutBack","scaleOrigin":"center"}
]
```

Scales to 115% and back. Use after a reveal to call attention to an important element. The `easeInOutBack` creates a satisfying overshoot in both directions.

**Variation — stronger pulse:** Change 1.15 to 1.25 for a more dramatic effect.

---

## Rotate Entrance

Element spins in from a rotated position while fading in.

```json
[
  {"targetId":"badge","property":"opacity","time":0,"value":0},
  {"targetId":"badge","property":"opacity","time":300,"value":1,"easing":"easeOut"},

  {"targetId":"badge","property":"rotation","time":0,"value":-90},
  {"targetId":"badge","property":"rotation","time":600,"value":0,"easing":"easeOutCubic"}
]
```

The -90 degree starting rotation makes the element spin clockwise into position. Use positive values for counter-clockwise.

**Variation — full spin entrance:**
```json
[
  {"targetId":"icon","property":"opacity","time":0,"value":0},
  {"targetId":"icon","property":"opacity","time":200,"value":1,"easing":"easeOut"},

  {"targetId":"icon","property":"rotation","time":0,"value":-360},
  {"targetId":"icon","property":"rotation","time":800,"value":0,"easing":"easeOutCubic"}
]
```

Best for small icons or decorative elements. Large shapes look awkward spinning.

---

## Elastic Arrival

Element slides in with a spring/wobble at the end, creating a playful feel.

```json
[
  {"targetId":"card","property":"opacity","time":0,"value":0},
  {"targetId":"card","property":"opacity","time":300,"value":1,"easing":"easeOut"},

  {"targetId":"card","property":"translateX","time":0,"value":-300},
  {"targetId":"card","property":"translateX","time":1000,"value":0,"easing":"easeOutElastic"}
]
```

The `easeOutElastic` makes the element overshoot its final position and oscillate back, like a spring. Use for playful diagrams, onboarding flows, or anywhere a bouncy feel fits the tone.

**Warning:** Duration should be 800ms+ to give the spring room to oscillate. Shorter durations compress the oscillation and look odd.

---

## Bounce Drop

Element falls from above and bounces on landing, mimicking gravity.

```json
[
  {"targetId":"icon","property":"opacity","time":0,"value":0},
  {"targetId":"icon","property":"opacity","time":100,"value":1,"easing":"step"},

  {"targetId":"icon","property":"translateY","time":0,"value":-200},
  {"targetId":"icon","property":"translateY","time":800,"value":0,"easing":"easeOutBounce"}
]
```

The `step` easing on opacity makes the element appear instantly, then the bounce on translateY creates the drop effect. Using `easeOut` for opacity instead would make the element fade in while falling, which weakens the gravity illusion.

**Variation — bounce drop with scale squash:**
```json
[
  {"targetId":"ball","property":"opacity","time":0,"value":0},
  {"targetId":"ball","property":"opacity","time":100,"value":1,"easing":"step"},

  {"targetId":"ball","property":"translateY","time":0,"value":-200},
  {"targetId":"ball","property":"translateY","time":800,"value":0,"easing":"easeOutBounce"},

  {"targetId":"ball","property":"scaleY","time":700,"value":1,"scaleOrigin":"bottom"},
  {"targetId":"ball","property":"scaleY","time":800,"value":0.8,"easing":"easeOut","scaleOrigin":"bottom"},
  {"targetId":"ball","property":"scaleY","time":900,"value":1,"easing":"easeOutBack","scaleOrigin":"bottom"}
]
```

The brief vertical squash at landing (700–900ms) adds a cartoony weight effect. Note `scaleOrigin:"bottom"` so the squash anchors at the ground.

---

## Typewriter Effect

Multiple text elements appearing with very short stagger, simulating typing.

```json
[
  {"targetId":"char1","property":"opacity","time":0,"value":0},
  {"targetId":"char1","property":"opacity","time":0,"value":1,"easing":"step"},

  {"targetId":"char2","property":"opacity","time":0,"value":0},
  {"targetId":"char2","property":"opacity","time":100,"value":0},
  {"targetId":"char2","property":"opacity","time":100,"value":1,"easing":"step"},

  {"targetId":"char3","property":"opacity","time":0,"value":0},
  {"targetId":"char3","property":"opacity","time":200,"value":0},
  {"targetId":"char3","property":"opacity","time":200,"value":1,"easing":"step"},

  {"targetId":"char4","property":"opacity","time":0,"value":0},
  {"targetId":"char4","property":"opacity","time":300,"value":0},
  {"targetId":"char4","property":"opacity","time":300,"value":1,"easing":"step"},

  {"targetId":"char5","property":"opacity","time":0,"value":0},
  {"targetId":"char5","property":"opacity","time":400,"value":0},
  {"targetId":"char5","property":"opacity","time":400,"value":1,"easing":"step"}
]
```

Key: use `step` easing so each element snaps on instantly (no fade). The 100ms delay between elements mimics keystroke timing.

**Practical use:** Since Excalidraw text is typically one element per text block, this works best with individual words or short phrases as separate text elements.

---

## Group Animation

Animate a frame (container) to move all its children together.

```json
[
  {"targetId":"frame1","property":"opacity","time":0,"value":0},
  {"targetId":"frame1","property":"opacity","time":500,"value":1,"easing":"easeOut"},

  {"targetId":"frame1","property":"translateX","time":0,"value":-300},
  {"targetId":"frame1","property":"translateX","time":800,"value":0,"easing":"easeOutCubic"}
]
```

All elements inside `frame1` move and fade as a unit. This is much more efficient than animating each child individually.

**Important:** Bound text (labels added to shapes) already inherits parent animation — you never need to animate bound text separately. But independent elements inside a frame also inherit the frame's animation.

---

## Scale from Edge

Use `scaleOrigin` to control which edge the element scales from, creating directional reveals.

**Scale from left (sidebar reveal):**
```json
[
  {"targetId":"sidebar","property":"scaleX","time":0,"value":0,"scaleOrigin":"left"},
  {"targetId":"sidebar","property":"scaleX","time":600,"value":1,"easing":"easeOutCubic","scaleOrigin":"left"},
  {"targetId":"sidebar","property":"opacity","time":0,"value":0},
  {"targetId":"sidebar","property":"opacity","time":300,"value":1,"easing":"easeOut"}
]
```

**Scale from top (dropdown reveal):**
```json
[
  {"targetId":"dropdown","property":"scaleY","time":0,"value":0,"scaleOrigin":"top"},
  {"targetId":"dropdown","property":"scaleY","time":500,"value":1,"easing":"easeOutCubic","scaleOrigin":"top"},
  {"targetId":"dropdown","property":"opacity","time":0,"value":0},
  {"targetId":"dropdown","property":"opacity","time":250,"value":1,"easing":"easeOut"}
]
```

**Scale from bottom-right (tooltip pop):**
```json
[
  {"targetId":"tooltip","property":"scaleX","time":0,"value":0,"scaleOrigin":"bottom-right"},
  {"targetId":"tooltip","property":"scaleX","time":400,"value":1,"easing":"easeOutBack","scaleOrigin":"bottom-right"},
  {"targetId":"tooltip","property":"scaleY","time":0,"value":0,"scaleOrigin":"bottom-right"},
  {"targetId":"tooltip","property":"scaleY","time":400,"value":1,"easing":"easeOutBack","scaleOrigin":"bottom-right"},
  {"targetId":"tooltip","property":"opacity","time":0,"value":0},
  {"targetId":"tooltip","property":"opacity","time":200,"value":1,"easing":"easeOut"}
]
```

**`scaleOrigin` values:** `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`, `top`, `bottom`, `left`, `right`

---

## Clip Range Strategy

Always set the clip range after all keyframes are in place.

**Formula:**
```
clip_end = last_keyframe_time + padding
```

**Padding guidelines:**
| Scenario | Padding |
|----------|---------|
| Fast animation (< 2s total) | 500ms |
| Medium animation (2–5s) | 500–800ms |
| Long animation (5s+) | 800–1000ms |
| Presentation/camera tour | 1000–1500ms |

```
set_clip_range({start:0, end:lastKeyframeTime + 500})
```

**Why padding matters:** Without padding, the animation ends abruptly at the last keyframe. The extra time gives the viewer a moment to see the final state before the animation loops or ends.

**Finding the last keyframe time:** After adding all keyframes, use `animations_of_item({targetId:"id"})` on the last element to see its keyframe times. The highest `time` value across all elements is your last keyframe time.

---

## Debugging Animations

### Check what's animated
```
animations_of_item({targetId:"myElement"})
```
Returns all keyframes for that element. Use to verify timing and property values.

### Common issues
1. **Element doesn't appear:** Check that opacity starts at 0 and transitions to 1. Missing the initial `opacity:0` keyframe means the element is already visible.
2. **Scale looks wrong:** Verify `scaleOrigin` is set on EVERY scale keyframe, not just the first one.
3. **Arrow doesn't draw:** Confirm the element is an arrow or line. `drawProgress` silently does nothing on other element types.
4. **Animation feels choppy:** Increase duration. Animations under 200ms often appear as jumps rather than smooth motion.
5. **Timing is off:** Double-check that hold keyframes (e.g., `opacity:0` at the moment before reveal) are present to prevent early interpolation.
