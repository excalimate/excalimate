# Animate-Excalidraw — Full Reference

## Element Format

Every element requires `id`, `type`, `x`, `y`, `width`, `height`. The MCP server auto-fills missing properties (seed, version, roughness, strokeWidth, etc.).

### Base Properties (auto-filled if missing)
```json
{
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 1,
  "opacity": 100,
  "angle": 0,
  "groupIds": [],
  "isDeleted": false
}
```

### Rectangle
```json
{"id":"box","type":"rectangle","x":100,"y":100,"width":200,"height":100,
 "strokeColor":"#1971c2","backgroundColor":"#a5d8ff","fillStyle":"solid"}
```

### Ellipse
```json
{"id":"circle","type":"ellipse","x":300,"y":100,"width":120,"height":120,
 "strokeColor":"#e03131","backgroundColor":"#ffc9c9","fillStyle":"solid"}
```

### Diamond
```json
{"id":"dia","type":"diamond","x":500,"y":90,"width":140,"height":140,
 "strokeColor":"#6741d9","backgroundColor":"#d0bfff","fillStyle":"solid"}
```

### Text
```json
{"id":"txt","type":"text","x":200,"y":50,"width":300,"height":50,
 "text":"Architecture Overview","fontSize":36,"fontFamily":5,
 "textAlign":"center","strokeColor":"#1e1e1e"}
```
- `fontFamily`: 1=Virgil (hand-drawn), 3=Cascadia (mono), 5=Assistant (clean)
- `textAlign`: "left" | "center" | "right"
- `verticalAlign`: "top" | "middle"

### Arrow
```json
{"id":"arr","type":"arrow","x":100,"y":200,"width":300,"height":0,
 "points":[[0,0],[300,0]],"endArrowhead":"arrow"}
```
- `points`: Array of [x,y] relative to element's (x,y). First is [0,0].
- `startArrowhead`: null | "arrow" | "bar" | "dot" | "triangle"
- `endArrowhead`: null | "arrow" | "bar" | "dot" | "triangle"

### Curved arrow (3 points)
```json
{"id":"curve","type":"arrow","x":100,"y":200,"width":300,"height":100,
 "points":[[0,0],[150,-100],[300,0]],"endArrowhead":"arrow"}
```

### Arrow bound to shapes
```json
{"id":"arr","type":"arrow","x":250,"y":240,"width":250,"height":0,
 "points":[[0,0],[250,0]],"endArrowhead":"arrow",
 "startBinding":{"elementId":"shapeA","focus":0,"gap":1},
 "endBinding":{"elementId":"shapeB","focus":0,"gap":1}}
```
Both shapes need: `"boundElements":[{"id":"arr","type":"arrow"}]`

### Line (no arrowhead)
```json
{"id":"line","type":"line","x":100,"y":300,"width":400,"height":80,
 "points":[[0,0],[200,-80],[400,0]],"strokeColor":"#e03131","strokeWidth":3}
```

### Labeled shape (bound text)
```json
[
  {"id":"box","type":"rectangle","x":100,"y":100,"width":200,"height":80,
   "boundElements":[{"id":"lbl","type":"text"}],...},
  {"id":"lbl","type":"text","x":130,"y":125,"width":140,"height":30,
   "text":"Server","fontSize":20,"textAlign":"center","verticalAlign":"middle",
   "containerId":"box"}
]
```

## Color Palettes

### Stroke Colors
| Color | Hex |
|-------|-----|
| Black | `#1e1e1e` |
| Red | `#e03131` |
| Green | `#2f9e44` |
| Blue | `#1971c2` |
| Orange | `#f08c00` |
| Purple | `#6741d9` |
| Teal | `#0c8599` |
| Coral | `#e8590c` |

### Background Colors
| Color | Hex |
|-------|-----|
| Transparent | `transparent` |
| Light Red | `#ffc9c9` |
| Light Green | `#b2f2bb` |
| Light Blue | `#a5d8ff` |
| Light Yellow | `#ffec99` |
| Light Purple | `#d0bfff` |
| Light Teal | `#99e9f2` |
| Light Orange | `#ffd8a8` |

## All Easing Types

`linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInBack`, `easeOutBack`, `easeInOutBack`, `easeInElastic`, `easeOutElastic`, `easeInBounce`, `easeOutBounce`, `step`

## All Tools

