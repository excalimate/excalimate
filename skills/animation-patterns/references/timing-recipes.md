# Timing Recipes

Complete timing blueprints for common diagram animation scenarios. Each recipe includes the full `add_keyframes_batch` JSON — adapt element IDs to your diagram.

---

## 1. Simple Reveal (3 Boxes)

Three shapes appearing in sequence with fade-in.

**Timeline:** box1 0–500ms, box2 500–1000ms, box3 1000–1500ms
**Clip range:** 0–2000ms

```json
[
  {"targetId":"box1","property":"opacity","time":0,"value":0},
  {"targetId":"box1","property":"opacity","time":500,"value":1,"easing":"easeOut"},

  {"targetId":"box2","property":"opacity","time":0,"value":0},
  {"targetId":"box2","property":"opacity","time":500,"value":0},
  {"targetId":"box2","property":"opacity","time":1000,"value":1,"easing":"easeOut"},

  {"targetId":"box3","property":"opacity","time":0,"value":0},
  {"targetId":"box3","property":"opacity","time":1000,"value":0},
  {"targetId":"box3","property":"opacity","time":1500,"value":1,"easing":"easeOut"}
]
```

Set clip range: `set_clip_range({start:0, end:2000})`

---

## 2. Architecture Flow (3 Nodes + 2 Arrows)

Classic architecture diagram: Node → Arrow → Node → Arrow → Node.

**Timeline:**
- node1: 0–500ms (fade in)
- arrow1: 500–1500ms (draw on)
- node2: 1500–2000ms (fade in)
- arrow2: 2000–3000ms (draw on)
- node3: 3000–3500ms (fade in)

**Clip range:** 0–4500ms

```json
[
  {"targetId":"node1","property":"opacity","time":0,"value":0},
  {"targetId":"node1","property":"opacity","time":500,"value":1,"easing":"easeOut"},

  {"targetId":"arrow1","property":"opacity","time":500,"value":0},
  {"targetId":"arrow1","property":"opacity","time":500,"value":1},
  {"targetId":"arrow1","property":"drawProgress","time":500,"value":0},
  {"targetId":"arrow1","property":"drawProgress","time":1500,"value":1,"easing":"easeInOut"},

  {"targetId":"node2","property":"opacity","time":0,"value":0},
  {"targetId":"node2","property":"opacity","time":1500,"value":0},
  {"targetId":"node2","property":"opacity","time":2000,"value":1,"easing":"easeOut"},

  {"targetId":"arrow2","property":"opacity","time":2000,"value":0},
  {"targetId":"arrow2","property":"opacity","time":2000,"value":1},
  {"targetId":"arrow2","property":"drawProgress","time":2000,"value":0},
  {"targetId":"arrow2","property":"drawProgress","time":3000,"value":1,"easing":"easeInOut"},

  {"targetId":"node3","property":"opacity","time":0,"value":0},
  {"targetId":"node3","property":"opacity","time":3000,"value":0},
  {"targetId":"node3","property":"opacity","time":3500,"value":1,"easing":"easeOut"}
]
```

Set clip range: `set_clip_range({start:0, end:4500})`

**Scaling tip:** For longer chains, each additional node+arrow pair adds ~1500ms (500ms fade + 1000ms draw).

---

## 3. Presentation Slide (Title + 5 Bullets)

Title pops in, then bullets reveal one by one with staggered fade.

**Timeline:**
- title: 0–600ms (pop in)
- bullet1: 800–1200ms (fade + slide)
- bullet2: 1200–1600ms (fade + slide)
- bullet3: 1600–2000ms (fade + slide)
- bullet4: 2000–2400ms (fade + slide)
- bullet5: 2400–2800ms (fade + slide)

**Clip range:** 0–3800ms

