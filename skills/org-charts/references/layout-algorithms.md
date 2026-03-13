# Layout Algorithms for Org Charts

This reference covers three main layout algorithms for organizing hierarchical structures in org charts.

## 1. Balanced Top-Down Layout (Primary)

### Algorithm Overview
Centers children horizontally under each parent, creating a balanced tree structure.

### Positioning Logic
```javascript
function calculateLayout(node, parentX = 500, parentY = 50, level = 0) {
  const CARD_WIDTH = 200;
  const CARD_HEIGHT = 80;
  const HORIZONTAL_GAP = 30;
  const VERTICAL_GAP = 180;
  
  // Position current node
  node.x = parentX - CARD_WIDTH/2;
  node.y = parentY;
  
  if (node.children && node.children.length > 0) {
    // Calculate total width needed for children
    const childrenCount = node.children.length;
    const totalWidth = childrenCount * CARD_WIDTH + (childrenCount - 1) * HORIZONTAL_GAP;
    
    // Starting X position for leftmost child
    const startX = parentX - totalWidth/2 + CARD_WIDTH/2;
    
    // Position each child
    node.children.forEach((child, index) => {
      const childX = startX + index * (CARD_WIDTH + HORIZONTAL_GAP);
      const childY = parentY + VERTICAL_GAP;
      
      calculateLayout(child, childX, childY, level + 1);
    });
  }
  
  return node;
}
```

### Centering Mathematics
- **Total Width**: `N × cardWidth + (N-1) × gap`
- **Start Position**: `parentCenter - totalWidth/2`
- **Child Position**: `startPos + index × (cardWidth + gap)`

### Example Calculation
For 3 children under a parent at x=500:
- Total width: 3×200 + 2×30 = 660px
- Start position: 500 - 660/2 = 170px
- Child positions: 170, 400, 630

## 2. Left-Aligned Compact Layout

### Algorithm Overview  
Aligns all children to the left edge of the parent, creating a more compact vertical structure.

### Positioning Logic
```javascript
function leftAlignedLayout(node, baseX = 100, baseY = 50, level = 0) {
  const CARD_WIDTH = 200;
  const CARD_HEIGHT = 80;
  const VERTICAL_GAP = 150;
  const LEVEL_INDENT = 250;
  
  // Position current node
  node.x = baseX + level * LEVEL_INDENT;
  node.y = baseY;
  
  let currentY = baseY + VERTICAL_GAP;
  
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      leftAlignedLayout(child, baseX, currentY, level + 1);
      currentY += VERTICAL_GAP;
    });
  }
  
  return node;
}
```

### Use Cases
- Deep hierarchies (5+ levels)
- Narrow display spaces
- Text-heavy role descriptions
- Sequential workflow visualization

## 3. Wide/Flat Layout with Wrapping

### Algorithm Overview
Arranges nodes in rows when horizontal space is limited, wrapping to new levels as needed.

### Positioning Logic
```javascript
function wideWrappingLayout(node, canvasWidth = 1200, startY = 50) {
  const CARD_WIDTH = 200;
  const CARD_HEIGHT = 80;
  const HORIZONTAL_GAP = 30;
  const VERTICAL_GAP = 120;
  const MARGIN = 50;
  
  const maxCardsPerRow = Math.floor((canvasWidth - 2 * MARGIN) / (CARD_WIDTH + HORIZONTAL_GAP));
  
  function layoutLevel(nodes, y) {
    const rows = [];
    let currentRow = [];
    
    nodes.forEach(node => {
      if (currentRow.length >= maxCardsPerRow) {
        rows.push(currentRow);
        currentRow = [];
      }
      currentRow.push(node);
    });
    
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    let currentY = y;
    
    rows.forEach(row => {
      const rowWidth = row.length * CARD_WIDTH + (row.length - 1) * HORIZONTAL_GAP;
      const startX = (canvasWidth - rowWidth) / 2;
      
      row.forEach((node, index) => {
        node.x = startX + index * (CARD_WIDTH + HORIZONTAL_GAP);
        node.y = currentY;
      });
      
      currentY += CARD_HEIGHT + VERTICAL_GAP;
    });
    
    return currentY;
  }
  
  // Layout each level
  let currentY = startY;
  let currentLevel = [node];
  
  while (currentLevel.length > 0) {
    currentY = layoutLevel(currentLevel, currentY);
    
    // Collect next level
    const nextLevel = [];
    currentLevel.forEach(n => {
      if (n.children) {
        nextLevel.push(...n.children);
      }
    });
    
    currentLevel = nextLevel;
  }
}
```

### Wrapping Rules
- **Cards per row**: `(canvasWidth - 2×margin) / (cardWidth + gap)`
- **Row positioning**: Center each row within canvas width
- **Vertical spacing**: Consistent gaps between wrapped levels

## Layout Selection Guidelines

### Balanced Top-Down (Default)
**Use when:**
- Standard org charts (2-4 levels)
- Clear hierarchical relationships
- Adequate horizontal space
- Traditional corporate structure

**Avoid when:**
- More than 6 children per parent
- Deep hierarchies (5+ levels)
- Very wide structures

### Left-Aligned Compact
**Use when:**
- Deep organizational structures
- Limited horizontal space
- Process flows or decision trees
- Mobile or narrow displays

**Avoid when:**
- Wide flat structures
- Need to emphasize peer relationships
- Visual balance is important

### Wide/Flat with Wrapping
**Use when:**
- Many peer-level roles
- Large teams or departments
- Fixed canvas constraints
- Grid-like organizational structures

**Avoid when:**
- Clear hierarchy emphasis needed
- Few nodes per level
- Vertical space is limited

## Advanced Layout Considerations

### Dynamic Spacing
Adjust gaps based on content length and canvas size:

```javascript
const dynamicGap = Math.max(30, Math.min(80, canvasWidth / totalNodes));
```

### Collision Detection
Prevent node overlap in complex hierarchies:

```javascript
function detectCollisions(nodes) {
  return nodes.some((a, i) => 
    nodes.slice(i + 1).some(b => 
      Math.abs(a.x - b.x) < CARD_WIDTH + HORIZONTAL_GAP &&
      Math.abs(a.y - b.y) < CARD_HEIGHT + VERTICAL_GAP
    )
  );
}
```

### Responsive Layouts
Adapt layout based on canvas dimensions:

```javascript
function chooseLayout(hierarchy, canvasWidth, canvasHeight) {
  const nodeCount = countNodes(hierarchy);
  const maxDepth = getMaxDepth(hierarchy);
  const maxWidth = getMaxWidth(hierarchy);
  
  if (maxWidth > 6 || canvasWidth < 800) {
    return 'wrapping';
  } else if (maxDepth > 4 || canvasWidth < 1000) {
    return 'leftAligned';  
  } else {
    return 'balanced';
  }
}
```

Each algorithm serves different organizational structures and display constraints. The balanced top-down approach works best for most traditional org charts, while the alternatives handle edge cases and space constraints effectively.