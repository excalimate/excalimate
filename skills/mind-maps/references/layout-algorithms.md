# Mind Map Layout Algorithms

## 1. Radial Layout (Primary)
Perfect for classic mind maps with central concept and equal-weight branches.

### Mathematical Formula
```javascript
// For N branches around center (centerX, centerY)
for (let i = 0; i < totalBranches; i++) {
  const angle = (2 * Math.PI * i) / totalBranches;
  const x = centerX + distance * Math.cos(angle);
  const y = centerY + distance * Math.sin(angle);
}
```

### Distance Guidelines
- **Primary branches**: 300px from center
- **Sub-branches**: 200px from parent
- **Start angle**: -π/2 (12 o'clock position)
- **Minimum node spacing**: 150px

### Best For
- Brainstorming sessions
- Topic exploration
- Feature mapping
- Concept hierarchies

## 2. Right-Side Tree Layout
Hierarchical layout with center-left root and branches extending right.

### Positioning Logic
```javascript
const levels = [
  { x: 400, y: 500 }, // Root level
  { x: 700, y: [350, 450, 550, 650] }, // Level 1 - vertical spread
  { x: 1000, y: [300, 400, 500, 600, 700, 800] } // Level 2 - more spread
];
```

### Spacing Rules
- **Horizontal gap**: 300px between levels
- **Vertical spacing**: 100px minimum between siblings
- **Child offset**: ±50px from parent Y position

### Best For
- Process flows
- Decision trees
- Organizational charts
- Sequential concepts

## 3. Clustered Groups Layout
Multiple sub-clusters around a central theme.

### Cluster Positioning
```javascript
// 3-4 clusters positioned around center
const clusters = [
  { centerX: 600, centerY: 300, radius: 150 }, // Top cluster
  { centerX: 1000, centerY: 500, radius: 150 }, // Right cluster  
  { centerX: 600, centerY: 700, radius: 150 }, // Bottom cluster
  { centerX: 200, centerY: 500, radius: 150 }  // Left cluster
];
```

### Within-Cluster Layout
- **Mini-radial**: 3-5 nodes per cluster
- **Cluster radius**: 120-180px
- **Node size**: Smaller (140×40px)

### Best For
- Multi-faceted topics
- Category-based thinking
- Comparing different approaches
- Complex subject breakdowns

## Layout Selection Guide

| Use Case | Layout | Why |
|----------|--------|-----|
| General brainstorming | Radial | Equal emphasis on all branches |
| Step-by-step process | Right-side tree | Shows sequence and hierarchy |
| Multiple perspectives | Clustered groups | Separates different viewpoints |
| Simple concept map | Radial | Clean, balanced appearance |
| Complex workflows | Right-side tree | Clear progression logic |
| Comparative analysis | Clustered groups | Groups similar concepts |

## Dynamic Spacing

### Responsive Node Positioning
```javascript
// Adjust spacing based on text length
const baseWidth = 160;
const padding = 20;
const nodeWidth = Math.max(baseWidth, textLength * 8 + padding);

// Increase distance if nodes would overlap
const requiredSpacing = nodeWidth + 50;
if (currentSpacing < requiredSpacing) {
  distance *= (requiredSpacing / currentSpacing);
}
```

### Collision Avoidance
- Check overlaps before finalizing positions
- Nudge nodes outward if needed
- Maintain visual hierarchy while preventing collisions