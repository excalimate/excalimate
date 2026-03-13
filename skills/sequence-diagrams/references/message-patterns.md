# Message Patterns

JSON templates for different types of messages between participants in sequence diagrams.

## Message Positioning
- First message: y = 180
- Message spacing: 80px
- Formula: `messageY = 180 + (messageIndex * 80)`
- Label offset: -20px above arrow

## Simple Request (Left to Right)

From Client (x=180) to API (x=430):
```json
{
  "arrow": {
    "type": "arrow",
    "x": 180, "y": 180, "width": 250, "height": 0,
    "points": [[180, 180], [430, 180]],
    "strokeColor": "#495057", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "request-1"
  },
  "label": {
    "type": "text",
    "x": 285, "y": 160, "width": 100, "height": 20,
    "text": "GET /users", "fontSize": 12, "textAlign": "center",
    "id": "request-1-label"
  }
}
```

## Response (Right to Left, Dashed)

From API (x=430) to Client (x=180):
```json
{
  "arrow": {
    "type": "arrow",
    "x": 430, "y": 260, "width": 250, "height": 0,
    "points": [[430, 260], [180, 260]],
    "strokeColor": "#868e96", "strokeWidth": 1.5,
    "startArrowhead": null, "endArrowhead": "arrow",
    "strokeStyle": "dashed",
    "id": "response-1"
  },
  "label": {
    "type": "text", 
    "x": 285, "y": 240, "width": 80, "height": 20,
    "text": "200 OK", "fontSize": 12, "textAlign": "center",
    "id": "response-1-label"
  }
}
```

## Self-Call (Curved Arrow Back to Same Participant)

Service (x=430) calling itself:
```json
{
  "arrow": {
    "type": "arrow",
    "x": 430, "y": 340, "width": 60, "height": 40,
    "points": [[430, 340], [490, 320], [490, 360], [434, 360]],
    "strokeColor": "#495057", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "self-call-1"
  },
  "label": {
    "type": "text",
    "x": 500, "y": 330, "width": 80, "height": 20, 
    "text": "validate()", "fontSize": 12,
    "id": "self-call-1-label"
  }
}
```

## Async Message (Dotted Line)

From Service (x=430) to Queue (x=680):
```json
{
  "arrow": {
    "type": "arrow", 
    "x": 430, "y": 420, "width": 250, "height": 0,
    "points": [[430, 420], [680, 420]],
    "strokeColor": "#495057", "strokeWidth": 2,
    "strokeStyle": "dotted", 
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "async-1"
  },
  "label": {
    "type": "text",
    "x": 535, "y": 400, "width": 80, "height": 20,
    "text": "notify", "fontSize": 12, "textAlign": "center",
    "id": "async-1-label"
  }
}
```

## Broadcast Message (Multiple Arrows)

From API (x=430) to Service1 (x=180) and Service2 (x=680):
```json
{
  "arrow1": {
    "type": "arrow",
    "x": 430, "y": 500, "width": 250, "height": 0,
    "points": [[430, 500], [180, 500]], 
    "strokeColor": "#e03131", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "broadcast-1a"
  },
  "arrow2": {
    "type": "arrow",
    "x": 430, "y": 500, "width": 250, "height": 0,
    "points": [[430, 500], [680, 500]],
    "strokeColor": "#e03131", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow", 
    "id": "broadcast-1b"
  },
  "label": {
    "type": "text",
    "x": 430, "y": 480, "width": 100, "height": 20,
    "text": "broadcast event", "fontSize": 12, "textAlign": "center",
    "id": "broadcast-1-label"
  }
}
```

## Request-Response Pair Template

