# Camera Choreography

Deep dive into camera animation for the Excalimate MCP server. Camera controls the viewport — what the viewer sees and how they navigate the canvas.

---

## Camera Setup

### `set_camera_frame`

Sets the initial camera position and automatically creates t=0 keyframes:

```
set_camera_frame({
  x: 100,
  y: 50,
  width: 1200,
  aspectRatio: "16:9"
})
```

**Parameters:**
- `x` — horizontal position of the camera's left edge
- `y` — vertical position of the camera's top edge
- `width` — visible width in canvas pixels (controls zoom level)
- `aspectRatio` — viewport shape

**Aspect ratio options:**
| Ratio | Use Case |
|-------|----------|
| `"16:9"` | Presentations, YouTube, widescreen (default) |
| `"4:3"` | Classic slides, documentation |
| `"1:1"` | Social media, square format |
| `"9:16"` | Mobile/stories, vertical format |

Always call `set_camera_frame` before adding camera keyframes. It establishes the starting viewport.

---

## Camera Properties

Camera keyframes animate three properties:

| Property | Controls | Effect |
|----------|----------|--------|
| `x` | Horizontal position | Pan left/right |
| `y` | Vertical position | Pan up/down |
| `width` | Visible area width | Zoom in (smaller) / zoom out (larger) |

Camera keyframes use `add_camera_keyframes_batch` and have **no `targetId`** — the camera is implicit:

```json
{"property":"x","time":0,"value":100,"easing":"easeInOutCubic"}
```

---

## Pattern 1: Scene-to-Scene Pan

Move the camera horizontally between pre-laid-out diagram sections. The most common camera pattern.

**Setup:** Lay out diagram sections side by side with ~500px gaps between them.

```json
[
  {"property":"x","time":0,"value":0},
  {"property":"y","time":0,"value":0},
  {"property":"width","time":0,"value":1200},

  {"property":"x","time":2000,"value":0},
  {"property":"x","time":4000,"value":1500,"easing":"easeInOutCubic"},

  {"property":"x","time":6000,"value":1500},
  {"property":"x","time":8000,"value":3000,"easing":"easeInOutCubic"}
]
```

**Timing logic:**
- 0–2000ms: Viewer reads scene 1 (camera stationary)
- 2000–4000ms: Camera pans to scene 2
- 4000–6000ms: Viewer reads scene 2 (camera stationary)
- 6000–8000ms: Camera pans to scene 3

**Key tips:**
- Always use `easeInOutCubic` for smooth start and stop
- Leave 1500–2000ms of stationary time for reading
- Pan duration 1500–2500ms depending on distance

---

## Pattern 2: Zoom to Detail

Start with a wide overview, then zoom into a specific area for detail.

**Zoom in** = animate `width` from large to small value:

```json
[
  {"property":"x","time":0,"value":0},
  {"property":"y","time":0,"value":0},
  {"property":"width","time":0,"value":2400},

  {"property":"x","time":2000,"value":0},
  {"property":"x","time":4000,"value":400,"easing":"easeInOutCubic"},
  {"property":"y","time":2000,"value":0},
  {"property":"y","time":4000,"value":200,"easing":"easeInOutCubic"},
  {"property":"width","time":2000,"value":2400},
  {"property":"width","time":4000,"value":800,"easing":"easeInOutCubic"}
]
```

**Timing logic:**
- 0–2000ms: Wide view showing the whole diagram
- 2000–4000ms: Camera zooms in and pans to the detail area

**Key tips:**
- Animate `x`, `y`, and `width` simultaneously for smooth zoom+pan
- Target `x`/`y` should center the area of interest in the viewport
- Width ratio controls zoom level: 2400→800 is a 3× zoom

**Zoom out** — reverse the values (small width → large width):

```json
[
  {"property":"width","time":0,"value":800},
  {"property":"width","time":2000,"value":2400,"easing":"easeInOutCubic"},
  {"property":"x","time":0,"value":400},
  {"property":"x","time":2000,"value":0,"easing":"easeInOutCubic"},
  {"property":"y","time":0,"value":200},
  {"property":"y","time":2000,"value":0,"easing":"easeInOutCubic"}
]
```

---

## Pattern 3: Overview Then Focus

Start wide to show the full diagram, then navigate through areas one by one. The most narrative camera pattern.

