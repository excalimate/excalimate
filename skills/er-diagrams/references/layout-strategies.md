# Layout Strategies

Different approaches to arranging entities and relationships in ER diagrams for optimal readability.

## Grid Layout (Default)

Arranges entities in a regular grid pattern with consistent spacing.

### Grid Coordinates
```javascript
const gridLayout = {
  // Central entity at origin
  centerEntity: { x: 400, y: 300 },
  
  // Primary entities (1 hop from center)
  primaryPositions: [
    { x: 100, y: 300 }, // Left
    { x: 700, y: 300 }, // Right  
    { x: 400, y: 100 }, // Top
    { x: 400, y: 500 }  // Bottom
  ],
  
  // Secondary entities (2 hops from center)
  secondaryPositions: [
    { x: 100, y: 100 }, // Top-left
    { x: 700, y: 100 }, // Top-right
    { x: 100, y: 500 }, // Bottom-left
    { x: 700, y: 500 }, // Bottom-right
    { x: 50, y: 300 },  // Far left
    { x: 750, y: 300 }, // Far right
    { x: 400, y: 50 },  // Far top
    { x: 400, y: 550 }  // Far bottom
  ],
  
  spacing: {
    horizontal: 350, // Between columns
    vertical: 300    // Between rows
  }
};
```

### Usage Example
```javascript
// E-commerce schema with grid layout
const positions = {
  customers: { x: 100, y: 200 },
  orders: { x: 450, y: 200 },
  order_items: { x: 800, y: 200 },
  products: { x: 800, y: 500 },
  categories: { x: 450, y: 500 },
  suppliers: { x: 100, y: 500 }
};
```

**Pros**: Clean, predictable, easy to follow
**Cons**: Can waste space, may create long relationship lines
**Best For**: 4-12 entities, clear hierarchies

## Star Layout  

Central entity in the middle with related entities radiating outward.

### Star Coordinates
```javascript
const starLayout = {
  center: { x: 400, y: 300 },
  
  // Inner ring (primary relationships)
  innerRadius: 250,
  innerPositions: (count) => {
    const angles = [];
    for (let i = 0; i < count; i++) {
      angles.push((i * 2 * Math.PI) / count);
    }
    return angles.map(angle => ({
      x: 400 + Math.cos(angle) * 250,
      y: 300 + Math.sin(angle) * 250
    }));
  },
  
  // Outer ring (secondary relationships)
  outerRadius: 400,
  outerPositions: (count) => {
    const angles = [];
    for (let i = 0; i < count; i++) {
      angles.push((i * 2 * Math.PI) / count);
    }
    return angles.map(angle => ({
      x: 400 + Math.cos(angle) * 400,
      y: 300 + Math.sin(angle) * 400
    }));
  }
};
```

### Usage Example
```javascript
// User-centric social media schema
const userPosition = { x: 400, y: 300 }; // Center

// Inner ring - direct user relationships
const innerEntities = starLayout.innerPositions(6);
const positions = {
  users: userPosition,
  posts: innerEntities[0],     // { x: 650, y: 300 }
  comments: innerEntities[1],   // { x: 525, y: 516 } 
  likes: innerEntities[2],      // { x: 275, y: 516 }
  follows: innerEntities[3],    // { x: 150, y: 300 }
  messages: innerEntities[4],   // { x: 275, y: 84 }
  profiles: innerEntities[5]    // { x: 525, y: 84 }
};

// Outer ring - supporting entities
const outerEntities = starLayout.outerPositions(4);
const supportingPositions = {
  tags: outerEntities[0],
  media: outerEntities[1], 
  notifications: outerEntities[2],
  settings: outerEntities[3]
};
```

**Pros**: Emphasizes central entity, short relationship lines, radial symmetry
**Cons**: Outer entities may be far apart, can get crowded
**Best For**: Clear central entity (users, orders, products), 6-10 entities

## Domain-Clustered Layout

Groups entities by business domain/context with clear separation.

