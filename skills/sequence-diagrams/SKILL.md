---
name: sequence-diagrams
description: >
  Create animated sequence diagrams showing interactions between participants using
  the Excalimate MCP server. Use when asked to visualize API call sequences, message
  flows, protocol handshakes, request/response patterns, authentication flows, or
  communication between services, users, and systems.
---

# Sequence Diagrams Agent Skill

This skill creates animated sequence diagrams using the Excalimate MCP server. Perfect for visualizing communication flows between participants like users, services, APIs, and databases.

## Workflow

1. **Identify Participants** - Determine all actors in the sequence (Client, API, Service, Database, etc.)
2. **List Messages Chronologically** - Document all interactions in time order
3. **Layout Structure** - Place participant headers across top, lifeline rectangles below, horizontal arrows for messages
4. **Animate Top-to-Bottom** - Headers fade in → lifelines appear → messages draw sequentially

## Layout System

### Participant Headers
- Size: 160×60 rectangles
- Position: y=50 (fixed height)
- Spacing: 250px apart horizontally
- First participant: x=100
- Formula: `headerX = 100 + (participantIndex * 250)`

### Lifeline Rectangles
- Width: 4px
- Height: Extends below each header based on sequence length
- Position: Centered horizontally under each participant header
- Formula: `lifelineX = headerX + 76` (center of 160px header - 2px for 4px width)

### Message Arrows
- Horizontal arrows between lifelines
- Y spacing: 80px between messages
- First message: y=180
- Formula: `messageY = 180 + (messageIndex * 80)`

## Participant Styling

| Type | Header Color | Label Color | Use Case |
|------|-------------|-------------|----------|
| User/Client | #f08c00 | #ffec99 | End users, mobile apps, web clients |
| API/Gateway | #0c8599 | #99e9f2 | REST APIs, GraphQL, API gateways |
| Service | #1971c2 | #a5d8ff | Microservices, business logic services |
| Database | #2f9e44 | #b2f2bb | SQL/NoSQL databases, data stores |
| External | #6741d9 | #d0bfff | Third-party services, external APIs |

## Message Types

### Request (Solid Arrow Right)
```json
{
  "type": "arrow",
  "start": [fromX, messageY],
  "end": [toX, messageY],
  "strokeColor": "#495057",
  "strokeWidth": 2,
  "endArrowhead": "arrow"
}
```

### Response (Arrow Left, Lighter)
```json
{
  "type": "arrow", 
  "start": [toX, messageY],
  "end": [fromX, messageY],
  "strokeColor": "#868e96",
  "strokeWidth": 1.5,
  "endArrowhead": "arrow",
  "strokeStyle": "dashed"
}
```

### Self-Call (Curved Arrow)
```json
{
  "type": "arrow",
  "start": [participantX, messageY],
  "end": [participantX + 50, messageY - 20],
  "points": [[participantX + 50, messageY]],
  "strokeColor": "#495057",
  "strokeWidth": 2,
  "endArrowhead": "arrow"
}
```

### Async Message (Dotted)
```json
{
  "type": "arrow",
  "start": [fromX, messageY], 
  "end": [toX, messageY],
  "strokeColor": "#495057",
  "strokeWidth": 2,
  "strokeStyle": "dotted",
  "endArrowhead": "arrow"
}
```

## Animation Sequence

1. **Headers Fade In** (0-600ms) - All participant headers appear simultaneously using `create_sequence`
2. **Lifelines Appear** (600-1000ms) - Vertical lifelines fade in below headers
3. **Messages Draw** (1000ms+) - Messages appear top-to-bottom, ~800ms per message with 200ms gaps

## Complete Example

3-participant authentication flow (Client → API → Database):