```json
[
  {"property":"x","time":0,"value":0},
  {"property":"y","time":0,"value":0},
  {"property":"width","time":0,"value":3000},

  {"property":"x","time":2000,"value":0},
  {"property":"y","time":2000,"value":0},
  {"property":"width","time":2000,"value":3000},

  {"property":"x","time":4000,"value":100,"easing":"easeInOutCubic"},
  {"property":"y","time":4000,"value":50,"easing":"easeInOutCubic"},
  {"property":"width","time":4000,"value":900,"easing":"easeInOutCubic"},

  {"property":"x","time":6000,"value":100},
  {"property":"y","time":6000,"value":50},
  {"property":"width","time":6000,"value":900},

  {"property":"x","time":8000,"value":1200,"easing":"easeInOutCubic"},
  {"property":"y","time":8000,"value":50,"easing":"easeInOutCubic"},
  {"property":"width","time":8000,"value":900},

  {"property":"x","time":10000,"value":1200},
  {"property":"y","time":10000,"value":50},
  {"property":"width","time":10000,"value":900},

  {"property":"x","time":12000,"value":2300,"easing":"easeInOutCubic"},
  {"property":"y","time":12000,"value":50,"easing":"easeInOutCubic"},
  {"property":"width","time":12000,"value":900}
]
```

**Timing logic:**
- 0–2000ms: Wide overview (all elements visible)
- 2000–4000ms: Zoom into area 1
- 4000–6000ms: View area 1 (stationary)
- 6000–8000ms: Pan to area 2 (staying zoomed)
- 8000–10000ms: View area 2 (stationary)
- 10000–12000ms: Pan to area 3

**Key tips:**
- First zoom-in combines x/y movement with width change
- Subsequent pans keep `width` constant — only move x/y
- Duplicate keyframes at start of stationary periods to anchor the camera

---

## Pattern 4: Tracking

Camera follows an animated element across the canvas. The element moves and the camera follows.

**Use case:** An animated data packet flowing through a pipeline, or a highlight moving between components.

First, animate the element's position:
```json
[
  {"targetId":"packet","property":"translateX","time":0,"value":0},
  {"targetId":"packet","property":"translateX","time":2000,"value":500,"easing":"easeInOut"},
  {"targetId":"packet","property":"translateX","time":4000,"value":1000,"easing":"easeInOut"},
  {"targetId":"packet","property":"translateX","time":6000,"value":1500,"easing":"easeInOut"}
]
```

Then, set camera keyframes to follow with slight delay:
```json
[
  {"property":"x","time":0,"value":0},
  {"property":"x","time":200,"value":0},
  {"property":"x","time":2200,"value":500,"easing":"easeInOutCubic"},
  {"property":"x","time":4200,"value":1000,"easing":"easeInOutCubic"},
  {"property":"x","time":6200,"value":1500,"easing":"easeInOutCubic"},
  {"property":"y","time":0,"value":0},
  {"property":"width","time":0,"value":800}
]
```

**Key tips:**
- Add 100–200ms delay to camera keyframes so the element leads
- Use the same easing on both element and camera for synchronized motion
- Keep camera width constant unless the tracked path requires zooming

---

## Camera Calculation Helpers

### Centering the camera on a point

To center the camera viewport on canvas coordinates `(cx, cy)`:
```
camera_x = cx - (width / 2)
camera_y = cy - (height / 2)
```

Where `height = width / aspectRatio` (e.g., for 16:9 with width 1200: height = 675).

### Calculating width for desired zoom

To show a canvas region of `regionWidth` pixels:
```
camera_width = regionWidth × 1.2   (add 20% padding)
```

### Framing multiple elements

To frame elements spanning from `(minX, minY)` to `(maxX, maxY)`:
```
regionWidth = maxX - minX
regionHeight = maxY - minY
camera_width = max(regionWidth × 1.3, regionHeight × aspectRatio × 1.3)
camera_x = minX - (camera_width - regionWidth) / 2
camera_y = minY - (camera_width / aspectRatio - regionHeight) / 2
```

---

## Common Mistakes

1. **Forgetting `set_camera_frame`** — always set up the camera before adding keyframes
2. **Missing stationary keyframes** — duplicate the position at the start of each reading pause
3. **Too-fast pans** — camera movement under 1000ms feels jarring; prefer 1500–2500ms
4. **Inconsistent width** — changing width mid-pan creates disorienting zoom; keep separate unless intentional
5. **No reading time** — always leave 1500–2000ms of stationary camera for the viewer to absorb content
