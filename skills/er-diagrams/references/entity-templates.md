# Entity Templates

Ready-to-use JSON templates for common entity types in ER diagrams.

## Simple Entity (3 fields)

```javascript
const simpleEntity = {
  header: {
    type: "rectangle",
    x: 300, y: 200,
    width: 200, height: 40,
    backgroundColor: "#1971c2",
    strokeColor: "#a5d8ff",
    strokeWidth: 2
  },
  body: {
    type: "rectangle", 
    x: 300, y: 240,
    width: 200, height: 70,
    backgroundColor: "#ffffff",
    strokeColor: "#a5d8ff",
    strokeWidth: 2
  },
  name: {
    type: "text",
    text: "users",
    x: 400, y: 220,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center"
  },
  fields: {
    type: "text",
    text: "id: PK\nname: varchar(100)\nemail: varchar(255)",
    x: 310, y: 255,
    fontSize: 12,
    width: 180
  }
};
```

## Complex Entity (8 fields)

```javascript
const complexEntity = {
  header: {
    type: "rectangle",
    x: 300, y: 200, 
    width: 220, height: 40,
    backgroundColor: "#1971c2",
    strokeColor: "#a5d8ff",
    strokeWidth: 2
  },
  body: {
    type: "rectangle",
    x: 300, y: 240,
    width: 220, height: 170,
    backgroundColor: "#ffffff", 
    strokeColor: "#a5d8ff",
    strokeWidth: 2
  },
  name: {
    type: "text",
    text: "products",
    x: 410, y: 220,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center"
  },
  fields: {
    type: "text",
    text: "id: PK\nsku: varchar(50) UNIQUE\nname: varchar(200)\ndescription: text\nprice: decimal(10,2)\ncategory_id: FK → categories\ncreated_at: timestamp\nupdated_at: timestamp",
    x: 310, y: 255,
    fontSize: 12,
    width: 200,
    lineHeight: 1.4
  }
};
```

## Junction Table Entity

```javascript
const junctionEntity = {
  header: {
    type: "rectangle",
    x: 300, y: 200,
    width: 180, height: 40,
    backgroundColor: "#f08c00", // Orange for junction
    strokeColor: "#ffec99",
    strokeWidth: 2
  },
  body: {
    type: "rectangle",
    x: 300, y: 240, 
    width: 180, height: 70,
    backgroundColor: "#ffffff",
    strokeColor: "#ffec99",
    strokeWidth: 2
  },
  name: {
    type: "text",
    text: "user_roles",
    x: 390, y: 220,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center"
  },
  fields: {
    type: "text",
    text: "user_id: FK → users\nrole_id: FK → roles\nassigned_at: timestamp",
    x: 310, y: 255,
    fontSize: 11,
    width: 160
  }
};
```

## Enum/Lookup Table Entity

```javascript
const lookupEntity = {
  header: {
    type: "rectangle",
    x: 300, y: 200,
    width: 160, height: 40,
    backgroundColor: "#2f9e44", // Green for lookup
    strokeColor: "#b2f2bb", 
    strokeWidth: 2
  },
  body: {
    type: "rectangle",
    x: 300, y: 240,
    width: 160, height: 70,
    backgroundColor: "#ffffff",
    strokeColor: "#b2f2bb",
    strokeWidth: 2
  },
  name: {
    type: "text", 
    text: "statuses",
    x: 380, y: 220,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center"
  },
  fields: {
    type: "text",
    text: "id: PK\ncode: varchar(20)\nname: varchar(100)",
    x: 310, y: 255,
    fontSize: 11,
    width: 140
  }
};
```

## Weak Entity (Dependent)

