---
name: er-diagrams
description: >
  Create animated entity-relationship and database schema diagrams using the Excalimate
  MCP server. Use when asked to visualize database schemas, data models, table
  relationships, foreign keys, entity relationships, or any structured data design
  with tables and their connections.
---

# ER Diagrams Agent Skill

This skill specializes in creating animated entity-relationship (ER) diagrams and database schema visualizations using Excalidraw elements and keyframe animations.

## Core Workflow

1. **Analyze Schema**: List all entities with their fields and data types
2. **Identify Relationships**: Determine cardinality (1:1, 1:N, M:N) and foreign key connections
3. **Layout Planning**: Position entities to minimize crossing relationship lines
4. **Create Elements**: Build entity rectangles with field lists and connecting arrows
5. **Animate Sequence**: Entities pop-in with staggered timing, then relationships draw-on

## Entity Design Pattern

Each entity consists of:

### Header Rectangle
- Size: 200×40 pixels
- Background color by type:
  - Primary entities: `#1971c2` (blue)
  - Junction tables: `#f08c00` (orange) 
  - Lookup/enum tables: `#2f9e44` (green)
- Stroke color (lighter): `#a5d8ff`, `#ffec99`, `#b2f2bb`
- Entity name as centered text element

### Body Rectangle  
- Size: 200×(fieldCount * 20 + 10) pixels
- White background `#ffffff`
- Same stroke color as header
- Contains field list as single text element

### Field Text Format
```
id: PK
name: varchar(100)
email: varchar(255)
created_at: timestamp
user_id: FK → users
```
- Primary keys marked with "PK"
- Foreign keys marked with "FK → table_name"
- Data types included for clarity

## Relationship Lines

### Arrow Types by Cardinality
- **One-to-One**: Bound arrow with no arrowheads
- **One-to-Many**: Arrow on the "many" side only
- **Many-to-Many**: Arrows on both ends (usually via junction table)

### Cardinality Labels
- Small text elements positioned near arrow endpoints
- "1" for one side, "N" for many side
- Positioned 10px from arrow ends

### Connection Points
- Arrows bound to entity rectangles (header + body as group)
- Auto-connect to closest edge points
- Avoid overlapping with text when possible

## Layout Strategies

### Grid Layout (Default)
- 350px horizontal spacing between entities
- 300px vertical spacing between rows
- Central entity at (400, 300)
- Related entities positioned around center

### Star Layout
- Central entity in middle of canvas
- Related entities radiate outward
- Primary relationships closer (250px radius)
- Secondary relationships further (400px radius)

### Domain Clustering
- Group related entities by business domain
- User domain: users, profiles, sessions
- Content domain: posts, comments, tags
- Admin domain: roles, permissions

## Animation Sequence

### Phase 1: Entity Appearance (0-2000ms)
```javascript
entities.forEach((entity, index) => {
  add_keyframes_batch([{
    elementIds: [entity.headerId, entity.bodyId, entity.nameId, entity.fieldsId],
    keyframes: [{
      time: 0, opacity: 0, scaleX: 0.8, scaleY: 0.8
    }, {
      time: 400 + (index * 200), opacity: 1, scaleX: 1, scaleY: 1
    }]
  }]);
});
```

### Phase 2: Relationship Drawing (2200-4000ms)  
```javascript
relationships.forEach((rel, index) => {
  add_keyframes_batch([{
    elementIds: [rel.arrowId, rel.labelIds],
    keyframes: [{
      time: 2200 + (index * 300), 
      opacity: 0,
      strokeDashOffset: rel.pathLength
    }, {
      time: 2200 + (index * 300) + 800,
      opacity: 1, 
      strokeDashOffset: 0
    }]
  }]);
});
```

## Complete Example: Blog Schema

