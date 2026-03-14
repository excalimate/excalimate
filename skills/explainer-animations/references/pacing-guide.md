# Pacing Guide

Timing formulas and guidelines for educational explainer animations.

## Base Timing Formulas

### Simple Explanation (3 steps, ~10 seconds)
- **Setup Phase**: 1500ms (base diagram appears)
- **Step Duration**: 2500ms each (500ms reveal + 2000ms reading)
- **Transitions**: 300ms between steps
- **Total**: ~10,000ms

### Medium Explanation (5 steps, ~20 seconds)  
- **Setup Phase**: 2000ms (more complex base diagram)
- **Step Duration**: 3000ms each (500ms reveal + 2500ms reading)
- **Transitions**: 400ms between steps
- **Total**: ~20,000ms

### Complex Explanation (7 steps, ~35 seconds)
- **Setup Phase**: 2500ms (detailed foundation)
- **Step Duration**: 4000ms each (500ms reveal + 3500ms reading)
- **Transitions**: 500ms between steps  
- **Buffer**: 2000ms final pause
- **Total**: ~35,000ms

## Reading Time Calculations

### Text Complexity Multipliers
- **Simple concepts**: 2000ms per line
- **Technical terms**: 2500ms per line
- **Complex relationships**: 3000ms per line
- **Mathematical formulas**: 3500ms per line

### Line Count Guidelines
- **Single concept**: 1-2 lines maximum
- **Process step**: 2-3 lines typical
- **Complex explanation**: 3-4 lines maximum

### Example Calculations
```
"User clicks login button" = 1 line × 2000ms = 2000ms
"Server validates credentials\nagainst database records" = 2 lines × 2500ms = 5000ms  
"Authentication token generated\nusing JWT standard with\n256-bit encryption" = 3 lines × 3000ms = 9000ms
```

## Camera Movement Timing

### Focus Changes Per Step
- **Zoom in**: 800ms before explanation starts
- **Hold focus**: During entire step explanation  
- **Zoom out**: 600ms after step completes
- **Pan to next**: 1000ms smooth transition

### Zoom Level Guidelines
- **Overview**: 0.7x - 0.9x (show full context)
- **Detail**: 1.2x - 1.5x (focus on specific area)
- **Close-up**: 1.6x - 2.0x (examine fine details)

### Example Camera Sequence
```json
{
  "camera": [
    {"time": 0, "x": 400, "y": 300, "zoom": 0.8},
    {"time": 2000, "x": 200, "y": 200, "zoom": 1.3},
    {"time": 5500, "x": 600, "y": 250, "zoom": 1.4},
    {"time": 9000, "x": 400, "y": 300, "zoom": 0.9}
  ]
}
```

## Step Transition Patterns

### Standard Transition
1. Previous callout fades out (300ms)
2. Camera pans to new focus (800ms)  
3. New callout slides in (500ms)
4. Annotation arrow draws on (300ms)
5. Reading pause begins

### Overlapping Transition
1. Camera pans while previous callout still visible (600ms)
2. Previous fades as new slides in (400ms overlap)
3. Arrow draws after callout settles (200ms delay)

### Build-up Transition  
1. Previous elements remain visible (no fade)
2. Camera adjusts to include new area (1000ms)
3. New callout appears near previous (500ms)
4. Connection arrow draws between them (400ms)

## Complexity-Based Pacing

### Beginner Audience
- **Setup**: +500ms (extra context time)
- **Reading**: +1000ms per step (slower pace)
- **Transitions**: +200ms (less rushing)

### Expert Audience  
- **Setup**: -300ms (faster to main content)
- **Reading**: -500ms per step (quicker comprehension)
- **Transitions**: Standard timing

### Mixed Audience
- Use standard timing formulas
- Add optional replay/pause points
- Include complexity indicators

## Multi-Part Explanations

### Chapter Breaks
- **Chapter End**: 1500ms pause with overview
- **Transition Screen**: 2000ms "Next: Chapter Title"
- **Chapter Start**: 1000ms setup before content

### Recap Points
- **Mid-explanation**: 1000ms pause every 3-4 steps
- **Brief recap**: Show previous steps simultaneously (2000ms)
- **Continue**: Smooth transition to next content

## Buffer Time Guidelines

### Animation Buffers
- **Start buffer**: 500ms (ease into content)
- **Between steps**: 200ms (smooth flow)
- **End buffer**: 1000ms (time to absorb)

### Reading Buffers
- **After technical terms**: +500ms
- **After complex diagrams**: +1000ms  
- **Before conclusions**: +800ms

## Performance Considerations

### Frame Rate Timing
- **Smooth animations**: 60fps (16.67ms per frame)
- **Acceptable animations**: 30fps (33.33ms per frame)
- **Minimum**: 24fps (41.67ms per frame)

### Keyframe Density
- **Smooth curves**: Every 100-200ms
- **Linear movements**: Every 300-500ms
- **Static holds**: Single keyframes

## Quality Checkpoints

### Before Animation Creation
- [ ] Calculate total duration using formulas
- [ ] Verify reading time for longest text elements
- [ ] Plan camera movement sequences
- [ ] Identify potential pacing bottlenecks

### During Development
- [ ] Test readability at intended playback speed
- [ ] Verify smooth transitions between steps
- [ ] Check camera movements don't cause motion sickness
- [ ] Ensure consistent pacing throughout

### Before Publishing
- [ ] Watch complete animation without pausing
- [ ] Test with representative audience member
- [ ] Verify all text is legible at normal viewing distance
- [ ] Confirm total length meets target duration

## Timing Templates

### 3-Step Simple Process
```
0-1500ms: Base setup
1500-4000ms: Step 1
4300-6800ms: Step 2  
7100-9600ms: Step 3
9600-10600ms: Conclusion
Total: 10.6s
```

### 5-Step Technical Walkthrough
```
0-2000ms: Foundation
2000-5000ms: Step 1
5400-8400ms: Step 2
8800-11800ms: Step 3
12200-15200ms: Step 4
15600-18600ms: Step 5
18600-20600ms: Summary
Total: 20.6s
```

### 7-Step Comprehensive Tutorial
```
0-2500ms: Introduction
2500-6500ms: Step 1
7000-11000ms: Step 2
11500-15500ms: Step 3
16000-20000ms: Step 4 (with recap)
20500-24500ms: Step 5
25000-29000ms: Step 6
29500-33500ms: Step 7
34000-37000ms: Conclusion
Total: 37s
```