```json
{
  "scene": {
    "appState": {
      "viewBackgroundColor": "#ffffff", 
      "gridSize": null
    }
  },
  "elements": [
    {
      "type": "rectangle",
      "x": 100, "y": 50, "width": 160, "height": 60,
      "fillStyle": "solid", "strokeWidth": 2,
      "backgroundColor": "#f08c00", "strokeColor": "#fd7e14",
      "id": "client-header"
    },
    {
      "type": "text", 
      "x": 180, "y": 80, "width": 50, "height": 25,
      "text": "Client", "fontSize": 16, "textAlign": "center",
      "id": "client-label"
    },
    {
      "type": "rectangle",
      "x": 350, "y": 50, "width": 160, "height": 60,
      "fillStyle": "solid", "strokeWidth": 2, 
      "backgroundColor": "#0c8599", "strokeColor": "#1098ad",
      "id": "api-header"
    },
    {
      "type": "text",
      "x": 430, "y": 80, "width": 30, "height": 25,
      "text": "API", "fontSize": 16, "textAlign": "center",
      "id": "api-label" 
    },
    {
      "type": "rectangle",
      "x": 600, "y": 50, "width": 160, "height": 60,
      "fillStyle": "solid", "strokeWidth": 2,
      "backgroundColor": "#2f9e44", "strokeColor": "#37b24d", 
      "id": "db-header"
    },
    {
      "type": "text",
      "x": 680, "y": 80, "width": 70, "height": 25,
      "text": "Database", "fontSize": 16, "textAlign": "center",
      "id": "db-label"
    },
    {
      "type": "rectangle",
      "x": 178, "y": 110, "width": 4, "height": 300,
      "fillStyle": "solid", "backgroundColor": "#495057",
      "id": "client-lifeline"
    },
    {
      "type": "rectangle", 
      "x": 428, "y": 110, "width": 4, "height": 300,
      "fillStyle": "solid", "backgroundColor": "#495057",
      "id": "api-lifeline"
    },
    {
      "type": "rectangle",
      "x": 678, "y": 110, "width": 4, "height": 300,
      "fillStyle": "solid", "backgroundColor": "#495057", 
      "id": "db-lifeline"
    },
    {
      "type": "arrow",
      "x": 180, "y": 180, "width": 250, "height": 0,
      "points": [[180, 180], [430, 180]],
      "strokeColor": "#495057", "strokeWidth": 2,
      "startArrowhead": null, "endArrowhead": "arrow",
      "id": "msg1"
    },
    {
      "type": "text",
      "x": 285, "y": 160, "width": 100, "height": 20,
      "text": "POST /login", "fontSize": 12,
      "id": "msg1-label"
    },
    {
      "type": "arrow",
      "x": 430, "y": 260, "width": 250, "height": 0, 
      "points": [[430, 260], [680, 260]],
      "strokeColor": "#495057", "strokeWidth": 2,
      "startArrowhead": null, "endArrowhead": "arrow",
      "id": "msg2"
    },
    {
      "type": "text",
      "x": 535, "y": 240, "width": 80, "height": 20,
      "text": "validate user", "fontSize": 12,
      "id": "msg2-label"
    },
    {
      "type": "arrow",
      "x": 680, "y": 340, "width": 250, "height": 0,
      "points": [[680, 340], [430, 340]],
      "strokeColor": "#868e96", "strokeWidth": 1.5,
      "startArrowhead": null, "endArrowhead": "arrow",
      "strokeStyle": "dashed",
      "id": "msg3"
    },
    {
      "type": "text", 
      "x": 535, "y": 320, "width": 60, "height": 20,
      "text": "user data", "fontSize": 12,
      "id": "msg3-label"
    },
    {
      "type": "arrow",
      "x": 430, "y": 420, "width": 250, "height": 0,
      "points": [[430, 420], [180, 420]],
      "strokeColor": "#868e96", "strokeWidth": 1.5, 
      "startArrowhead": null, "endArrowhead": "arrow",
      "strokeStyle": "dashed",
      "id": "msg4"
    },
    {
      "type": "text",
      "x": 285, "y": 400, "width": 80, "height": 20,
      "text": "JWT token", "fontSize": 12,
      "id": "msg4-label"
    }
  ],
  "keyframes": [
    {
      "ms": 0,
      "elementIds": ["client-header", "client-label", "api-header", "api-label", "db-header", "db-label"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 600, 
      "elementIds": ["client-lifeline", "api-lifeline", "db-lifeline"],
      "operation": "opacity",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1000,
      "elementIds": ["msg1", "msg1-label"], 
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 2000,
      "elementIds": ["msg2", "msg2-label"],
      "operation": "create_sequence", 
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 3000,
      "elementIds": ["msg3", "msg3-label"],
      "operation": "create_sequence",
      "durationMs": 800, 
      "opacity": [0, 1]
    },
    {
      "ms": 4000,
      "elementIds": ["msg4", "msg4-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    }
  ]
}
```

## Best Practices

- Keep participant names short (≤10 characters)
- Use consistent message spacing (80px)
- Group related request/response pairs in timing
- Add descriptive labels above each arrow
- Use appropriate colors for participant types
- Animate chronologically (top to bottom)
- Consider camera pan/zoom for long sequences

## Troubleshooting

- **Overlapping elements**: Increase Y spacing between messages
- **Missing arrows**: Ensure start/end coordinates align with lifeline centers  
- **Timing issues**: Use gaps between keyframe groups (200ms minimum)
- **Text readability**: Use dark text on light backgrounds, adequate font sizes