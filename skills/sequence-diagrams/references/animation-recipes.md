# Animation Recipes

Complete keyframes JSON for common sequence diagram animation patterns.

## Recipe 1: Message-by-Message Sequential Reveal

Headers appear first, then lifelines, then each message draws individually from top to bottom.

```json
{
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
      "elementIds": ["msg1-arrow", "msg1-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 2000, 
      "elementIds": ["msg2-arrow", "msg2-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 3000,
      "elementIds": ["msg3-arrow", "msg3-label"], 
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 4000,
      "elementIds": ["msg4-arrow", "msg4-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    }
  ]
}
```

## Recipe 2: Request-Response Pairs (Grouped Animation)

Messages appear in request-response pairs, showing conversational flow.

```json
{
  "keyframes": [
    {
      "ms": 0,
      "elementIds": ["user-header", "user-label", "api-header", "api-label", "service-header", "service-label", "db-header", "db-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 800,
      "elementIds": ["user-lifeline", "api-lifeline", "service-lifeline", "db-lifeline"],
      "operation": "opacity", 
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1200,
      "elementIds": ["request1-arrow", "request1-label", "response1-arrow", "response1-label"],
      "operation": "create_sequence",
      "durationMs": 1200,
      "opacity": [0, 1]
    },
    {
      "ms": 2800,
      "elementIds": ["request2-arrow", "request2-label", "response2-arrow", "response2-label"],
      "operation": "create_sequence", 
      "durationMs": 1200,
      "opacity": [0, 1]
    },
    {
      "ms": 4400,
      "elementIds": ["request3-arrow", "request3-label", "response3-arrow", "response3-label"],
      "operation": "create_sequence",
      "durationMs": 1200,
      "opacity": [0, 1]
    }
  ]
}
```

## Recipe 3: Highlight Active Participant (Pulse Header)

Headers pulse/scale when they send or receive messages, showing active participants.

```json
{
  "keyframes": [
    {
      "ms": 0,
      "elementIds": ["client-header", "client-label", "server-header", "server-label"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 600,
      "elementIds": ["client-lifeline", "server-lifeline"],
      "operation": "opacity",
      "durationMs": 300,
      "opacity": [0, 1]
    },
    {
      "ms": 1000,
      "elementIds": ["client-header"],
      "operation": "scale",
      "durationMs": 200,
      "scale": [1.0, 1.1]
    },
    {
      "ms": 1100,
      "elementIds": ["msg1-arrow", "msg1-label"],
      "operation": "create_sequence",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1200,
      "elementIds": ["client-header"],
      "operation": "scale", 
      "durationMs": 200,
      "scale": [1.1, 1.0]
    },
    {
      "ms": 1500,
      "elementIds": ["server-header"],
      "operation": "scale",
      "durationMs": 200,
      "scale": [1.0, 1.1]
    },
    {
      "ms": 1600,
      "elementIds": ["msg2-arrow", "msg2-label"],
      "operation": "create_sequence",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1700,
      "elementIds": ["server-header"],
      "operation": "scale",
      "durationMs": 200,
      "scale": [1.1, 1.0]
    },
    {
      "ms": 2000,
      "elementIds": ["server-header"],
      "operation": "scale",
      "durationMs": 200,
      "scale": [1.0, 1.1]
    },
    {
      "ms": 2100,
      "elementIds": ["msg3-arrow", "msg3-label"],
      "operation": "create_sequence",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 2200,
      "elementIds": ["server-header"],
      "operation": "scale",
      "durationMs": 200,
      "scale": [1.1, 1.0]
    },
    {
      "ms": 2500,
      "elementIds": ["client-header"],
      "operation": "scale",
      "durationMs": 200,
      "scale": [1.0, 1.1]
    },
    {
      "ms": 2600,
      "elementIds": ["msg4-arrow", "msg4-label"],
      "operation": "create_sequence", 
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 2700,
      "elementIds": ["client-header"],
      "operation": "scale",
      "durationMs": 200,
      "scale": [1.1, 1.0]
    }
  ]
}
```

## Recipe 4: Camera Scroll for Long Sequences

Use camera positioning to handle sequences with many participants or messages.

```json
{
  "keyframes": [
    {
      "ms": 0,
      "elementIds": ["all-headers", "all-labels"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 800,
      "elementIds": ["all-lifelines"], 
      "operation": "opacity",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1200,
      "elementIds": ["camera"],
      "operation": "position",
      "durationMs": 0,
      "position": [[0, 0], [0, 0]]
    },
    {
      "ms": 1200,
      "elementIds": ["msg1-arrow", "msg1-label", "msg2-arrow", "msg2-label"],
      "operation": "create_sequence",
      "durationMs": 1000,
      "opacity": [0, 1]
    },
    {
      "ms": 2500,
      "elementIds": ["camera"],
      "operation": "position",
      "durationMs": 800,
      "position": [[0, 0], [0, -100]]
    },
    {
      "ms": 3000,
      "elementIds": ["msg3-arrow", "msg3-label", "msg4-arrow", "msg4-label"],
      "operation": "create_sequence",
      "durationMs": 1000,
      "opacity": [0, 1]
    },
    {
      "ms": 4300,
      "elementIds": ["camera"],
      "operation": "position",
      "durationMs": 800, 
      "position": [[0, -100], [0, -200]]
    },
    {
      "ms": 4800,
      "elementIds": ["msg5-arrow", "msg5-label", "msg6-arrow", "msg6-label"],
      "operation": "create_sequence",
      "durationMs": 1000,
      "opacity": [0, 1]
    },
    {
      "ms": 6000,
      "elementIds": ["camera"],
      "operation": "position", 
      "durationMs": 1000,
      "position": [[0, -200], [0, 0]]
    }
  ]
}
```