| Tool | Args | Returns |
|------|------|---------|
| `read_me` | none | Element format reference |
| `get_examples` | none | Few-shot animation examples |
| `create_scene` | `{elements: string}` | Confirmation |
| `add_elements` | `{elements: string}` | Count added |
| `remove_elements` | `{ids: string[]}` | Count removed |
| `update_elements` | `{updates: string}` | Count updated |
| `get_scene` | none | Elements JSON |
| `add_keyframe` | `{targetId, property, time, value, easing?}` | Confirmation |
| `add_keyframes_batch` | `{keyframes: string}` — each kf can have `scaleOrigin` | Count added |
| `add_scale_animation` | `{targetId, origin, keyframes: string}` | Count added |
| `remove_keyframe` | `{trackId, keyframeId}` | Confirmation |
| `create_sequence` | `{elementIds, property?, startTime?, delay?, duration?}` | Sequence info |
| `set_clip_range` | `{start, end}` | Confirmation |
| `get_timeline` | none | Timeline JSON |
| `clear_animation` | none | Confirmation |
| `clear_scene` | none | Confirmation |
| `set_camera_frame` | `{x?, y?, width?, aspectRatio?}` | Camera info + t=0 keyframes |
| `add_camera_keyframe` | `{property, time, value, easing?}` | Confirmation |
| `add_camera_keyframes_batch` | `{keyframes: string}` | Count added |
| `are_items_in_line` | `{ids, axis, tolerance?}` | Alignment check |
| `is_camera_centered` | `{axis, time?, tolerance?}` | Centering check |
| `items_visible_in_camera` | `{time?}` | Visibility report per item |
| `animations_of_item` | `{targetId}` | Timeline description |
| `delete_items` | `{ids: string[]}` | Count removed |
| `save_checkpoint` | `{id?}` | Checkpoint ID |
| `load_checkpoint` | `{id}` | State info |
| `list_checkpoints` | none | ID list |

## Detailed Animation Examples

### Example: Full Architecture Diagram with Sequence
```
// 1. Create all elements
create_scene({ elements: '[
  {"id":"client","type":"rectangle","x":50,"y":200,"width":160,"height":80,"backgroundColor":"#ffec99","fillStyle":"solid","boundElements":[{"id":"cl","type":"text"}]},
  {"id":"cl","type":"text","x":80,"y":225,"width":100,"height":30,"text":"Client","fontSize":20,"textAlign":"center","containerId":"client"},
  {"id":"api","type":"rectangle","x":350,"y":200,"width":160,"height":80,"backgroundColor":"#a5d8ff","fillStyle":"solid","boundElements":[{"id":"al","type":"text"}]},
  {"id":"al","type":"text","x":380,"y":225,"width":100,"height":30,"text":"API","fontSize":20,"textAlign":"center","containerId":"api"},
  {"id":"db","type":"rectangle","x":650,"y":200,"width":160,"height":80,"backgroundColor":"#b2f2bb","fillStyle":"solid","boundElements":[{"id":"dl","type":"text"}]},
  {"id":"dl","type":"text","x":680,"y":225,"width":100,"height":30,"text":"Database","fontSize":20,"textAlign":"center","containerId":"db"},
  {"id":"a1","type":"arrow","x":210,"y":240,"width":140,"height":0,"points":[[0,0],[140,0]],"endArrowhead":"arrow"},
  {"id":"a2","type":"arrow","x":510,"y":240,"width":140,"height":0,"points":[[0,0],[140,0]],"endArrowhead":"arrow"}
]' })

// 2. Animate: Client → Arrow → API → Arrow → Database
add_keyframes_batch({ keyframes: '[
  {"targetId":"client","property":"opacity","time":0,"value":0},
  {"targetId":"client","property":"opacity","time":500,"value":1,"easing":"easeOut"},
  {"targetId":"a1","property":"opacity","time":0,"value":0},
  {"targetId":"a1","property":"opacity","time":500,"value":1},
  {"targetId":"a1","property":"drawProgress","time":500,"value":0},
  {"targetId":"a1","property":"drawProgress","time":1500,"value":1,"easing":"easeInOut"},
  {"targetId":"api","property":"opacity","time":0,"value":0},
  {"targetId":"api","property":"opacity","time":1500,"value":0},
  {"targetId":"api","property":"opacity","time":2000,"value":1,"easing":"easeOut"},
  {"targetId":"a2","property":"opacity","time":0,"value":0},
  {"targetId":"a2","property":"opacity","time":2000,"value":1},
  {"targetId":"a2","property":"drawProgress","time":2000,"value":0},
  {"targetId":"a2","property":"drawProgress","time":3000,"value":1,"easing":"easeInOut"},
  {"targetId":"db","property":"opacity","time":0,"value":0},
  {"targetId":"db","property":"opacity","time":3000,"value":0},
  {"targetId":"db","property":"opacity","time":3500,"value":1,"easing":"easeOut"}
]' })

// 3. Set clip range and save
set_clip_range({ start: 0, end: 4500 })
save_checkpoint({ id: "arch-demo" })
```