```json
[
  {"targetId":"title","property":"scaleX","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"title","property":"scaleX","time":600,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"title","property":"scaleY","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"title","property":"scaleY","time":600,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"title","property":"opacity","time":0,"value":0},
  {"targetId":"title","property":"opacity","time":300,"value":1,"easing":"easeOut"},

  {"targetId":"bullet1","property":"opacity","time":0,"value":0},
  {"targetId":"bullet1","property":"opacity","time":800,"value":0},
  {"targetId":"bullet1","property":"opacity","time":1200,"value":1,"easing":"easeOut"},
  {"targetId":"bullet1","property":"translateX","time":800,"value":-100},
  {"targetId":"bullet1","property":"translateX","time":1200,"value":0,"easing":"easeOutCubic"},

  {"targetId":"bullet2","property":"opacity","time":0,"value":0},
  {"targetId":"bullet2","property":"opacity","time":1200,"value":0},
  {"targetId":"bullet2","property":"opacity","time":1600,"value":1,"easing":"easeOut"},
  {"targetId":"bullet2","property":"translateX","time":1200,"value":-100},
  {"targetId":"bullet2","property":"translateX","time":1600,"value":0,"easing":"easeOutCubic"},

  {"targetId":"bullet3","property":"opacity","time":0,"value":0},
  {"targetId":"bullet3","property":"opacity","time":1600,"value":0},
  {"targetId":"bullet3","property":"opacity","time":2000,"value":1,"easing":"easeOut"},
  {"targetId":"bullet3","property":"translateX","time":1600,"value":-100},
  {"targetId":"bullet3","property":"translateX","time":2000,"value":0,"easing":"easeOutCubic"},

  {"targetId":"bullet4","property":"opacity","time":0,"value":0},
  {"targetId":"bullet4","property":"opacity","time":2000,"value":0},
  {"targetId":"bullet4","property":"opacity","time":2400,"value":1,"easing":"easeOut"},
  {"targetId":"bullet4","property":"translateX","time":2000,"value":-100},
  {"targetId":"bullet4","property":"translateX","time":2400,"value":0,"easing":"easeOutCubic"},

  {"targetId":"bullet5","property":"opacity","time":0,"value":0},
  {"targetId":"bullet5","property":"opacity","time":2400,"value":0},
  {"targetId":"bullet5","property":"opacity","time":2800,"value":1,"easing":"easeOut"},
  {"targetId":"bullet5","property":"translateX","time":2400,"value":-100},
  {"targetId":"bullet5","property":"translateX","time":2800,"value":0,"easing":"easeOutCubic"}
]
```

Set clip range: `set_clip_range({start:0, end:3800})`

**Tip:** The 400ms stagger delay between bullets creates a cascading waterfall effect. Increase to 600ms for a more deliberate pace.

---

## 4. Data Flow (Source → Transform → Sink)

Data pipeline with processing in the middle.

**Timeline:**
- source: 0–500ms (fade in)
- arrow1: 500–1200ms (draw on)
- transform: 1200–1700ms (pop in)
- arrow2: 1700–2400ms (draw on)
- sink: 2400–2900ms (fade in)

**Clip range:** 0–3900ms

```json
[
  {"targetId":"source","property":"opacity","time":0,"value":0},
  {"targetId":"source","property":"opacity","time":500,"value":1,"easing":"easeOut"},

  {"targetId":"arrow1","property":"opacity","time":500,"value":0},
  {"targetId":"arrow1","property":"opacity","time":500,"value":1},
  {"targetId":"arrow1","property":"drawProgress","time":500,"value":0},
  {"targetId":"arrow1","property":"drawProgress","time":1200,"value":1,"easing":"easeInOut"},

  {"targetId":"transform","property":"opacity","time":0,"value":0},
  {"targetId":"transform","property":"opacity","time":1200,"value":0},
  {"targetId":"transform","property":"opacity","time":1500,"value":1,"easing":"easeOut"},
  {"targetId":"transform","property":"scaleX","time":1200,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"transform","property":"scaleX","time":1700,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"transform","property":"scaleY","time":1200,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"transform","property":"scaleY","time":1700,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},

  {"targetId":"arrow2","property":"opacity","time":1700,"value":0},
  {"targetId":"arrow2","property":"opacity","time":1700,"value":1},
  {"targetId":"arrow2","property":"drawProgress","time":1700,"value":0},
  {"targetId":"arrow2","property":"drawProgress","time":2400,"value":1,"easing":"easeInOut"},

  {"targetId":"sink","property":"opacity","time":0,"value":0},
  {"targetId":"sink","property":"opacity","time":2400,"value":0},
  {"targetId":"sink","property":"opacity","time":2900,"value":1,"easing":"easeOut"}
]
```

Set clip range: `set_clip_range({start:0, end:3900})`

---

## 5. Camera Tour (3 Scenes)

Wide canvas with multiple scenes — camera pans between them.

**Timeline:**
- Scene 1 elements: 0–2000ms (staggered reveal)
- Camera pan to scene 2: 2500–4500ms
- Scene 2 elements: 4500–6500ms (staggered reveal)
- Camera pan to scene 3: 7000–9000ms
- Scene 3 elements: 9000–11000ms (staggered reveal)

**Clip range:** 0–12000ms

