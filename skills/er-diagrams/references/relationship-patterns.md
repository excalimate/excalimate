# Relationship Patterns

Arrow templates and cardinality patterns for ER diagram relationships.

## One-to-One Relationship

```javascript
const oneToOneRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "entity1", focus: 0.5, gap: 5 },
    endBinding: { elementId: "entity2", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 2,
    strokeColor: "#374151"
    // No arrowheads for 1:1
  },
  leftLabel: {
    type: "text",
    text: "1",
    x: 50, y: -10, // Relative to arrow start
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  rightLabel: {
    type: "text", 
    text: "1",
    x: 250, y: -10, // Relative to arrow end
    fontSize: 12,
    fontWeight: "bold", 
    color: "#374151"
  }
};
```

## One-to-Many Relationship

```javascript
const oneToManyRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "parentEntity", focus: 0.5, gap: 5 },
    endBinding: { elementId: "childEntity", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 2,
    strokeColor: "#374151",
    endArrowhead: "arrow" // Arrow on "many" side only
  },
  parentLabel: {
    type: "text",
    text: "1",
    x: 50, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  childLabel: {
    type: "text",
    text: "N", 
    x: 250, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  relationshipName: {
    type: "text",
    text: "has",
    x: 150, y: -25, // Above the line
    fontSize: 10,
    textAlign: "center",
    color: "#6b7280"
  }
};
```

## Many-to-Many Relationship (Direct)

```javascript
const manyToManyDirect = {
  arrow: {
    type: "arrow", 
    startBinding: { elementId: "entity1", focus: 0.5, gap: 5 },
    endBinding: { elementId: "entity2", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 2,
    strokeColor: "#374151",
    startArrowhead: "arrow",
    endArrowhead: "arrow" // Arrows on both ends
  },
  leftLabel: {
    type: "text",
    text: "N",
    x: 50, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  rightLabel: {
    type: "text",
    text: "N",
    x: 250, y: -10, 
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  }
};
```

## Many-to-Many via Junction Table

```javascript
const manyToManyJunction = {
  // Entity 1 to Junction (1:N)
  leftArrow: {
    type: "arrow",
    startBinding: { elementId: "entity1", focus: 0.5, gap: 5 },
    endBinding: { elementId: "junctionTable", focus: -0.5, gap: 5 },
    points: [[0, 0], [175, 0]],
    strokeWidth: 2,
    strokeColor: "#374151",
    endArrowhead: "arrow"
  },
  leftOneLabel: {
    type: "text",
    text: "1", 
    x: 30, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  leftManyLabel: {
    type: "text",
    text: "N",
    x: 145, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  
  // Junction to Entity 2 (N:1) 
  rightArrow: {
    type: "arrow",
    startBinding: { elementId: "junctionTable", focus: 0.5, gap: 5 },
    endBinding: { elementId: "entity2", focus: -0.5, gap: 5 },
    points: [[0, 0], [175, 0]],
    strokeWidth: 2,
    strokeColor: "#374151",
    endArrowhead: "arrow"
  },
  rightManyLabel: {
    type: "text",
    text: "N",
    x: 30, y: -10,
    fontSize: 12, 
    fontWeight: "bold",
    color: "#374151"
  },
  rightOneLabel: {
    type: "text",
    text: "1",
    x: 145, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  }
};
```

## Self-Referencing Relationship

```javascript
const selfReferencingRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "entity", focus: 0.8, gap: 5 },
    endBinding: { elementId: "entity", focus: 0.2, gap: 5 },
    points: [
      [0, 0],    // Start from entity
      [50, 0],   // Out to the right
      [50, -50], // Up
      [-50, -50], // Left
      [-50, 0],  // Down
      [0, 0]     // Back to entity
    ],
    strokeWidth: 2,
    strokeColor: "#374151",
    endArrowhead: "arrow"
  },
  parentLabel: {
    type: "text",
    text: "1",
    x: 25, y: 10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  childLabel: {
    type: "text", 
    text: "N",
    x: -25, y: 10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  relationshipName: {
    type: "text",
    text: "manages",
    x: 0, y: -60,
    fontSize: 10,
    textAlign: "center", 
    color: "#6b7280"
  }
};
```

## Optional Relationship (Zero-or-One)

```javascript  
const optionalRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "entity1", focus: 0.5, gap: 5 },
    endBinding: { elementId: "entity2", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 2,
    strokeColor: "#374151",
    strokeStyle: "dashed", // Dashed for optional
    endArrowhead: "arrow"
  },
  leftLabel: {
    type: "text",
    text: "1",
    x: 50, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  rightLabel: {
    type: "text",
    text: "0..1", // Zero-or-one notation
    x: 240, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"  
  }
};
```

