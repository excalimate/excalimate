---
name: animated-presentations
description: >
  Create multi-scene animated presentations with smooth camera transitions using
  the Excalimate MCP server. Use when asked to create presentations, pitch decks,
  animated slide shows, demo walkthroughs, keynote-style reveals, or any sequential
  multi-scene visual narrative — even if the user says "slides" or "deck."
---

# Animated Presentations Skill

Create compelling multi-scene animated presentations using Excalidraw's canvas as your presentation stage. Each "slide" is a region on one large canvas, connected by smooth camera transitions and element animations.

## Canvas-as-Presentation Concept

Instead of traditional slides, use **one large Excalidraw canvas** where each "slide" is a positioned region:
- All content exists on a single canvas
- Each "slide" = a specific rectangular region 
- Camera keyframes pan between regions for smooth transitions
- Elements within each scene have reveal animations
- No page breaks or separate files needed

## Core Workflow

1. **Plan scenes**: Define your narrative flow and scene count
2. **Calculate layout**: Position scenes on canvas using layout patterns
3. **Create ALL elements**: Use `create_scene` to add all text, shapes, arrows
4. **Set initial camera**: Position camera at scene 1 with `set_camera_frame({x,y,width,aspectRatio:"16:9"})`
5. **Animate elements**: Add reveal animations per scene (opacity, scale, position)
6. **Add camera keyframes**: Create smooth transitions between scenes
7. **Set clip range**: Define total animation duration
8. **Save or share**: Use `save_checkpoint` to persist state, or `share_project` for an E2E encrypted share URL

## Scene Layout Strategy

### Horizontal Strip Layout (Recommended)
```
Scene dimensions: 1600×900 (16:9 aspect ratio)
Gap between scenes: 400px
Scene positions:
- Scene 1: x=0, y=0
- Scene 2: x=2000, y=0  
- Scene 3: x=4000, y=0
- Scene N: x=N*(1600+400), y=0
```

### Camera Setup
```javascript
// Position camera at first scene
set_camera_frame({
  x: 0, 
  y: 0, 
  width: 1600, 
  aspectRatio: "16:9"
})
```

## Timing Template

**Per scene duration: ~5000ms**
- Element reveals: 2000ms
- Reading pause: 1500ms  
- Camera transition: 1500ms

**Total for 5 scenes: ~25000ms**

## Camera Transition Pattern

Hold camera position during element reveals, then smoothly pan between scenes:

```javascript
add_camera_keyframes_batch([
  // Scene 1: Hold position
  { time: 0, x: 0, y: 0, width: 1600, easing: "linear" },
  { time: 3500, x: 0, y: 0, width: 1600, easing: "easeInOutCubic" },
  
  // Transition to Scene 2
  { time: 5000, x: 2000, y: 0, width: 1600, easing: "easeInOutCubic" },
  { time: 8500, x: 2000, y: 0, width: 1600, easing: "easeInOutCubic" },
  
  // Transition to Scene 3
  { time: 10000, x: 4000, y: 0, width: 1600, easing: "easeInOutCubic" },
  { time: 13500, x: 4000, y: 0, width: 1600, easing: "linear" }
])
```

## Complete Example: 3-Scene Presentation

### Scene Layout
- **Title Scene**: x=0, y=0 (1600×900)
- **Architecture Scene**: x=2000, y=0 (1600×900)  
- **Summary Scene**: x=4000, y=0 (1600×900)

