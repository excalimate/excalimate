# Animation Recipes for Org Charts

This reference provides detailed animation patterns and timing formulas for bringing organizational charts to life.

## Core Animation Patterns

### 1. Level-by-Level Top-Down Reveal

The primary animation pattern that reveals the hierarchy from top to bottom, level by level.

#### Timing Structure
```javascript
const LEVEL_BASE_TIME = 500;     // Time for root element
const LEVEL_DURATION = 1000;     // Duration allocated per level  
const STAGGER_DELAY = 200;       // Delay between siblings
const CONNECTOR_OFFSET = 500;    // Delay for connectors after nodes

function calculateLevelTiming(level, siblingIndex) {
  const levelStartTime = LEVEL_BASE_TIME + level * LEVEL_DURATION;
  const elementStartTime = levelStartTime + siblingIndex * STAGGER_DELAY;
  const connectorStartTime = levelStartTime + CONNECTOR_OFFSET;
  
  return { elementStartTime, connectorStartTime };
}
```

#### Animation Keyframes
```json
{
  "animations": [
    {
      "name": "rootReveal",
      "elementId": "ceo-card",
      "keyframes": [
        {
          "time": 0,
          "opacity": 0,
          "scale": 0,
          "ease": "easeOutBack"
        },
        {
          "time": 500, 
          "opacity": 1,
          "scale": 1,
          "ease": "easeOutBack"
        }
      ]
    },
    {
      "name": "level1Stagger",
      "type": "stagger",
      "elementIds": ["vp1-card", "vp2-card", "vp3-card"],
      "keyframes": [
        {
          "time": 1500,
          "opacity": 0,
          "scale": 0,
          "y": "+=20"
        },
        {
          "time": 1700,
          "opacity": 1, 
          "scale": 1,
          "y": "-=20"
        }
      ],
      "staggerDelay": 200
    },
    {
      "name": "connectorsLevel1",
      "elementIds": ["main-line", "horizontal-line", "vp1-connector", "vp2-connector", "vp3-connector"],
      "keyframes": [
        {
          "time": 2000,
          "strokeDasharray": "0,1000",
          "opacity": 0
        },
        {
          "time": 2700,
          "strokeDasharray": "1000,0", 
          "opacity": 1
        }
      ]
    }
  ]
}
```

### 2. Branch-by-Branch Reveal

Reveals one complete branch (parent + all descendants) before moving to the next branch.

#### Timing Structure
```javascript
function calculateBranchTiming(branchIndex, nodeDepthInBranch) {
  const BRANCH_BASE_TIME = 500;
  const BRANCH_DURATION = 2000;    // Total time per branch
  const NODE_STAGGER = 300;        // Time between nodes in branch
  
  const branchStartTime = BRANCH_BASE_TIME + branchIndex * BRANCH_DURATION;
  const nodeStartTime = branchStartTime + nodeDepthInBranch * NODE_STAGGER;
  
  return nodeStartTime;
}
```

#### Complete Example
```json
{
  "animations": [
    {
      "name": "rootFirst",
      "elementId": "ceo-card",
      "keyframes": [
        {"time": 0, "opacity": 0, "scale": 0},
        {"time": 500, "opacity": 1, "scale": 1}
      ]
    },
    {
      "name": "engineeringBranch", 
      "elementIds": ["vp-eng-card", "dir-eng1-card", "dir-eng2-card"],
      "type": "sequence",
      "keyframes": [
        {"time": 1000, "opacity": 0, "x": "-=50"},
        {"time": 1300, "opacity": 1, "x": "+=50"}
      ],
      "sequenceDelay": 300
    },
    {
      "name": "engineeringConnectors",
      "elementIds": ["eng-main-line", "eng-horizontal", "eng-dir1-connector", "eng-dir2-connector"],
      "keyframes": [
        {"time": 1900, "strokeDasharray": "0,500"},
        {"time": 2400, "strokeDasharray": "500,0"}
      ]
    },
    {
      "name": "salesBranch",
      "elementIds": ["vp-sales-card", "dir-sales1-card", "dir-sales2-card"], 
      "type": "sequence",
      "keyframes": [
        {"time": 2500, "opacity": 0, "x": "+=50"},
        {"time": 2800, "opacity": 1, "x": "-=50"}
      ],
      "sequenceDelay": 300
    }
  ]
}
```