```javascript
// Users (1) → Posts (N) → Comments (N)
const scene = create_scene({
  name: "Blog Database Schema",
  width: 1200,
  height: 800
});

// Users entity (primary)
const usersHeader = {
  type: "rectangle",
  x: 200, y: 150,
  width: 200, height: 40,
  backgroundColor: "#1971c2",
  strokeColor: "#a5d8ff"
};

const usersBody = {
  type: "rectangle", 
  x: 200, y: 190,
  width: 200, height: 90,
  backgroundColor: "#ffffff",
  strokeColor: "#a5d8ff"
};

const usersName = {
  type: "text",
  text: "users",
  x: 300, y: 170,
  fontSize: 16, fontWeight: "bold",
  textAlign: "center"
};

const usersFields = {
  type: "text",
  text: "id: PK\nusername: varchar(50)\nemail: varchar(255)\ncreated_at: timestamp",
  x: 210, y: 210,
  fontSize: 12,
  width: 180
};

// Posts entity (primary)
const postsHeader = {
  type: "rectangle",
  x: 550, y: 150, 
  width: 200, height: 40,
  backgroundColor: "#1971c2",
  strokeColor: "#a5d8ff"
};

const postsBody = {
  type: "rectangle",
  x: 550, y: 190,
  width: 200, height: 110, 
  backgroundColor: "#ffffff",
  strokeColor: "#a5d8ff"
};

const postsName = {
  type: "text",
  text: "posts",
  x: 650, y: 170,
  fontSize: 16, fontWeight: "bold", 
  textAlign: "center"
};

const postsFields = {
  type: "text",
  text: "id: PK\ntitle: varchar(200)\ncontent: text\nuser_id: FK → users\ncreated_at: timestamp",
  x: 560, y: 210,
  fontSize: 12,
  width: 180
};

// Comments entity (primary)
const commentsHeader = {
  type: "rectangle",
  x: 900, y: 150,
  width: 200, height: 40, 
  backgroundColor: "#1971c2",
  strokeColor: "#a5d8ff"
};

const commentsBody = {
  type: "rectangle",
  x: 900, y: 190,
  width: 200, height: 110,
  backgroundColor: "#ffffff", 
  strokeColor: "#a5d8ff"
};

const commentsName = {
  type: "text", 
  text: "comments",
  x: 1000, y: 170,
  fontSize: 16, fontWeight: "bold",
  textAlign: "center"
};

const commentsFields = {
  type: "text",
  text: "id: PK\ncontent: text\npost_id: FK → posts\nuser_id: FK → users\ncreated_at: timestamp",
  x: 910, y: 210,
  fontSize: 12,
  width: 180
};

// Relationships
const userPostsArrow = {
  type: "arrow",
  startBinding: { elementId: usersBody.id, focus: 0.5, gap: 5 },
  endBinding: { elementId: postsBody.id, focus: 0.5, gap: 5 },
  points: [[0, 0], [350, 0]]
};

const postsCommentsArrow = {
  type: "arrow", 
  startBinding: { elementId: postsBody.id, focus: 0.5, gap: 5 },
  endBinding: { elementId: commentsBody.id, focus: 0.5, gap: 5 },
  points: [[0, 0], [350, 0]]
};

// Cardinality labels
const userPostsOne = {
  type: "text", text: "1", 
  x: 420, y: 235, fontSize: 12
};

const userPostsMany = {
  type: "text", text: "N",
  x: 530, y: 235, fontSize: 12 
};

const postsCommentsOne = {
  type: "text", text: "1",
  x: 770, y: 235, fontSize: 12
};

const postsCommentsMany = {
  type: "text", text: "N", 
  x: 880, y: 235, fontSize: 12
};

// Create all elements
scene.add_elements([
  usersHeader, usersBody, usersName, usersFields,
  postsHeader, postsBody, postsName, postsFields, 
  commentsHeader, commentsBody, commentsName, commentsFields,
  userPostsArrow, postsCommentsArrow,
  userPostsOne, userPostsMany, postsCommentsOne, postsCommentsMany
]);

// Animation sequence
add_keyframes_batch([
  // Phase 1: Users entity (0-400ms)
  {
    elementIds: [usersHeader.id, usersBody.id, usersName.id, usersFields.id],
    keyframes: [
      { time: 0, opacity: 0, scaleX: 0.8, scaleY: 0.8 },
      { time: 400, opacity: 1, scaleX: 1, scaleY: 1 }
    ]
  },
  // Posts entity (400-800ms)
  {
    elementIds: [postsHeader.id, postsBody.id, postsName.id, postsFields.id], 
    keyframes: [
      { time: 400, opacity: 0, scaleX: 0.8, scaleY: 0.8 },
      { time: 800, opacity: 1, scaleX: 1, scaleY: 1 }
    ]
  },
  // Comments entity (800-1200ms)
  {
    elementIds: [commentsHeader.id, commentsBody.id, commentsName.id, commentsFields.id],
    keyframes: [
      { time: 800, opacity: 0, scaleX: 0.8, scaleY: 0.8 },
      { time: 1200, opacity: 1, scaleX: 1, scaleY: 1 }
    ]
  },
  // Phase 2: Relationships (1400-2000ms)
  {
    elementIds: [userPostsArrow.id, userPostsOne.id, userPostsMany.id],
    keyframes: [
      { time: 1400, opacity: 0, strokeDashOffset: 350 },
      { time: 2000, opacity: 1, strokeDashOffset: 0 }
    ]
  },
  {
    elementIds: [postsCommentsArrow.id, postsCommentsOne.id, postsCommentsMany.id],
    keyframes: [
      { time: 1700, opacity: 0, strokeDashOffset: 350 }, 
      { time: 2300, opacity: 1, strokeDashOffset: 0 }
    ]
  }
]);

return scene;
```

## Key Design Principles

1. **Clarity First**: Field names and relationships should be immediately understandable
2. **Visual Hierarchy**: Use colors to distinguish entity types (primary, junction, lookup)
3. **Minimal Crossings**: Layout entities to reduce arrow intersections
4. **Progressive Disclosure**: Animate entities first to establish context, then show connections
5. **Consistent Spacing**: Maintain regular grid spacing for professional appearance

## Common Patterns

- **User Management**: users → roles (M:N via user_roles junction)
- **Content Systems**: categories → posts (1:N) → tags (M:N via post_tags)
- **E-commerce**: customers → orders (1:N) → order_items (1:N) ← products (1:N)
- **Audit Trails**: All entities → audit_log (N:1) with polymorphic relationships

Use this skill when users ask for database diagrams, schema visualization, ER diagrams, data modeling, or any request involving table relationships and foreign keys.