### Domain Cluster Coordinates
```javascript  
const domainLayout = {
  // User Management Domain (top-left)
  userDomain: {
    baseX: 150, baseY: 150,
    entities: {
      users: { x: 150, y: 150 },
      profiles: { x: 150, y: 250 }, 
      roles: { x: 300, y: 150 },
      permissions: { x: 300, y: 250 },
      user_roles: { x: 225, y: 200 } // Junction table centered
    }
  },
  
  // Content Domain (top-right)  
  contentDomain: {
    baseX: 550, baseY: 150,
    entities: {
      posts: { x: 550, y: 150 },
      comments: { x: 700, y: 150 },
      categories: { x: 550, y: 250 },
      tags: { x: 700, y: 250 },
      post_tags: { x: 625, y: 200 }
    }
  },
  
  // Commerce Domain (bottom-left)
  commerceDomain: {
    baseX: 150, baseY: 450,
    entities: {
      products: { x: 150, y: 450 },
      orders: { x: 300, y: 450 },
      order_items: { x: 225, y: 550 },
      inventory: { x: 150, y: 550 },
      suppliers: { x: 300, y: 550 }
    }
  },
  
  // System Domain (bottom-right)
  systemDomain: {
    baseX: 550, baseY: 450, 
    entities: {
      audit_log: { x: 550, y: 450 },
      sessions: { x: 700, y: 450 },
      configs: { x: 550, y: 550 },
      backups: { x: 700, y: 550 }
    }
  },
  
  // Cross-domain spacing
  domainSpacing: {
    horizontal: 400, // Between domain clusters
    vertical: 300    // Between domain rows
  }
};
```

### Usage Example
```javascript
// Full enterprise application schema
const enterprisePositions = {
  // User Management
  users: { x: 150, y: 150 },
  profiles: { x: 150, y: 250 },
  roles: { x: 300, y: 150 },
  permissions: { x: 300, y: 250 },
  user_roles: { x: 225, y: 200 },
  
  // Content Management
  posts: { x: 550, y: 150 },
  comments: { x: 700, y: 150 },
  categories: { x: 550, y: 250 },
  tags: { x: 700, y: 250 },
  post_tags: { x: 625, y: 200 },
  
  // E-commerce
  products: { x: 150, y: 450 },
  orders: { x: 300, y: 450 },
  order_items: { x: 225, y: 550 },
  customers: { x: 450, y: 450 }, // Bridge entity
  
  // System/Audit
  audit_log: { x: 550, y: 450 },
  sessions: { x: 700, y: 450 }
};

// Cross-domain relationships (longer lines)
const crossDomainRelationships = [
  { from: 'users', to: 'posts' },      // User → Content  
  { from: 'users', to: 'orders' },     // User → Commerce
  { from: 'posts', to: 'audit_log' },  // Content → System
  { from: 'orders', to: 'audit_log' }  // Commerce → System
];
```

**Pros**: Clear business context, logical grouping, scalable
**Cons**: Long cross-domain relationships, more complex layout
**Best For**: Large schemas (15+ entities), enterprise applications

## Hierarchical Layout

Arranges entities in a tree-like hierarchy based on dependencies.

### Hierarchy Coordinates
```javascript
const hierarchicalLayout = {
  // Level 0 (root) - Independent entities
  level0: {
    y: 100,
    positions: [
      { x: 200, y: 100 }, // users
      { x: 500, y: 100 }, // categories  
      { x: 800, y: 100 }  // suppliers
    ]
  },
  
  // Level 1 - Depends on level 0
  level1: {
    y: 250,
    positions: [
      { x: 100, y: 250 }, // profiles (users)
      { x: 300, y: 250 }, // posts (users)
      { x: 500, y: 250 }, // products (categories)
      { x: 700, y: 250 }  // purchase_orders (suppliers)
    ]
  },
  
  // Level 2 - Depends on level 1  
  level2: {
    y: 400,
    positions: [
      { x: 200, y: 400 }, // comments (posts)
      { x: 400, y: 400 }, // likes (posts)
      { x: 600, y: 400 }  // order_items (products)
    ]
  },
  
  // Level 3 - Depends on level 2
  level3: {
    y: 550,
    positions: [
      { x: 300, y: 550 }, // comment_likes (comments)
      { x: 500, y: 550 }  // shipments (order_items)  
    ]
  },
  
  levelSpacing: 150, // Vertical spacing between levels
  entitySpacing: 200  // Horizontal spacing within levels
};
```

### Usage Example
```javascript
// Blog platform with clear hierarchy
const blogHierarchy = {
  // Level 0 - Root entities
  users: { x: 200, y: 100 },
  categories: { x: 500, y: 100 },
  
  // Level 1 - User and category dependents
  profiles: { x: 100, y: 250 },
  posts: { x: 300, y: 250 }, // users → posts
  subcategories: { x: 500, y: 250 }, // categories → subcategories
  
  // Level 2 - Post dependents
  comments: { x: 200, y: 400 }, // posts → comments
  likes: { x: 400, y: 400 },    // posts → likes  
  
  // Level 3 - Comment dependents
  comment_replies: { x: 200, y: 550 }, // comments → replies
  comment_votes: { x: 350, y: 550 }    // comments → votes
};
```

