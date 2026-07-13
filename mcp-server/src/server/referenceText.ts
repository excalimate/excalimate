export const REFERENCE_TEXT = `# Excalimate MCP V2 Reference

## Action-first workflow
1. Create the scene with create_scene or create_animated_scene.
2. Prefer auto_animate, apply_animation_preset, upsert_action_sequence, or create_camera_move.
3. Inspect managed authoring with get_action_sequence and validate_project.
4. Use raw keyframe tools only for effects the action model cannot express.
5. Set the clip range, verify with inspection tools, then save_checkpoint.

Action tools are local and deterministic. The connected MCP client interprets natural language; this server does not call a hosted model or send scene content anywhere.

auto_animate requires both an explicit scope and style:
{ scope: { elementIds: ["title", "box"] }, style: { intensity: "subtle"|"balanced"|"energetic" } }

Managed actions never silently replace customized or unmanaged keyframes. Low-level edits to managed tracks mark the owning action customized; deleting generated content detaches it.

## Element format
Base: { id, type, x, y, width, height, strokeColor, backgroundColor, fillStyle, strokeWidth, opacity, groupIds, angle }
Types: rectangle, ellipse, diamond, arrow, line, text, freedraw, image
Text: { text, fontSize, fontFamily: 5, textAlign, verticalAlign }
Arrow/line: { points: [[0,0],[dx,dy]], endArrowhead: "arrow"|null }

## Action model
Types: fade, slide, draw, pop, sequence, cameraMove
Timing: { startMs, durationMs, staggerMs, startMode: "absolute"|"afterPrevious"|"withPrevious" }
Presets: fade, draw, pop, slide-left, slide-right, slide-up, slide-down
Statuses: managed, customized, disabled, detached

## Low-level animation
Properties: opacity, translateX, translateY, scaleX, scaleY, rotation, drawProgress
Easings: linear, easeIn, easeOut, easeInOut, easeInQuad, easeOutQuad, easeInOutQuad,
easeInCubic, easeOutCubic, easeInOutCubic, easeInBack, easeOutBack, easeInOutBack,
easeInElastic, easeOutElastic, easeInBounce, easeOutBounce, step

Nested arrays are the supported input shape. Legacy JSON-encoded arrays remain compatibility wrappers and return deprecation messages.

## Persistence and sharing
Checkpoints and snapshots use the shared V2 project codec. Legacy MCP checkpoints are migrated when loaded.
share_project is deprecated: the share Worker rejects originless writes and no authenticated MCP server-to-server contract exists. Use save_checkpoint, import the V2 project in the browser, then share from the authenticated browser UI.
`;

const CB = '```';
export const EXAMPLES_TEXT = `# Excalimate MCP V2 Examples

## 1. Create a scene with nested data
${CB}json
{
  "elements": [
    {"id":"service-a","type":"rectangle","x":100,"y":100,"width":180,"height":90},
    {"id":"flow","type":"arrow","x":280,"y":145,"width":220,"height":0,"points":[[0,0],[220,0]],"endArrowhead":"arrow"},
    {"id":"service-b","type":"rectangle","x":500,"y":100,"width":180,"height":90}
  ]
}
${CB}

## 2. Let the shared topology analyzer choose a deterministic recipe
${CB}json
{
  "scope": {"elementIds":["service-a","flow","service-b"]},
  "style": {"intensity":"balanced"}
}
${CB}

## 3. Apply an explicit preset
${CB}json
{
  "preset": {
    "name": "draw",
    "targetIds": ["flow"],
    "timing": {
      "startMs": 600,
      "durationMs": 900,
      "staggerMs": 0,
      "startMode": "absolute"
    }
  }
}
${CB}

## 4. Upsert a deterministic action sequence
${CB}json
{
  "sequence": {
    "actions": [
      {
        "id": "services-reveal",
        "type": "sequence",
        "targetIds": ["service-a","service-b"],
        "timing": {
          "startMs": 0,
          "durationMs": 500,
          "staggerMs": 300,
          "startMode": "absolute"
        },
        "easing": "easeOut",
        "parameters": {"property":"opacity"}
      }
    ]
  }
}
${CB}

## 5. Add low-level keyframes only when needed
${CB}json
{
  "keyframes": [
    {"targetId":"service-a","property":"rotation","time":1800,"value":0},
    {"targetId":"service-a","property":"rotation","time":2200,"value":5,"easing":"easeInOut"},
    {"targetId":"service-a","property":"rotation","time":2600,"value":0,"easing":"easeInOut"}
  ]
}
${CB}

Finish with validate_project, set_clip_range, inspection tools, and save_checkpoint.
`;
