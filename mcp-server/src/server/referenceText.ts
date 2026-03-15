export const REFERENCE_TEXT = `# Excalimate MCP Reference

## Excalidraw Element Format

Every element has these base properties:
\`\`\`json
{
  "id": "unique-id",
  "type": "rectangle|ellipse|diamond|arrow|line|text|freedraw|image",
  "x": 100, "y": 200,
  "width": 300, "height": 150,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "isDeleted": false
}
\`\`\`

### Text Elements
\`\`\`json
{
  "type": "text",
  "text": "Hello World",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle"
}
\`\`\`

### Arrow/Line Elements
\`\`\`json
{
  "type": "arrow",
  "points": [[0, 0], [200, 100]],
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "startBinding": null,
  "endBinding": null
}
\`\`\`

### Bound Text (Label on Shape)
Create a text element with \`containerId\` pointing to the shape:
\`\`\`json
{ "type": "text", "containerId": "shape-id", ... }
\`\`\`
And add to the shape: \`"boundElements": [{"id": "text-id", "type": "text"}]\`

## Color Palettes

**Stroke**: #1e1e1e, #e03131, #2f9e44, #1971c2, #f08c00, #6741d9, #0c8599, #e8590c
**Background**: transparent, #ffc9c9, #b2f2bb, #a5d8ff, #ffec99, #d0bfff, #99e9f2, #ffd8a8

## Animatable Properties

| Property | Range | Description |
|----------|-------|-------------|
| opacity | 0–1 | Element visibility (0=hidden, 1=visible) |
| translateX | px | Horizontal position offset |
| translateY | px | Vertical position offset |
| scaleX | 0.1+ | Horizontal scale (1=normal) |
| scaleY | 0.1+ | Vertical scale (1=normal) |
| rotation | degrees | Rotation angle |
| drawProgress | 0–1 | Stroke draw-on progress (for lines/arrows) |

## Easing Types

linear, easeIn, easeOut, easeInOut, easeInQuad, easeOutQuad, easeInOutQuad,
easeInCubic, easeOutCubic, easeInOutCubic, easeInBack, easeOutBack, easeInOutBack,
easeInElastic, easeOutElastic, easeInBounce, easeOutBounce, step

## Workflow

1. Call \`read_me\` (this tool) to get the reference
2. Call \`create_scene\` with Excalidraw elements JSON (or \`clear_scene\` to start fresh)
3. Call \`add_keyframe\` or \`add_keyframes_batch\` to animate elements
4. Use \`create_sequence\` for reveal animations
5. Call \`set_clip_range\` to set export bounds
6. Call \`save_checkpoint\` to persist
7. User opens the checkpoint in the Excalimate web app for preview/export

Use \`clear_scene\` to reset everything (elements + animations) or \`clear_animation\` to keep elements but remove all keyframes.

## Example: Fade-in Rectangle

\`\`\`
1. create_scene: [{"id":"rect1","type":"rectangle","x":100,"y":100,"width":200,"height":100,...}]
2. add_keyframe: {targetId:"rect1", property:"opacity", time:0, value:0}
3. add_keyframe: {targetId:"rect1", property:"opacity", time:1000, value:1, easing:"easeOut"}
\`\`\`
`;