## Inheritance Relationship (IS-A)

```javascript
const inheritanceRelationship = {
  arrow: {
    type: "arrow", 
    startBinding: { elementId: "childEntity", focus: 0.5, gap: 5 },
    endBinding: { elementId: "parentEntity", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 3,
    strokeColor: "#7c3aed",
    endArrowhead: "triangle", // Triangle for inheritance
    fill: "transparent" // Hollow triangle
  },
  relationshipLabel: {
    type: "text",
    text: "IS-A",
    x: 150, y: -25,
    fontSize: 10,
    fontWeight: "bold", 
    textAlign: "center",
    color: "#7c3aed"
  }
};
```

## Composition Relationship (PART-OF)

```javascript
const compositionRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "partEntity", focus: 0.5, gap: 5 },
    endBinding: { elementId: "wholeEntity", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 2,
    strokeColor: "#dc2626",
    startArrowhead: "diamond", // Filled diamond for composition
    fill: "#dc2626"
  },
  partLabel: {
    type: "text",
    text: "N",
    x: 50, y: -10,
    fontSize: 12,
    fontWeight: "bold", 
    color: "#dc2626"
  },
  wholeLabel: {
    type: "text", 
    text: "1",
    x: 250, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#dc2626"
  },
  relationshipLabel: {
    type: "text",
    text: "PART-OF", 
    x: 150, y: -25,
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    color: "#dc2626"
  }
};
```

## Aggregation Relationship (HAS-A)

```javascript
const aggregationRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "partEntity", focus: 0.5, gap: 5 },
    endBinding: { elementId: "wholeEntity", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 2, 
    strokeColor: "#2563eb",
    startArrowhead: "diamond", // Hollow diamond for aggregation 
    fill: "transparent"
  },
  partLabel: {
    type: "text",
    text: "N",
    x: 50, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563eb"
  },
  wholeLabel: {
    type: "text",
    text: "1", 
    x: 250, y: -10,
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563eb"
  }
};
```

## Identifying vs Non-Identifying Relationships

```javascript
// Identifying relationship (solid line, child PK includes parent PK)
const identifyingRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "parent", focus: 0.5, gap: 5 },
    endBinding: { elementId: "child", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 3, // Thicker for identifying 
    strokeColor: "#374151",
    endArrowhead: "arrow"
  }
};

// Non-identifying relationship (dashed line, child has separate PK)
const nonIdentifyingRelationship = {
  arrow: {
    type: "arrow",
    startBinding: { elementId: "parent", focus: 0.5, gap: 5 },
    endBinding: { elementId: "child", focus: 0.5, gap: 5 },
    points: [[0, 0], [300, 0]],
    strokeWidth: 2,
    strokeStyle: "dashed", // Dashed for non-identifying
    strokeColor: "#374151", 
    endArrowhead: "arrow"
  }
};
```

## Cardinality Positioning Guidelines

### Horizontal Relationships
- Place cardinality labels 10px from entity edges
- Position labels 10px above the relationship line
- Left side: x = entity_edge + 30px
- Right side: x = entity_edge - 30px

### Vertical Relationships  
- Place labels 10px from entity edges
- Position labels 10px to the side of the relationship line
- Top side: y = entity_edge + 30px  
- Bottom side: y = entity_edge - 30px

### Self-Referencing Relationships
- Place parent label near the outgoing point
- Place child label near the incoming point
- Relationship name goes outside the loop curve

## Color Guidelines

- **Standard FK relationships**: `#374151` (dark gray)
- **Optional relationships**: `#6b7280` (medium gray), dashed
- **Inheritance**: `#7c3aed` (purple) 
- **Composition**: `#dc2626` (red)
- **Aggregation**: `#2563eb` (blue)

## Animation Recommendations

1. **Draw-on Effect**: Use strokeDashOffset animation from path length to 0
2. **Timing**: Relationships appear after all entities (stagger by 300ms each)
3. **Labels**: Fade in cardinality labels with the relationship line
4. **Special Types**: Inheritance/composition can use different animation curves

```javascript
// Example relationship animation
add_keyframes_batch([{
  elementIds: [arrow.id, leftLabel.id, rightLabel.id],
  keyframes: [
    { time: startTime, opacity: 0, strokeDashOffset: pathLength },
    { time: startTime + 600, opacity: 1, strokeDashOffset: 0 }
  ]
}]);
```