## Recipe 5: Error Flow with Warning Colors

Highlight error conditions with red styling and different timing.

```json
{
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
      "durationMs": 300,
      "opacity": [0, 1]
    },
    {
      "ms": 1000,
      "elementIds": ["normal-request", "normal-request-label"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 2000,
      "elementIds": ["db-request", "db-request-label"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 3500,
      "elementIds": ["db-header"],
      "operation": "backgroundColor",
      "durationMs": 300,
      "backgroundColor": ["#2f9e44", "#e03131"]
    },
    {
      "ms": 4000,
      "elementIds": ["error-response", "error-response-label"],
      "operation": "create_sequence", 
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 5000,
      "elementIds": ["api-header"],
      "operation": "backgroundColor",
      "durationMs": 300,
      "backgroundColor": ["#0c8599", "#e03131"]
    },
    {
      "ms": 5500,
      "elementIds": ["client-error-response", "client-error-response-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 6500,
      "elementIds": ["api-header", "db-header"],
      "operation": "backgroundColor",
      "durationMs": 500,
      "backgroundColor": ["#e03131", "#2f9e44"]
    }
  ]
}
```

## Recipe 6: Parallel Processing Flow

Show concurrent/parallel messages with simultaneous animations.

```json
{
  "keyframes": [
    {
      "ms": 0,
      "elementIds": ["client-header", "client-label", "service1-header", "service1-label", "service2-header", "service2-label", "service3-header", "service3-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 800,
      "elementIds": ["client-lifeline", "service1-lifeline", "service2-lifeline", "service3-lifeline"],
      "operation": "opacity",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1400,
      "elementIds": ["initial-request", "initial-request-label"],
      "operation": "create_sequence", 
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 2200,
      "elementIds": ["parallel-msg1", "parallel-msg1-label", "parallel-msg2", "parallel-msg2-label", "parallel-msg3", "parallel-msg3-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    },
    {
      "ms": 3500,
      "elementIds": ["parallel-response1", "parallel-response1-label"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 4200,
      "elementIds": ["parallel-response3", "parallel-response3-label"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 4900,
      "elementIds": ["parallel-response2", "parallel-response2-label"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 5800,
      "elementIds": ["final-response", "final-response-label"],
      "operation": "create_sequence",
      "durationMs": 800,
      "opacity": [0, 1]
    }
  ]
}
```

## Recipe 7: Activation Box Lifecycle

Show processing time with activation boxes that appear and disappear.

```json
{
  "keyframes": [
    {
      "ms": 0,
      "elementIds": ["client-header", "client-label", "server-header", "server-label"],
      "operation": "create_sequence",
      "durationMs": 500,
      "opacity": [0, 1]
    },
    {
      "ms": 500,
      "elementIds": ["client-lifeline", "server-lifeline"],
      "operation": "opacity",
      "durationMs": 300,
      "opacity": [0, 1]
    },
    {
      "ms": 1000,
      "elementIds": ["request1", "request1-label"],
      "operation": "create_sequence",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1400,
      "elementIds": ["server-activation1"],
      "operation": "opacity",
      "durationMs": 200,
      "opacity": [0, 1]
    },
    {
      "ms": 3000,
      "elementIds": ["response1", "response1-label"],
      "operation": "create_sequence",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 3400,
      "elementIds": ["server-activation1"],
      "operation": "opacity",
      "durationMs": 200,
      "opacity": [1, 0]
    },
    {
      "ms": 4000,
      "elementIds": ["request2", "request2-label"],
      "operation": "create_sequence",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 4400,
      "elementIds": ["server-activation2"],
      "operation": "opacity",
      "durationMs": 200,
      "opacity": [0, 1]
    },
    {
      "ms": 5500,
      "elementIds": ["response2", "response2-label"],
      "operation": "create_sequence",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 5900,
      "elementIds": ["server-activation2"],
      "operation": "opacity",
      "durationMs": 200,
      "opacity": [1, 0]
    }
  ]
}
```

## Recipe 8: Zoom and Focus Pattern

Camera zoom in/out to focus on specific participant interactions.

```json
{
  "keyframes": [
    {
      "ms": 0,
      "elementIds": ["all-participants"],
      "operation": "create_sequence",
      "durationMs": 600,
      "opacity": [0, 1]
    },
    {
      "ms": 600,
      "elementIds": ["all-lifelines"],
      "operation": "opacity",
      "durationMs": 400,
      "opacity": [0, 1]
    },
    {
      "ms": 1000,
      "elementIds": ["camera"],
      "operation": "zoom",
      "durationMs": 800,
      "zoom": [1.0, 1.5]
    },
    {
      "ms": 1000,
      "elementIds": ["camera"],
      "operation": "position",
      "durationMs": 800,
      "position": [[0, 0], [-150, -50]]
    },
    {
      "ms": 1800,
      "elementIds": ["focused-interaction1", "focused-interaction1-label"],
      "operation": "create_sequence",
      "durationMs": 1000,
      "opacity": [0, 1]
    },
    {
      "ms": 3000,
      "elementIds": ["camera"],
      "operation": "zoom",
      "durationMs": 600,
      "zoom": [1.5, 1.0]
    },
    {
      "ms": 3000,
      "elementIds": ["camera"],
      "operation": "position",
      "durationMs": 600,
      "position": [[-150, -50], [0, 0]]
    },
    {
      "ms": 3800,
      "elementIds": ["remaining-interactions"],
      "operation": "create_sequence",
      "durationMs": 1500,
      "opacity": [0, 1]
    }
  ]
}
```