# Animation Recipes

Full `add_keyframes_batch` JSON patterns for common animation sequences.

## 1. Stage-by-Stage Left-to-Right Reveal

**Pattern**: Reveal pipeline components in stages from left to right

```json
{
  "keyframes": [
    {
      "elementIds": ["source1", "source1-label", "source2", "source2-label"],
      "property": "opacity", "value": 1,
      "startTime": 0, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow1", "arrow2"],
      "property": "opacity", "value": 1,
      "startTime": 500, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["queue", "queue-label"],
      "property": "opacity", "value": 1,
      "startTime": 1200, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow3"],
      "property": "opacity", "value": 1,
      "startTime": 1700, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["transform", "transform-label"],
      "property": "opacity", "value": 1,
      "startTime": 2400, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow4", "arrow5"],
      "property": "opacity", "value": 1,
      "startTime": 2900, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["sink1", "sink1-label", "sink2", "sink2-label"],
      "property": "opacity", "value": 1,
      "startTime": 3600, "duration": 500, "easing": "ease-out"
    }
  ]
}
```

## 2. Data Packet Animation

**Pattern**: Simulate data packets moving through the pipeline

```json
{
  "keyframes": [
    {
      "elementIds": ["source", "source-label", "transform", "transform-label", "sink", "sink-label"],
      "property": "opacity", "value": 1,
      "startTime": 0, "duration": 0, "easing": "linear"
    },
    {
      "elementIds": ["arrow1", "arrow2"],
      "property": "opacity", "value": 0.3,
      "startTime": 0, "duration": 0, "easing": "linear"
    },
    {
      "elementIds": ["packet1"],
      "property": "translateX", "value": 0,
      "startTime": 0, "duration": 0, "easing": "linear"
    },
    {
      "elementIds": ["packet1"],
      "property": "translateX", "value": 350,
      "startTime": 500, "duration": 1000, "easing": "ease-in-out"
    },
    {
      "elementIds": ["packet1"],
      "property": "opacity", "value": 0,
      "startTime": 1500, "duration": 200, "easing": "ease-out"
    },
    {
      "elementIds": ["packet2"],
      "property": "translateX", "value": 0,
      "startTime": 1700, "duration": 0, "easing": "linear"
    },
    {
      "elementIds": ["packet2"],
      "property": "translateX", "value": 400,
      "startTime": 2000, "duration": 1000, "easing": "ease-in-out"
    },
    {
      "elementIds": ["packet2"],
      "property": "opacity", "value": 0,
      "startTime": 3000, "duration": 200, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow1", "arrow2"],
      "property": "opacity", "value": 1,
      "startTime": 500, "duration": 2700, "easing": "ease-out"
    }
  ]
}
```

**Note**: Packet elements should be small circles positioned at source locations:
```json
{
  "id": "packet1", "type": "ellipse",
  "x": 130, "y": 305, "width": 20, "height": 20,
  "strokeColor": "#495057", "backgroundColor": "#f8f9fa", "opacity": 1
}
```

## 3. Fan-Out Burst Animation

**Pattern**: Router sends data to multiple consumers with staggered timing

```json
{
  "keyframes": [
    {
      "elementIds": ["source", "source-label"],
      "property": "opacity", "value": 1,
      "startTime": 0, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow1"],
      "property": "opacity", "value": 1,
      "startTime": 500, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["router", "router-label"],
      "property": "opacity", "value": 1,
      "startTime": 1200, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["router"],
      "property": "scale", "value": 1.2,
      "startTime": 1700, "duration": 300, "easing": "ease-out"
    },
    {
      "elementIds": ["router"],
      "property": "scale", "value": 1.0,
      "startTime": 2000, "duration": 300, "easing": "ease-in"
    },
    {
      "elementIds": ["arrow2"],
      "property": "opacity", "value": 1,
      "startTime": 2300, "duration": 400, "easing": "ease-out"
    },
    {
      "elementIds": ["consumer1", "consumer1-label"],
      "property": "opacity", "value": 1,
      "startTime": 2700, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow3"],
      "property": "opacity", "value": 1,
      "startTime": 2500, "duration": 400, "easing": "ease-out"
    },
    {
      "elementIds": ["consumer2", "consumer2-label"],
      "property": "opacity", "value": 1,
      "startTime": 2900, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow4"],
      "property": "opacity", "value": 1,
      "startTime": 2700, "duration": 400, "easing": "ease-out"
    },
    {
      "elementIds": ["consumer3", "consumer3-label"],
      "property": "opacity", "value": 1,
      "startTime": 3100, "duration": 500, "easing": "ease-out"
    }
  ]
}
```

