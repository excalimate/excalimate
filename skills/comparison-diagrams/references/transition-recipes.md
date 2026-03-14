# Transition Recipes

Four reusable transition patterns for animating between State A and State B.
Each recipe includes full keyframe JSON ready for `add_keyframes_batch`.

## 1. Cross-Fade

State A fades out while State B fades in. The simplest transition — works with any
layout but is especially effective for sequential (same-position) comparisons.

**Duration:** 1000–1500 ms overlap.

```json
[
  {
    "elementId": "state-a-box",
    "property": "opacity",
    "keyframes": [
      { "time": 3500, "value": 1, "easing": "easeInQuad" },
      { "time": 4500, "value": 0 }
    ]
  },
  {
    "elementId": "state-a-label",
    "property": "opacity",
    "keyframes": [
      { "time": 3500, "value": 1, "easing": "easeInQuad" },
      { "time": 4500, "value": 0 }
    ]
  },
  {
    "elementId": "state-a-arrow",
    "property": "opacity",
    "keyframes": [
      { "time": 3500, "value": 1, "easing": "easeInQuad" },
      { "time": 4300, "value": 0 }
    ]
  },
  {
    "elementId": "state-b-box",
    "property": "opacity",
    "keyframes": [
      { "time": 4000, "value": 0, "easing": "easeOutCubic" },
      { "time": 5000, "value": 1 }
    ]
  },
  {
    "elementId": "state-b-label",
    "property": "opacity",
    "keyframes": [
      { "time": 4000, "value": 0, "easing": "easeOutCubic" },
      { "time": 5000, "value": 1 }
    ]
  },
  {
    "elementId": "state-b-arrow",
    "property": "drawProgress",
    "keyframes": [
      { "time": 4500, "value": 0, "easing": "easeInOutQuad" },
      { "time": 5500, "value": 1 }
    ]
  }
]
```

**Tips:**
- Fade arrows out slightly before boxes so connections disappear first.
- Use `drawProgress` (not opacity) to reveal new arrows — it looks more natural.
- Overlap the fade-out end and fade-in start by 500 ms to avoid a blank frame.

## 2. Slide-Over

State A slides off-screen to the left while State B slides in from the right.
Creates a strong sense of progression. Best for side-by-side layouts where you want
to animate the transition between viewing panel A and panel B.

**Duration:** 800–1200 ms.

```json
[
  {
    "elementId": "state-a-box",
    "property": "translateX",
    "keyframes": [
      { "time": 3500, "value": 0, "easing": "easeInCubic" },
      { "time": 4500, "value": -800 }
    ]
  },
  {
    "elementId": "state-a-box",
    "property": "opacity",
    "keyframes": [
      { "time": 3500, "value": 1 },
      { "time": 4300, "value": 0 }
    ]
  },
  {
    "elementId": "state-a-label",
    "property": "translateX",
    "keyframes": [
      { "time": 3500, "value": 0, "easing": "easeInCubic" },
      { "time": 4500, "value": -800 }
    ]
  },
  {
    "elementId": "state-a-label",
    "property": "opacity",
    "keyframes": [
      { "time": 3500, "value": 1 },
      { "time": 4300, "value": 0 }
    ]
  },
  {
    "elementId": "state-b-box",
    "property": "translateX",
    "keyframes": [
      { "time": 3800, "value": 800, "easing": "easeOutCubic" },
      { "time": 4800, "value": 0 }
    ]
  },
  {
    "elementId": "state-b-box",
    "property": "opacity",
    "keyframes": [
      { "time": 3800, "value": 0 },
      { "time": 4200, "value": 1 }
    ]
  },
  {
    "elementId": "state-b-label",
    "property": "translateX",
    "keyframes": [
      { "time": 3800, "value": 800, "easing": "easeOutCubic" },
      { "time": 4800, "value": 0 }
    ]
  },
  {
    "elementId": "state-b-label",
    "property": "opacity",
    "keyframes": [
      { "time": 3800, "value": 0 },
      { "time": 4200, "value": 1 }
    ]
  }
]
```

**Tips:**
- Slide distance should be at least the panel width (800 px) so elements fully exit.
- Combine with opacity fade to avoid elements lingering at the edge.
- Stagger State B entry by 300 ms after State A starts exiting for a cleaner feel.