**Pros**: Shows dependency chain clearly, top-down flow, good for understanding data flow
**Cons**: Can be tall, doesn't show peer relationships well
**Best For**: Systems with clear hierarchies, dependency visualization

## Temporal Layout

Arranges entities based on their typical creation/usage sequence in time.

### Temporal Flow Coordinates
```javascript
const temporalLayout = {
  // Stage 1 - User onboarding (left)
  onboarding: {
    baseX: 100,
    entities: {
      users: { x: 100, y: 200 },
      profiles: { x: 100, y: 350 },
      verification: { x: 100, y: 500 }
    }
  },
  
  // Stage 2 - Content creation (center-left)
  creation: {
    baseX: 350,
    entities: {
      posts: { x: 350, y: 200 },
      media: { x: 350, y: 350 },
      drafts: { x: 350, y: 500 }
    }
  },
  
  // Stage 3 - Interaction (center-right) 
  interaction: {
    baseX: 600,
    entities: {
      comments: { x: 600, y: 200 },
      likes: { x: 600, y: 350 },
      shares: { x: 600, y: 500 }
    }
  },
  
  // Stage 4 - Analytics/reporting (right)
  analytics: {
    baseX: 850,
    entities: {
      views: { x: 850, y: 200 },
      metrics: { x: 850, y: 350 },
      reports: { x: 850, y: 500 }
    }
  },
  
  stageSpacing: 250, // Horizontal spacing between stages
  flowDirection: 'left-to-right'
};
```

**Pros**: Shows process flow, intuitive for business users, tells a story
**Cons**: May not reflect actual data relationships, can be wide
**Best For**: Workflow systems, business process modeling

## Layout Selection Guidelines

### Small Schemas (4-8 entities)
- **Star Layout**: Clear central entity exists
- **Grid Layout**: Multiple important entities, no clear center
- **Hierarchical**: Strong parent-child relationships

### Medium Schemas (8-15 entities)  
- **Domain Clustered**: Clear business domains (2-3 domains)
- **Grid Layout**: Uniform importance across entities
- **Star Layout**: One dominant entity with many relationships

### Large Schemas (15+ entities)
- **Domain Clustered**: Multiple business contexts
- **Hierarchical**: Complex dependency chains
- **Hybrid**: Combine strategies for different schema sections

### Special Cases
- **Temporal Layout**: Workflow/process systems
- **Layered**: 3-tier architectures (presentation, business, data)  
- **Network**: Peer-to-peer relationships, social networks

## Cross-Layout Relationship Handling

### Long-Distance Relationships
```javascript
// Use connection points and path routing
const crossDomainArrow = {
  type: "arrow",
  startBinding: { elementId: "userEntity", focus: 1.0, gap: 5 }, // Right edge
  endBinding: { elementId: "postEntity", focus: -1.0, gap: 5 },  // Left edge  
  points: [
    [0, 0],      // Start
    [100, 0],    // Out from source
    [100, -50],  // Up to clear other entities
    [250, -50],  // Across the top
    [250, 0],    // Down to target level  
    [350, 0]     // Into target
  ],
  strokeColor: "#6b7280", // Muted color for cross-domain
  strokeStyle: "dashed"   // Distinguish from local relationships
};
```

### Relationship Bundling
```javascript
// Group multiple relationships between domains
const domainConnector = {
  type: "line", // Non-directional connector
  points: [[300, 300], [500, 300]], // Between domain centers
  strokeWidth: 8,
  strokeColor: "#e5e7eb",
  opacity: 0.5
};

// Individual relationships follow the bundle path
const bundledRelationships = [
  { from: 'users', to: 'posts', offset: -10 },
  { from: 'profiles', to: 'posts', offset: 0 },
  { from: 'users', to: 'comments', offset: 10 }
];
```

## Canvas Sizing Recommendations

- **Small (Grid/Star)**: 800×600px
- **Medium (Domain Clustered)**: 1200×800px  
- **Large (Enterprise)**: 1600×1200px
- **Hierarchical**: Width varies, height = levels × 200px
- **Temporal**: Width = stages × 300px, height = 600px

## Animation Strategy by Layout

- **Grid**: Left-to-right, top-to-bottom wave
- **Star**: Center first, then radiate outward
- **Domain Clustered**: One domain at a time, then cross-connections
- **Hierarchical**: Top-down cascade
- **Temporal**: Left-to-right flow following process