### 3. Highlight Reporting Chain

Animates a specific path through the hierarchy to show reporting relationships.

#### Chain Selection
```javascript
function findReportingChain(startNodeId, endNodeId, hierarchy) {
  // Find path from start node up to common ancestor, then down to end node
  const pathUp = findPathToRoot(startNodeId, hierarchy);
  const pathDown = findPathToRoot(endNodeId, hierarchy);
  
  // Find common ancestor
  const commonAncestor = findCommonAncestor(pathUp, pathDown);
  
  // Build complete chain
  const upChain = pathUp.slice(0, pathUp.indexOf(commonAncestor) + 1);
  const downChain = pathDown.slice(0, pathDown.indexOf(commonAncestor)).reverse();
  
  return [...upChain, ...downChain];
}
```

#### Highlight Animation
```json
{
  "animations": [
    {
      "name": "showAllNodes",
      "elementIds": ["all-role-cards"],
      "keyframes": [
        {"time": 0, "opacity": 1}
      ]
    },
    {
      "name": "dimNonChainNodes", 
      "elementIds": ["non-chain-cards"],
      "keyframes": [
        {"time": 500, "opacity": 1},
        {"time": 1000, "opacity": 0.3}
      ]
    },
    {
      "name": "highlightChain",
      "elementIds": ["chain-cards"], 
      "type": "sequence",
      "keyframes": [
        {"time": 1000, "strokeWidth": 2, "strokeColor": "#fd7e14"},
        {"time": 1200, "strokeWidth": 4, "strokeColor": "#fd7e14", "scale": 1.05}
      ],
      "sequenceDelay": 400
    },
    {
      "name": "highlightConnectors",
      "elementIds": ["chain-connectors"],
      "keyframes": [
        {"time": 1800, "strokeColor": "#868e96", "strokeWidth": 2},
        {"time": 2300, "strokeColor": "#fd7e14", "strokeWidth": 4}
      ]
    }
  ]
}
```

## Advanced Animation Techniques

### Staggered Entrance with Physics

Creates natural-looking entry animations with easing and slight randomization.

```json
{
  "name": "physicsStagger",
  "elementIds": ["role-cards"],
  "keyframes": [
    {
      "time": 0,
      "opacity": 0,
      "scale": 0.3,
      "y": "+=100",
      "rotation": 15,
      "ease": "easeOutElastic"
    },
    {
      "time": 800,
      "opacity": 1,
      "scale": 1,
      "y": "-=100", 
      "rotation": 0,
      "ease": "easeOutElastic"
    }
  ],
  "staggerDelay": 150,
  "randomizeDelay": 50
}
```

### Morphing Connectors

Animated line drawing with dynamic path changes.

```javascript
function createMorphingConnector(startPoint, endPoint, controlPoints = []) {
  const totalLength = calculatePathLength(startPoint, endPoint, controlPoints);
  
  return {
    "keyframes": [
      {
        "time": 0,
        "strokeDasharray": `0,${totalLength}`,
        "strokeDashoffset": 0
      },
      {
        "time": 700,
        "strokeDasharray": `${totalLength},0`, 
        "strokeDashoffset": 0
      }
    ]
  };
}
```

### Camera Movements

Simulates camera pan and zoom to focus on different parts of large org charts.

```json
{
  "name": "cameraMovements",
  "type": "viewport",
  "keyframes": [
    {
      "time": 0,
      "viewBox": {"x": 0, "y": 0, "width": 1200, "height": 800},
      "ease": "easeInOutQuart"
    },
    {
      "time": 2000,
      "viewBox": {"x": 200, "y": 300, "width": 800, "height": 400},
      "ease": "easeInOutQuart" 
    },
    {
      "time": 4000,
      "viewBox": {"x": 0, "y": 0, "width": 1200, "height": 800},
      "ease": "easeInOutQuart"
    }
  ]
}
```