Complete request-response between Client (x=180) and API (x=430):
```json
{
  "request": {
    "type": "arrow",
    "x": 180, "y": 180, "width": 250, "height": 0,
    "points": [[180, 180], [430, 180]],
    "strokeColor": "#495057", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "pair-request"
  },
  "requestLabel": {
    "type": "text",
    "x": 285, "y": 160, "width": 100, "height": 20,
    "text": "POST /login", "fontSize": 12, "textAlign": "center",
    "id": "pair-request-label"
  },
  "response": {
    "type": "arrow", 
    "x": 430, "y": 220, "width": 250, "height": 0,
    "points": [[430, 220], [180, 220]],
    "strokeColor": "#868e96", "strokeWidth": 1.5,
    "startArrowhead": null, "endArrowhead": "arrow",
    "strokeStyle": "dashed",
    "id": "pair-response"
  },
  "responseLabel": {
    "type": "text",
    "x": 285, "y": 200, "width": 80, "height": 20,
    "text": "JWT token", "fontSize": 12, "textAlign": "center",
    "id": "pair-response-label"
  }
}
```

## Activation Box (Processing Indicator)

Thin rectangle on lifeline during processing:
```json
{
  "activationBox": {
    "type": "rectangle",
    "x": 426, "y": 180, "width": 8, "height": 120,
    "fillStyle": "solid", "strokeWidth": 1,
    "backgroundColor": "#f8f9fa", "strokeColor": "#495057",
    "id": "api-activation-1"
  }
}
```

## Error Response (Red Styling)

From API (x=430) to Client (x=180) with error styling:
```json
{
  "arrow": {
    "type": "arrow",
    "x": 430, "y": 300, "width": 250, "height": 0,
    "points": [[430, 300], [180, 300]],
    "strokeColor": "#e03131", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow", 
    "strokeStyle": "dashed",
    "id": "error-response"
  },
  "label": {
    "type": "text",
    "x": 285, "y": 280, "width": 100, "height": 20,
    "text": "400 Bad Request", "fontSize": 12, "textAlign": "center",
    "strokeColor": "#e03131",
    "id": "error-response-label"
  }
}
```

## Long Message (Multi-line Label)

Request with detailed description:
```json
{
  "arrow": {
    "type": "arrow", 
    "x": 180, "y": 380, "width": 250, "height": 0,
    "points": [[180, 380], [430, 380]],
    "strokeColor": "#495057", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "long-message"
  },
  "label": {
    "type": "text",
    "x": 285, "y": 345, "width": 120, "height": 30,
    "text": "POST /api/v1/users\n{name, email, role}", "fontSize": 10, "textAlign": "center",
    "id": "long-message-label"
  }
}
```

## Alternative/Conditional Flow

Message with condition annotation:
```json
{
  "arrow": {
    "type": "arrow",
    "x": 180, "y": 460, "width": 250, "height": 0,
    "points": [[180, 460], [430, 460]],
    "strokeColor": "#495057", "strokeWidth": 2,
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "conditional-message"
  },
  "condition": {
    "type": "text",
    "x": 100, "y": 440, "width": 60, "height": 20,
    "text": "[if valid]", "fontSize": 10, "fontStyle": "italic",
    "strokeColor": "#868e96",
    "id": "condition-label"
  },
  "label": {
    "type": "text",
    "x": 285, "y": 440, "width": 80, "height": 20,
    "text": "process", "fontSize": 12, "textAlign": "center",
    "id": "conditional-message-label"
  }
}
```

## Timeout/Delay Indicator

Message with timing annotation:
```json
{
  "arrow": {
    "type": "arrow",
    "x": 430, "y": 540, "width": 250, "height": 0,
    "points": [[430, 540], [680, 540]],
    "strokeColor": "#f76707", "strokeWidth": 2,
    "strokeStyle": "dotted",
    "startArrowhead": null, "endArrowhead": "arrow",
    "id": "timeout-message"
  },
  "timing": {
    "type": "text", 
    "x": 535, "y": 515, "width": 40, "height": 15,
    "text": "5s", "fontSize": 10, "textAlign": "center",
    "strokeColor": "#f76707", "fontWeight": "bold",
    "id": "timeout-annotation"
  },
  "label": {
    "type": "text",
    "x": 535, "y": 555, "width": 80, "height": 20,
    "text": "slow query", "fontSize": 12, "textAlign": "center", 
    "id": "timeout-message-label"
  }
}
```