```javascript
const weakEntity = {
  header: {
    type: "rectangle",
    x: 300, y: 200,
    width: 200, height: 40,
    backgroundColor: "#1971c2",
    strokeColor: "#a5d8ff",
    strokeWidth: 3, // Thicker border for weak entity
    strokeStyle: "dashed" // Dashed for weak entity
  },
  body: {
    type: "rectangle",
    x: 300, y: 240,
    width: 200, height: 90,
    backgroundColor: "#ffffff",
    strokeColor: "#a5d8ff", 
    strokeWidth: 3,
    strokeStyle: "dashed"
  },
  name: {
    type: "text",
    text: "order_items", 
    x: 400, y: 220,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center"
  },
  fields: {
    type: "text",
    text: "order_id: PK, FK → orders\nproduct_id: PK, FK → products\nquantity: integer\nprice: decimal(10,2)",
    x: 310, y: 255,
    fontSize: 12,
    width: 180
  }
};
```

## View/Virtual Table Entity

```javascript
const viewEntity = {
  header: {
    type: "rectangle",
    x: 300, y: 200,
    width: 200, height: 40,
    backgroundColor: "#7c3aed", // Purple for views
    strokeColor: "#c4b5fd",
    strokeWidth: 2
  },
  body: {
    type: "rectangle", 
    x: 300, y: 240,
    width: 200, height: 90,
    backgroundColor: "#ffffff",
    strokeColor: "#c4b5fd",
    strokeWidth: 2
  },
  name: {
    type: "text",
    text: "user_stats",
    x: 400, y: 220, 
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center"
  },
  viewLabel: {
    type: "text",
    text: "VIEW",
    x: 320, y: 210,
    fontSize: 10,
    fontWeight: "bold",
    color: "#7c3aed"
  },
  fields: {
    type: "text", 
    text: "user_id: integer\npost_count: integer\ncomment_count: integer\nlast_activity: timestamp",
    x: 310, y: 255,
    fontSize: 12,
    width: 180
  }
};
```

## Abstract/Base Entity

```javascript
const abstractEntity = {
  header: {
    type: "rectangle",
    x: 300, y: 200,
    width: 200, height: 40, 
    backgroundColor: "#6b7280", // Gray for abstract
    strokeColor: "#d1d5db",
    strokeWidth: 2
  },
  body: {
    type: "rectangle",
    x: 300, y: 240,
    width: 200, height: 70,
    backgroundColor: "#ffffff",
    strokeColor: "#d1d5db",
    strokeWidth: 2
  },
  name: {
    type: "text",
    text: "content_base", 
    x: 400, y: 220,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    fontStyle: "italic" // Italic for abstract
  },
  fields: {
    type: "text",
    text: "id: PK\ntitle: varchar(200)\ncreated_at: timestamp",
    x: 310, y: 255,
    fontSize: 12,
    width: 180,
    fontStyle: "italic"
  }
};
```

## Usage Guidelines

### Entity Type Selection
- **Simple**: Basic entities with 2-4 fields
- **Complex**: Primary business entities with 5+ fields  
- **Junction**: Many-to-many relationship tables
- **Lookup**: Enumeration/reference tables with fixed values
- **Weak**: Entities that depend on another entity for existence
- **View**: Virtual tables/computed results
- **Abstract**: Base classes in inheritance hierarchies

### Color Coding
- Blue (`#1971c2`): Primary entities (users, products, orders)
- Orange (`#f08c00`): Junction/bridge tables
- Green (`#2f9e44`): Lookup/enum tables 
- Purple (`#7c3aed`): Views/computed tables
- Gray (`#6b7280`): Abstract/base entities

### Field Notation
- `PK`: Primary key
- `FK → table`: Foreign key reference
- `UNIQUE`: Unique constraint
- `varchar(n)`: Variable character with length
- `decimal(p,s)`: Decimal with precision and scale
- `timestamp`: Date/time field

### Sizing Guidelines
- Header: Always 40px height, width varies by name length (160-220px)
- Body: Height = (field_count × 20) + 10px padding
- Text: 12px for fields, 16px for entity names
- Margins: 10px padding inside rectangles