## Timing Formulas and Constants

### Base Timing Constants
```javascript
const ANIMATION_CONSTANTS = {
  // Base durations (ms)
  ROOT_REVEAL_TIME: 500,
  LEVEL_BASE_DURATION: 1000, 
  NODE_ENTRANCE_DURATION: 400,
  CONNECTOR_DRAW_DURATION: 700,
  
  // Stagger delays (ms)
  SIBLING_STAGGER: 200,
  LEVEL_STAGGER: 1000,
  BRANCH_STAGGER: 2000,
  
  // Easing functions
  DEFAULT_EASE: "easeOutQuart",
  BOUNCE_EASE: "easeOutBack",
  ELASTIC_EASE: "easeOutElastic",
  
  // Scale factors
  MIN_SCALE: 0.3,
  MAX_SCALE: 1.05,
  HOVER_SCALE: 1.1
};
```

### Dynamic Timing Calculation
```javascript
function calculateOptimalTiming(nodeCount, levelCount, animationStyle = "balanced") {
  const baseTime = 500;
  
  switch(animationStyle) {
    case "fast":
      return {
        levelDuration: Math.max(600, 1000 - nodeCount * 20),
        staggerDelay: Math.max(100, 200 - nodeCount * 5),
        totalDuration: baseTime + levelCount * 800
      };
      
    case "slow":
      return {
        levelDuration: 1500 + nodeCount * 10,
        staggerDelay: 300,
        totalDuration: baseTime + levelCount * 2000
      };
      
    case "balanced":
    default:
      return {
        levelDuration: 1000,
        staggerDelay: Math.max(150, Math.min(300, 2000 / nodeCount)),
        totalDuration: baseTime + levelCount * 1200
      };
  }
}
```

## Interactive Animation Triggers

### Hover Effects
```json
{
  "name": "hoverHighlight",
  "trigger": "mouseenter",
  "elementSelector": ".role-card",
  "keyframes": [
    {
      "time": 0,
      "scale": 1,
      "strokeWidth": 2,
      "ease": "easeOutQuart"
    },
    {
      "time": 200,
      "scale": 1.05,
      "strokeWidth": 3,
      "ease": "easeOutQuart"
    }
  ]
}
```

### Click Animations
```json
{
  "name": "expandBranch",
  "trigger": "click", 
  "elementSelector": ".expandable-node",
  "keyframes": [
    {
      "time": 0,
      "children": {"opacity": 0, "scale": 0}
    },
    {
      "time": 500,
      "children": {"opacity": 1, "scale": 1}
    }
  ]
}
```

## Performance Optimization

### Animation Batching
```javascript
function batchAnimations(animations, maxConcurrent = 10) {
  const batches = [];
  let currentBatch = [];
  
  animations.forEach(anim => {
    if (currentBatch.length >= maxConcurrent) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    currentBatch.push(anim);
  });
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  return batches;
}
```

### Memory Management
```javascript
function optimizeForLargeCharts(nodeCount) {
  if (nodeCount > 50) {
    return {
      disableEasing: true,
      reduceStagger: true,
      simplifyConnectors: true,
      batchSize: 5
    };
  }
  
  return {
    disableEasing: false,
    reduceStagger: false, 
    simplifyConnectors: false,
    batchSize: 10
  };
}
```

## Animation Recipes Summary

### Quick Reference
- **Standard reveal**: Level-by-level, 1s per level, 200ms stagger
- **Fast reveal**: Branch-by-branch, 800ms per branch, 150ms stagger  
- **Detailed showcase**: Highlight chain, 400ms per node, 2s total
- **Interactive**: Hover/click with 200ms response time

### Best Practices
1. **Start simple**: Root first, then build complexity
2. **Respect hierarchy**: Animate parents before children
3. **Consistent timing**: Use predictable intervals
4. **Visual feedback**: Show connections after nodes
5. **Performance**: Batch animations for large charts
6. **Accessibility**: Provide reduced-motion alternatives

These animation recipes create engaging, informative organizational chart presentations that reveal structure and relationships through carefully choreographed motion.