```json
[
  {"targetId":"s1_el1","property":"opacity","time":0,"value":0},
  {"targetId":"s1_el1","property":"opacity","time":500,"value":1,"easing":"easeOut"},
  {"targetId":"s1_el2","property":"opacity","time":0,"value":0},
  {"targetId":"s1_el2","property":"opacity","time":500,"value":0},
  {"targetId":"s1_el2","property":"opacity","time":1000,"value":1,"easing":"easeOut"},
  {"targetId":"s1_el3","property":"opacity","time":0,"value":0},
  {"targetId":"s1_el3","property":"opacity","time":1000,"value":0},
  {"targetId":"s1_el3","property":"opacity","time":1500,"value":1,"easing":"easeOut"},

  {"targetId":"s2_el1","property":"opacity","time":0,"value":0},
  {"targetId":"s2_el1","property":"opacity","time":4500,"value":0},
  {"targetId":"s2_el1","property":"opacity","time":5000,"value":1,"easing":"easeOut"},
  {"targetId":"s2_el2","property":"opacity","time":0,"value":0},
  {"targetId":"s2_el2","property":"opacity","time":5000,"value":0},
  {"targetId":"s2_el2","property":"opacity","time":5500,"value":1,"easing":"easeOut"},
  {"targetId":"s2_el3","property":"opacity","time":0,"value":0},
  {"targetId":"s2_el3","property":"opacity","time":5500,"value":0},
  {"targetId":"s2_el3","property":"opacity","time":6000,"value":1,"easing":"easeOut"},

  {"targetId":"s3_el1","property":"opacity","time":0,"value":0},
  {"targetId":"s3_el1","property":"opacity","time":9000,"value":0},
  {"targetId":"s3_el1","property":"opacity","time":9500,"value":1,"easing":"easeOut"},
  {"targetId":"s3_el2","property":"opacity","time":0,"value":0},
  {"targetId":"s3_el2","property":"opacity","time":9500,"value":0},
  {"targetId":"s3_el2","property":"opacity","time":10000,"value":1,"easing":"easeOut"},
  {"targetId":"s3_el3","property":"opacity","time":0,"value":0},
  {"targetId":"s3_el3","property":"opacity","time":10000,"value":0},
  {"targetId":"s3_el3","property":"opacity","time":10500,"value":1,"easing":"easeOut"}
]
```

Camera keyframes (separate `add_camera_keyframes_batch` call):

```json
[
  {"property":"x","time":0,"value":0},
  {"property":"y","time":0,"value":0},

  {"property":"x","time":2500,"value":0},
  {"property":"x","time":4500,"value":1500,"easing":"easeInOutCubic"},
  {"property":"y","time":2500,"value":0},
  {"property":"y","time":4500,"value":0,"easing":"easeInOutCubic"},

  {"property":"x","time":7000,"value":1500},
  {"property":"x","time":9000,"value":3000,"easing":"easeInOutCubic"},
  {"property":"y","time":7000,"value":0},
  {"property":"y","time":9000,"value":0,"easing":"easeInOutCubic"}
]
```

Set clip range: `set_clip_range({start:0, end:12000})`

**Tip:** Leave 500ms gap between scene reveal finishing and camera pan starting — gives the viewer time to absorb the content.

---

## 6. Quick Comparison (Before/After)

Side-by-side comparison with a transition between states.

**Timeline:**
- Before side: 0–1500ms (staggered reveal)
- Transition marker: 2000–2500ms (slide in divider or label)
- After side: 2500–4000ms (staggered reveal)

**Clip range:** 0–5000ms

```json
[
  {"targetId":"before_title","property":"opacity","time":0,"value":0},
  {"targetId":"before_title","property":"opacity","time":400,"value":1,"easing":"easeOut"},
  {"targetId":"before_el1","property":"opacity","time":0,"value":0},
  {"targetId":"before_el1","property":"opacity","time":400,"value":0},
  {"targetId":"before_el1","property":"opacity","time":800,"value":1,"easing":"easeOut"},
  {"targetId":"before_el2","property":"opacity","time":0,"value":0},
  {"targetId":"before_el2","property":"opacity","time":800,"value":0},
  {"targetId":"before_el2","property":"opacity","time":1200,"value":1,"easing":"easeOut"},

  {"targetId":"divider","property":"opacity","time":0,"value":0},
  {"targetId":"divider","property":"opacity","time":2000,"value":0},
  {"targetId":"divider","property":"opacity","time":2500,"value":1,"easing":"easeOut"},
  {"targetId":"divider","property":"translateY","time":2000,"value":-100},
  {"targetId":"divider","property":"translateY","time":2500,"value":0,"easing":"easeOutCubic"},

  {"targetId":"after_title","property":"opacity","time":0,"value":0},
  {"targetId":"after_title","property":"opacity","time":2500,"value":0},
  {"targetId":"after_title","property":"opacity","time":2900,"value":1,"easing":"easeOut"},
  {"targetId":"after_el1","property":"opacity","time":0,"value":0},
  {"targetId":"after_el1","property":"opacity","time":2900,"value":0},
  {"targetId":"after_el1","property":"opacity","time":3300,"value":1,"easing":"easeOut"},
  {"targetId":"after_el2","property":"opacity","time":0,"value":0},
  {"targetId":"after_el2","property":"opacity","time":3300,"value":0},
  {"targetId":"after_el2","property":"opacity","time":3700,"value":1,"easing":"easeOut"}
]
```

Set clip range: `set_clip_range({start:0, end:5000})`

---

## General Timing Formulas

Use these to calculate timings for arbitrary diagram sizes:

- **Chain of N nodes with arrows:** Total ≈ `N × 500 + (N-1) × 1000 + 500` ms
- **Staggered list of N items:** Total ≈ `duration + (N-1) × delay + 500` ms
- **Camera tour of N scenes:** Total ≈ `N × 2000 + (N-1) × 2500 + 1000` ms
- **Clip range padding:** Always add 500–1000ms to the last keyframe time
