export const REFERENCE_TEXT = `# Excalimate Reference

## Element Format (base properties)
{ id, type, x, y, width, height, strokeColor, backgroundColor, fillStyle, strokeWidth, opacity, groupIds, angle }

Types: rectangle, ellipse, diamond, arrow, line, text, freedraw, image

Text extra: { text, fontSize, fontFamily: 5, textAlign, verticalAlign }
Arrow/Line extra: { points: [[0,0],[dx,dy]], endArrowhead: "arrow"|null }
Bound text: text with containerId → shape with boundElements:[{id,type:"text"}]

## Colors
Stroke: #1e1e1e #e03131 #2f9e44 #1971c2 #f08c00 #6741d9 #0c8599 #e8590c
Fill: transparent #ffc9c9 #b2f2bb #a5d8ff #ffec99 #d0bfff #99e9f2 #ffd8a8

## Animation Properties
opacity (0–1), translateX/Y (px), scaleX/Y (0.1+), rotation (deg), drawProgress (0–1, lines/arrows only)

## Easings
linear, easeIn, easeOut, easeInOut, easeInQuad, easeOutQuad, easeInOutQuad,
easeInCubic, easeOutCubic, easeInOutCubic, easeInBack, easeOutBack, easeInOutBack,
easeInElastic, easeOutElastic, easeInBounce, easeOutBounce, step

## Preferred Workflow
1. Use **create_animated_scene** — one call for elements + keyframes + sequences + camera + clip range
2. Use add_keyframes_batch or create_sequence for incremental changes
3. Use save_checkpoint to persist
4. Verify with animations_of_item, items_visible_in_camera, is_camera_centered

## Key Tips
- Set opacity 0 at time 0 for elements that appear later
- Bound text inherits container animation
- drawProgress only works on arrows/lines
- easeOutBack = nice bounce; easeInOutCubic = best general-purpose
- Camera: scale > 1 = zoomed out, < 1 = zoomed in
- Set clip range before saving
`;

// Use string concatenation for EXAMPLES_TEXT to avoid backtick escaping issues
const CB = '```'; // code block delimiter
export const EXAMPLES_TEXT = `# Excalimate Examples

## Complete Scene (preferred — one call)
${CB}
create_animated_scene({
  elements: '[
    {"id":"A","type":"rectangle","x":100,"y":200,"width":150,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#b2f2bb","fillStyle":"solid","boundElements":[{"id":"A-label","type":"text"}]},
    {"id":"A-label","type":"text","x":120,"y":225,"width":110,"height":30,"text":"Service A","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"A"},
    {"id":"B","type":"rectangle","x":500,"y":200,"width":150,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#a5d8ff","fillStyle":"solid","boundElements":[{"id":"B-label","type":"text"}]},
    {"id":"B-label","type":"text","x":520,"y":225,"width":110,"height":30,"text":"Service B","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"B"},
    {"id":"arrow1","type":"arrow","x":250,"y":240,"width":250,"height":0,"points":[[0,0],[250,0]],"endArrowhead":"arrow"}
  ]',
  keyframes: '[
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
  ]',
  clipEnd: 3000,
  cameraFrame: { x: 375, y: 240, width: 800 }
})
${CB}

## Staggered Reveal (simpler alternative)
${CB}
create_animated_scene({
  elements: '[...elements...]',
  sequences: '[{"elementIds":["title","box1","arrow1","box2"],"delay":400,"duration":600}]',
  clipEnd: 3500
})
${CB}

## Scale Animation (pop-in from center)
${CB}
add_scale_animation({ targetId: "box1", origin: "center", keyframes: '[{"time":0,"scaleX":0.3,"scaleY":0.3},{"time":600,"scaleX":1,"scaleY":1,"easing":"easeOutBack"}]' })
${CB}
Origins: center, top-left, top-right, bottom-left, bottom-right, top, bottom, left, right

## Camera Pan + Zoom
${CB}
set_camera_frame({ x: 300, y: 200, width: 800 })
add_camera_keyframes_batch({ keyframes: '[
  {"property":"translateX","time":0,"value":-200},
  {"property":"translateX","time":3000,"value":200,"easing":"easeInOut"},
  {"property":"scaleX","time":0,"value":1.5},
  {"property":"scaleY","time":0,"value":1.5},
  {"property":"scaleX","time":3000,"value":1,"easing":"easeInOutCubic"},
  {"property":"scaleY","time":3000,"value":1,"easing":"easeInOutCubic"}
]' })
${CB}
`;

