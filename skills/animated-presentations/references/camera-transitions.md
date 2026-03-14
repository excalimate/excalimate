# Camera Transition Patterns

Pre-built camera keyframe sequences for smooth scene transitions.

## 1. Horizontal Pan (Side-by-Side Scenes)
**Use for**: Linear progression, timeline narratives

```javascript
// Scenes at x=0, x=2000, x=4000
add_camera_keyframes_batch([
  // Scene 1: Hold position during reveals
  { time: 0, x: 0, y: 0, width: 1600, easing: "linear" },
  { time: 3500, x: 0, y: 0, width: 1600, easing: "easeInOutCubic" },
  
  // Smooth pan to Scene 2
  { time: 5000, x: 2000, y: 0, width: 1600, easing: "easeInOutCubic" },
  { time: 8500, x: 2000, y: 0, width: 1600, easing: "easeInOutCubic" },
  
  // Smooth pan to Scene 3  
  { time: 10000, x: 4000, y: 0, width: 1600, easing: "easeInOutCubic" },
  { time: 13500, x: 4000, y: 0, width: 1600, easing: "linear" }
])
```

## 2. Vertical Scroll (Stacked Scenes)
**Use for**: Document-style flow, reading progression

```javascript  
// Scenes at y=0, y=1200, y=2400
add_camera_keyframes_batch([
  // Scene 1: Top
  { time: 0, x: 0, y: 0, width: 1600, easing: "linear" },
  { time: 4000, x: 0, y: 0, width: 1600, easing: "easeInOutCubic" },
  
  // Scroll down to Scene 2
  { time: 5500, x: 0, y: 1200, width: 1600, easing: "easeInOutCubic" },
  { time: 9500, x: 0, y: 1200, width: 1600, easing: "easeInOutCubic" },
  
  // Scroll down to Scene 3
  { time: 11000, x: 0, y: 2400, width: 1600, easing: "easeInOutCubic" },
  { time: 15000, x: 0, y: 2400, width: 1600, easing: "linear" }
])
```

## 3. Zoom In Transition
**Use for**: Focus progression, detail exploration

```javascript
// Start wide, zoom into details
add_camera_keyframes_batch([
  // Scene 1: Wide overview
  { time: 0, x: 1600, y: 900, width: 3200, easing: "linear" },
  { time: 4000, x: 1600, y: 900, width: 3200, easing: "easeInOutCubic" },
  
  // Zoom into detail area 1
  { time: 6000, x: 800, y: 450, width: 1600, easing: "easeInOutCubic" },
  { time: 10000, x: 800, y: 450, width: 1600, easing: "easeInOutCubic" },
  
  // Pan to detail area 2 (same zoom level)
  { time: 12000, x: 2400, y: 450, width: 1600, easing: "easeInOutCubic" },
  { time: 16000, x: 2400, y: 450, width: 1600, easing: "linear" }
])
```

## 4. Overview→Detail→Overview Cycle
**Use for**: System architecture, component exploration

```javascript
add_camera_keyframes_batch([
  // Start: Overview
  { time: 0, x: 2000, y: 1000, width: 4000, easing: "linear" },
  { time: 3000, x: 2000, y: 1000, width: 4000, easing: "easeInOutCubic" },
  
  // Zoom into Detail 1
  { time: 5000, x: 800, y: 450, width: 1600, easing: "easeInOutCubic" },
  { time: 8000, x: 800, y: 450, width: 1600, easing: "easeInOutCubic" },
  
  // Back to Overview  
  { time: 10000, x: 2000, y: 1000, width: 4000, easing: "easeInOutCubic" },
  { time: 12000, x: 2000, y: 1000, width: 4000, easing: "easeInOutCubic" },
  
  // Zoom into Detail 2
  { time: 14000, x: 3200, y: 450, width: 1600, easing: "easeInOutCubic" },
  { time: 17000, x: 3200, y: 450, width: 1600, easing: "easeInOutCubic" },
  
  // Final Overview
  { time: 19000, x: 2000, y: 1000, width: 4000, easing: "easeInOutCubic" },
  { time: 22000, x: 2000, y: 1000, width: 4000, easing: "linear" }
])
```

## 5. Cinematic Fly-Over (Diagonal Movement)
**Use for**: Dramatic reveals, landscape presentations

```javascript
// Diagonal movement with zoom changes
add_camera_keyframes_batch([
  // Start: Top-left, wide
  { time: 0, x: 0, y: 0, width: 2400, easing: "linear" },
  { time: 2000, x: 0, y: 0, width: 2400, easing: "easeInOutCubic" },
  
  // Fly to center, zoom in
  { time: 5000, x: 1600, y: 800, width: 1600, easing: "easeInOutCubic" },
  { time: 8000, x: 1600, y: 800, width: 1600, easing: "easeInOutCubic" },
  
  // Continue to bottom-right, zoom out
  { time: 11000, x: 3200, y: 1600, width: 2000, easing: "easeInOutCubic" },
  { time: 14000, x: 3200, y: 1600, width: 2000, easing: "easeInOutCubic" },
  
  // Final dramatic zoom in
  { time: 16000, x: 2400, y: 1200, width: 800, easing: "easeInOutCubic" },
  { time: 18000, x: 2400, y: 1200, width: 800, easing: "linear" }
])
```

## Transition Timing Guidelines

**Transition Speed**:
- **Fast**: 1000-1500ms (snappy, energetic)
- **Standard**: 1500-2000ms (smooth, professional)  
- **Slow**: 2000-3000ms (cinematic, dramatic)

**Hold Duration** (before transition):
- **Quick pace**: 2000-3000ms
- **Standard**: 3000-4000ms
- **Detailed content**: 4000-6000ms

**Easing Functions**:
- **easeInOutCubic**: Smooth, professional (recommended)
- **easeInQuart**: Slow start, fast finish
- **easeOutBounce**: Playful, attention-getting
- **linear**: Mechanical, consistent speed

## Camera Position Calculations

**For horizontal pans**:
```
Scene N position = N × (sceneWidth + gap)
Gap recommendation: 25% of scene width
```

**For grid layouts**:
```
Column: x = col × (sceneWidth + horizontalGap)  
Row: y = row × (sceneHeight + verticalGap)
```

**For zoom hierarchy**:
```
Overview width = detailWidth × zoomFactor
Common zoom factors: 2x, 3x, 4x
```