## 3. Morph

Elements reposition, resize, or reshape in place. Nothing fades in or out — the
existing elements transform to the new state. Best for showing how a system
restructures without adding or removing components.

**Duration:** 1000–1500 ms per property.

```json
[
  {
    "elementId": "box-that-moves",
    "property": "translateX",
    "keyframes": [
      { "time": 3500, "value": 0, "easing": "easeInOutCubic" },
      { "time": 5000, "value": 200 }
    ]
  },
  {
    "elementId": "box-that-moves",
    "property": "translateY",
    "keyframes": [
      { "time": 3500, "value": 0, "easing": "easeInOutCubic" },
      { "time": 5000, "value": -100 }
    ]
  },
  {
    "elementId": "box-that-grows",
    "property": "scaleX",
    "keyframes": [
      { "time": 3500, "value": 1, "easing": "easeInOutCubic" },
      { "time": 5000, "value": 1.5 }
    ]
  },
  {
    "elementId": "box-that-grows",
    "property": "scaleY",
    "keyframes": [
      { "time": 3500, "value": 1, "easing": "easeInOutCubic" },
      { "time": 5000, "value": 1.5 }
    ]
  },
  {
    "elementId": "box-that-rotates",
    "property": "rotation",
    "keyframes": [
      { "time": 3500, "value": 0, "easing": "easeInOutCubic" },
      { "time": 5000, "value": 45 }
    ]
  }
]
```

**Tips:**
- Use `easeInOutCubic` for smooth, natural-feeling morphs.
- Animate `translateX`, `translateY`, `scaleX`, `scaleY`, and `rotation` simultaneously
  for complex transformations.
- If an element splits into two, fade the original out while fading two new elements in
  at the split positions — pure morph cannot handle duplication.

## 4. Wipe (Camera Pan)

The camera pans from State A's region to State B's region. Both states exist on the
canvas at all times, but the viewport reveals them sequentially. Best for side-by-side
layouts where you want the viewer to focus on one panel at a time.

**Duration:** 800–1200 ms pan, plus hold time at each position.

```json
[
  {
    "elementId": "__camera__",
    "property": "x",
    "keyframes": [
      { "time": 0, "value": 0 },
      { "time": 2500, "value": 0, "easing": "easeInOutCubic" },
      { "time": 3500, "value": 800 },
      { "time": 6000, "value": 800 }
    ]
  },
  {
    "elementId": "__camera__",
    "property": "y",
    "keyframes": [
      { "time": 0, "value": 0 },
      { "time": 6000, "value": 0 }
    ]
  },
  {
    "elementId": "__camera__",
    "property": "width",
    "keyframes": [
      { "time": 0, "value": 800 },
      { "time": 6000, "value": 800 }
    ]
  },
  {
    "elementId": "__camera__",
    "property": "height",
    "keyframes": [
      { "time": 0, "value": 700 },
      { "time": 6000, "value": 700 }
    ]
  }
]
```

> Use `add_camera_keyframes_batch` instead of `add_keyframes_batch` for camera
> animations. The camera element ID is always `__camera__`.

**Timeline breakdown:**
- `0 – 2500 ms` — Camera holds on State A (x=0). Viewer reads State A.
- `2500 – 3500 ms` — Camera pans right to State B (x=800). Smooth wipe effect.
- `3500 – 6000 ms` — Camera holds on State B. Viewer reads State B.

**Tips:**
- Set camera `width` to match a single panel width so only one panel is visible at a time.
- Add element reveal animations within each panel that play while the camera is focused there.
- For a zoom-wipe, animate `width` and `height` larger during the pan, then back to
  normal — this creates a brief zoom-out that shows both panels before zooming into B.
- End with a final camera frame that shows both panels for the summary view:

```json
[
  {
    "elementId": "__camera__",
    "property": "width",
    "keyframes": [
      { "time": 6000, "value": 800, "easing": "easeInOutCubic" },
      { "time": 7000, "value": 1600 }
    ]
  },
  {
    "elementId": "__camera__",
    "property": "x",
    "keyframes": [
      { "time": 6000, "value": 800, "easing": "easeInOutCubic" },
      { "time": 7000, "value": 0 }
    ]
  }
]
```