### Implementation
```javascript
// 1. Create all elements
create_scene([
  // Title Scene (x=0)
  { type: "text", text: "Project Phoenix", x: 800, y: 300, fontSize: 48, bold: true },
  { type: "text", text: "Revolutionary AI Platform", x: 800, y: 400, fontSize: 24 },
  
  // Architecture Scene (x=2000)
  { type: "rectangle", x: 2200, y: 200, width: 300, height: 150, label: "Frontend" },
  { type: "rectangle", x: 2200, y: 450, width: 300, height: 150, label: "Backend" },
  { type: "arrow", startX: 2350, startY: 350, endX: 2350, endY: 450 },
  
  // Summary Scene (x=4000)
  { type: "text", text: "Key Benefits", x: 4800, y: 200, fontSize: 36, bold: true },
  { type: "text", text: "• 10x faster processing", x: 4500, y: 350, fontSize: 18 },
  { type: "text", text: "• 90% cost reduction", x: 4500, y: 400, fontSize: 18 }
])

// 2. Set initial camera position
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })

// 3. Add element animations
add_keyframes_batch([
  // Title scene reveals
  { elementIds: ["title-text"], property: "opacity", keyframes: [
    { time: 500, value: 0 }, { time: 1500, value: 1 }
  ]},
  { elementIds: ["subtitle-text"], property: "opacity", keyframes: [
    { time: 1000, value: 0 }, { time: 2000, value: 1 }
  ]},
  
  // Architecture scene reveals (after camera transition)
  { elementIds: ["frontend-box"], property: "scale", keyframes: [
    { time: 5500, value: 0 }, { time: 6500, value: 1 }
  ]},
  { elementIds: ["backend-box"], property: "scale", keyframes: [
    { time: 6000, value: 0 }, { time: 7000, value: 1 }
  ]},
  
  // Summary scene reveals
  { elementIds: ["benefits-title"], property: "opacity", keyframes: [
    { time: 10500, value: 0 }, { time: 11500, value: 1 }
  ]}
])

// 4. Add camera transitions
add_camera_keyframes_batch([
  // Scene 1: Title
  { time: 0, x: 0, y: 0, width: 1600, easing: "linear" },
  { time: 3500, x: 0, y: 0, width: 1600, easing: "easeInOutCubic" },
  
  // Transition to Scene 2: Architecture  
  { time: 5000, x: 2000, y: 0, width: 1600, easing: "easeInOutCubic" },
  { time: 8500, x: 2000, y: 0, width: 1600, easing: "easeInOutCubic" },
  
  // Transition to Scene 3: Summary
  { time: 10000, x: 4000, y: 0, width: 1600, easing: "easeInOutCubic" },
  { time: 13500, x: 4000, y: 0, width: 1600, easing: "linear" }
])

// 5. Set total duration and save
set_clip_range({ startTime: 0, endTime: 15000 })
save_checkpoint("phoenix-presentation")
// or: share_project()
```

## Best Practices

### Scene Composition
- **Title scenes**: Large centered text with minimal elements
- **Content scenes**: Use grids, boxes, and clear hierarchy
- **Transition scenes**: Bridge concepts with arrows/lines

### Timing Guidelines
- **Fast pace**: 3-4 seconds per scene
- **Standard**: 5-6 seconds per scene  
- **Slow/complex**: 8-10 seconds per scene

### Visual Consistency
- Use consistent fonts, colors, and spacing
- Align elements to invisible grid lines
- Maintain same aspect ratio across scenes

### Animation Polish
- Stagger element reveals by 200-500ms
- Use easeInOutCubic for smooth camera moves
- Hold camera steady during content reveals
- End with subtle camera drift or zoom

## Advanced Techniques

### Scene Transitions
- **Cut**: Instant camera jump (0ms transition)
- **Pan**: Smooth horizontal/vertical movement
- **Zoom**: Change camera width while moving
- **Orbit**: Circular camera path around central point

### Element Choreography
- **Cascade**: Elements appear in sequence
- **Burst**: All elements appear simultaneously
- **Draw-on**: Arrows and lines animate their paths
- **Typewriter**: Text appears character by character

### Narrative Hooks
- Start with intriguing question or statistic
- Use visual metaphors and analogies
- Build suspense before revealing solutions
- End with clear call-to-action

Transform any presentation request into an engaging animated experience that rivals professional keynote software!