## 4. Error Path Highlight

**Pattern**: Show normal flow, then highlight error handling path

```json
{
  "keyframes": [
    {
      "elementIds": ["source", "source-label", "kafka", "kafka-label", "consumer1", "consumer1-label", "consumer2", "consumer2-label"],
      "property": "opacity", "value": 1,
      "startTime": 0, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow1", "arrow2", "arrow3"],
      "property": "opacity", "value": 1,
      "startTime": 500, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["consumer1", "consumer1-label"],
      "property": "strokeColor", "value": "#e03131",
      "startTime": 2000, "duration": 300, "easing": "ease-out"
    },
    {
      "elementIds": ["consumer1", "consumer1-label"],
      "property": "scale", "value": 1.1,
      "startTime": 2000, "duration": 300, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow4"],
      "property": "opacity", "value": 1,
      "startTime": 2300, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow4"],
      "property": "strokeColor", "value": "#e03131",
      "startTime": 2300, "duration": 0, "easing": "linear"
    },
    {
      "elementIds": ["dlq", "dlq-label"],
      "property": "opacity", "value": 1,
      "startTime": 3000, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["dlq"],
      "property": "scale", "value": 1.1,
      "startTime": 3500, "duration": 400, "easing": "ease-out"
    },
    {
      "elementIds": ["dlq"],
      "property": "scale", "value": 1.0,
      "startTime": 3900, "duration": 400, "easing": "ease-in"
    },
    {
      "elementIds": ["consumer1", "consumer1-label"],
      "property": "strokeColor", "value": "#6741d9",
      "startTime": 4500, "duration": 300, "easing": "ease-out"
    },
    {
      "elementIds": ["consumer1", "consumer1-label"],
      "property": "scale", "value": 1.0,
      "startTime": 4500, "duration": 300, "easing": "ease-in"
    },
    {
      "elementIds": ["arrow4"],
      "property": "strokeColor", "value": "#495057",
      "startTime": 4500, "duration": 300, "easing": "ease-out"
    }
  ]
}
```

## Animation Timing Guidelines

### Standard Timing Pattern
- **Component fade-in**: 500ms duration
- **Arrow draw**: 700ms duration  
- **Stage delays**: 500-700ms between stages
- **Scale effects**: 300-400ms for emphasis
- **Color changes**: 0-300ms (instant or quick)

### Easing Patterns
- **Fade-ins**: `ease-out` for smooth appearance
- **Movement**: `ease-in-out` for natural flow
- **Scale up**: `ease-out` for pop effect
- **Scale down**: `ease-in` for settle effect
- **Color changes**: `linear` for instant, `ease-out` for gradual

### Staggered Reveals
- **Parallel components**: Start simultaneously
- **Sequential stages**: 200-300ms stagger between similar elements
- **Fan-out**: 200-400ms delay between branches
- **Error highlights**: 1-2 second delay after normal flow

### Data Packet Movement
- **Speed**: 1000-1500ms to traverse one stage
- **Trail effect**: Overlap packet movements by 200-500ms
- **Fade out**: 200ms at destination
- **Arrow highlights**: Illuminate during packet transit

## Usage Tips

1. **Always start with opacity: 0** on all animated elements
2. **Use consistent timing** for similar animation types
3. **Group related elements** in the same keyframe for sync
4. **Add emphasis effects** (scale, color) for important moments
5. **Test timing** - adjust durations for optimal viewing experience