export const EXAMPLES_TEXT = `# Excalimate — Few-Shot Examples

## Example 1: Single Rectangle
\`\`\`
create_scene({ elements: '[{"id":"box1","type":"rectangle","x":200,"y":150,"width":250,"height":120,"strokeColor":"#1971c2","backgroundColor":"#a5d8ff","fillStyle":"solid"}]' })
\`\`\`

## Example 2: Rectangle with Bound Text Label
\`\`\`
create_scene({ elements: '[{"id":"server","type":"rectangle","x":100,"y":100,"width":200,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#a5d8ff","fillStyle":"solid","boundElements":[{"id":"server-label","type":"text"}]},{"id":"server-label","type":"text","x":140,"y":125,"width":120,"height":30,"text":"API Server","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"server"}]' })
\`\`\`

## Example 3: Two Shapes Connected by Arrow
\`\`\`
create_scene({ elements: '[{"id":"A","type":"rectangle","x":100,"y":200,"width":150,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#b2f2bb","fillStyle":"solid"},{"id":"B","type":"rectangle","x":500,"y":200,"width":150,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#a5d8ff","fillStyle":"solid"},{"id":"arrow1","type":"arrow","x":250,"y":240,"width":250,"height":0,"points":[[0,0],[250,0]],"endArrowhead":"arrow","startBinding":{"elementId":"A","focus":0,"gap":1},"endBinding":{"elementId":"B","focus":0,"gap":1}}]' })
\`\`\`

## Example 4: Ellipse and Diamond
\`\`\`
add_elements({ elements: '[{"id":"circle1","type":"ellipse","x":300,"y":100,"width":120,"height":120,"strokeColor":"#e03131","backgroundColor":"#ffc9c9","fillStyle":"solid"},{"id":"diamond1","type":"diamond","x":500,"y":90,"width":140,"height":140,"strokeColor":"#6741d9","backgroundColor":"#d0bfff","fillStyle":"solid"}]' })
\`\`\`

## Example 5: Multi-Point Line
\`\`\`
add_elements({ elements: '[{"id":"line1","type":"line","x":100,"y":300,"width":400,"height":80,"points":[[0,0],[200,-80],[400,0]],"strokeColor":"#e03131","strokeWidth":3}]' })
\`\`\`

## Example 6: Standalone Text
\`\`\`
add_elements({ elements: '[{"id":"title","type":"text","x":200,"y":50,"width":300,"height":50,"text":"Architecture Overview","fontSize":36,"fontFamily":5,"textAlign":"center","strokeColor":"#1e1e1e"}]' })
\`\`\`

---

# Animation Examples

## Example 7: Fade In
\`\`\`
add_keyframe({ targetId: "box1", property: "opacity", time: 0, value: 0 })
add_keyframe({ targetId: "box1", property: "opacity", time: 800, value: 1, easing: "easeOut" })
\`\`\`

## Example 8: Slide In from Left
\`\`\`
add_keyframes_batch({ keyframes: '[{"targetId":"box1","property":"translateX","time":0,"value":-300},{"targetId":"box1","property":"translateX","time":1000,"value":0,"easing":"easeOutCubic"},{"targetId":"box1","property":"opacity","time":0,"value":0},{"targetId":"box1","property":"opacity","time":500,"value":1,"easing":"easeOut"}]' })
\`\`\`

## Example 9: Pop In from Center (Scale Up with Bounce)
\`\`\`
add_keyframes_batch({ keyframes: '[{"targetId":"box1","property":"scaleX","time":0,"value":0.3,"scaleOrigin":"center"},{"targetId":"box1","property":"scaleY","time":0,"value":0.3,"scaleOrigin":"center"},{"targetId":"box1","property":"scaleX","time":600,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},{"targetId":"box1","property":"scaleY","time":600,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},{"targetId":"box1","property":"opacity","time":0,"value":0},{"targetId":"box1","property":"opacity","time":300,"value":1}]' })
\`\`\`

## Example 9b: Scale from Bottom Edge
\`\`\`
add_scale_animation({ targetId: "box1", origin: "bottom", keyframes: '[{"time":0,"scaleX":1,"scaleY":0},{"time":800,"scaleX":1,"scaleY":1,"easing":"easeOutCubic"}]' })
\`\`\`
Scale origins: center, top-left, top-right, bottom-left, bottom-right, top, bottom, left, right.
Add "scaleOrigin" per scaleX/scaleY keyframe in add_keyframes_batch, or use add_scale_animation for a single element.

## Example 10: Draw In an Arrow (Stroke Animation)
\`\`\`
add_keyframe({ targetId: "arrow1", property: "drawProgress", time: 0, value: 0 })
add_keyframe({ targetId: "arrow1", property: "drawProgress", time: 1200, value: 1, easing: "easeInOut" })
\`\`\`

## Example 11: Sequential Reveal — A → Arrow → B (Most Common Pattern)
\`\`\`
add_keyframes_batch({ keyframes: '[
  {"targetId":"A","property":"opacity","time":0,"value":0},
  {"targetId":"A","property":"opacity","time":600,"value":1,"easing":"easeOut"},
  {"targetId":"arrow1","property":"opacity","time":0,"value":0},
  {"targetId":"arrow1","property":"opacity","time":600,"value":0},
  {"targetId":"arrow1","property":"opacity","time":700,"value":1},
  {"targetId":"arrow1","property":"drawProgress","time":600,"value":0},
  {"targetId":"arrow1","property":"drawProgress","time":1800,"value":1,"easing":"easeInOut"},
  {"targetId":"B","property":"opacity","time":0,"value":0},
  {"targetId":"B","property":"opacity","time":1800,"value":0},
  {"targetId":"B","property":"opacity","time":2400,"value":1,"easing":"easeOut"}
]' })
\`\`\`

## Example 12: Bidirectional Flow — A ↔ B
\`\`\`
add_keyframes_batch({ keyframes: '[
  {"targetId":"A","property":"opacity","time":0,"value":0},
  {"targetId":"A","property":"opacity","time":500,"value":1,"easing":"easeOut"},
  {"targetId":"arrowAB","property":"opacity","time":0,"value":0},
  {"targetId":"arrowAB","property":"opacity","time":500,"value":1},
  {"targetId":"arrowAB","property":"drawProgress","time":500,"value":0},
  {"targetId":"arrowAB","property":"drawProgress","time":1500,"value":1,"easing":"easeInOut"},
  {"targetId":"B","property":"opacity","time":0,"value":0},
  {"targetId":"B","property":"opacity","time":1500,"value":0},
  {"targetId":"B","property":"opacity","time":2000,"value":1,"easing":"easeOut"},
  {"targetId":"arrowBA","property":"opacity","time":0,"value":0},
  {"targetId":"arrowBA","property":"opacity","time":2000,"value":1},
  {"targetId":"arrowBA","property":"drawProgress","time":2000,"value":0},
  {"targetId":"arrowBA","property":"drawProgress","time":3000,"value":1,"easing":"easeInOut"}
]' })
\`\`\`

## Example 13: Staggered Reveal via create_sequence
\`\`\`
create_sequence({ elementIds: ["title","box1","arrow1","box2","arrow2","box3"], property: "opacity", startTime: 0, delay: 400, duration: 600 })
\`\`\`
Result: title at 0ms, box1 at 400ms, arrow1 at 800ms, box2 at 1200ms, arrow2 at 1600ms, box3 at 2000ms.

## Example 14: Camera Pan
\`\`\`
set_camera_frame({ x: 300, y: 200, width: 800, aspectRatio: "16:9" })
add_camera_keyframe({ property: "translateX", time: 0, value: -200 })
add_camera_keyframe({ property: "translateX", time: 3000, value: 200, easing: "easeInOut" })
\`\`\`

## Example 15: Camera Zoom In
\`\`\`
add_camera_keyframe({ property: "scaleX", time: 0, value: 2 })
add_camera_keyframe({ property: "scaleY", time: 0, value: 2 })
add_camera_keyframe({ property: "scaleX", time: 2000, value: 1, easing: "easeInOutCubic" })
add_camera_keyframe({ property: "scaleY", time: 2000, value: 1, easing: "easeInOutCubic" })
\`\`\`

## Example 16: Clip Range + Save
\`\`\`
set_clip_range({ start: 0, end: 5000 })
save_checkpoint({ id: "my-animation" })
\`\`\`

---

# Tips

1. Always call create_scene first (or clear_scene to start fresh), then animate.
2. Use add_keyframes_batch for efficiency — one call for many keyframes.
3. Use create_sequence for simple staggered reveals.
4. Bound text inherits container animation — animating arrow opacity also hides its label.
5. drawProgress only works on arrows and lines.
6. easeOutBack gives a nice bounce for pop-in effects.
7. easeInOutCubic is the best general-purpose easing.
8. Set elements to opacity 0 at time 0 if they should appear later.
9. Set clip range before saving — it defines what gets exported.
10. Camera scale > 1 = zoomed out, < 1 = zoomed in.
11. Use delete_items to remove elements AND their animation tracks in one call.
12. Verify your work with animations_of_item, items_visible_in_camera, are_items_in_line, is_camera_centered.

## Example 17: Verify Animation
\`\`\`
animations_of_item({ targetId: "box1" })
// Returns:
//   opacity:
//     0ms 0% ↑ 100% 600ms (easeOut)

items_visible_in_camera({ time: 1000 })
// Returns: 5/8 items visible (62%) at 1000ms

are_items_in_line({ ids: ["box1","box2","box3"], axis: "horizontal" })
// Returns: ✅ Aligned (max deviation: 3px)

is_camera_centered({ axis: "both", time: 0 })
// Returns: ✅ Centered (offsets: dx=5 dy=2)
\`\`\`

## Example 18: Delete and Rebuild
\`\`\`
delete_items({ ids: ["old_box", "old_arrow"] })
// Removes elements + all their animation tracks

clear_scene()
// Nuclear option: removes everything
\`\`\`
`;

