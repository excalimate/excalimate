# Participant Templates

JSON templates for common participant types with header, label, and lifeline elements.

## Position Formula
- Position 1: x = 100  
- Position 2: x = 350
- Position 3: x = 600
- Position 4: x = 850
- General: `headerX = 100 + (position - 1) * 250`

## User/Client Participant

Position 1 (x=100):
```json
{
  "header": {
    "type": "rectangle",
    "x": 100, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#f08c00", "strokeColor": "#fd7e14",
    "id": "user-header"
  },
  "label": {
    "type": "text", 
    "x": 180, "y": 80, "width": 40, "height": 25,
    "text": "User", "fontSize": 16, "textAlign": "center",
    "id": "user-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 178, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "user-lifeline"
  }
}
```

Position 2 (x=350):
```json
{
  "header": {
    "type": "rectangle",
    "x": 350, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#f08c00", "strokeColor": "#fd7e14",
    "id": "client-header"
  },
  "label": {
    "type": "text",
    "x": 430, "y": 80, "width": 50, "height": 25, 
    "text": "Client", "fontSize": 16, "textAlign": "center",
    "id": "client-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 428, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "client-lifeline"
  }
}
```

## API/Gateway Participant

Position 1 (x=100):
```json
{
  "header": {
    "type": "rectangle",
    "x": 100, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#0c8599", "strokeColor": "#1098ad",
    "id": "api-header"
  },
  "label": {
    "type": "text",
    "x": 180, "y": 80, "width": 30, "height": 25,
    "text": "API", "fontSize": 16, "textAlign": "center", 
    "id": "api-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 178, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "api-lifeline"
  }
}
```

Position 3 (x=600):
```json
{
  "header": {
    "type": "rectangle",
    "x": 600, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#0c8599", "strokeColor": "#1098ad",
    "id": "gateway-header"
  },
  "label": {
    "type": "text",
    "x": 680, "y": 80, "width": 60, "height": 25,
    "text": "Gateway", "fontSize": 16, "textAlign": "center",
    "id": "gateway-label"
  },
  "lifeline": {
    "type": "rectangle", 
    "x": 678, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "gateway-lifeline"
  }
}
```

## Service Participant

Position 2 (x=350):
```json
{
  "header": {
    "type": "rectangle",
    "x": 350, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#1971c2", "strokeColor": "#1c7ed6",
    "id": "service-header"
  },
  "label": {
    "type": "text",
    "x": 430, "y": 80, "width": 60, "height": 25,
    "text": "Service", "fontSize": 16, "textAlign": "center",
    "id": "service-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 428, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "service-lifeline"
  }
}
```

Position 4 (x=850):
```json
{
  "header": {
    "type": "rectangle",
    "x": 850, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#1971c2", "strokeColor": "#1c7ed6",
    "id": "auth-service-header"
  },
  "label": {
    "type": "text",
    "x": 930, "y": 80, "width": 80, "height": 25,
    "text": "Auth Service", "fontSize": 14, "textAlign": "center",
    "id": "auth-service-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 928, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "auth-service-lifeline"
  }
}
```

## Database Participant

Position 3 (x=600):
```json
{
  "header": {
    "type": "rectangle",
    "x": 600, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#2f9e44", "strokeColor": "#37b24d",
    "id": "db-header"
  },
  "label": {
    "type": "text",
    "x": 680, "y": 80, "width": 70, "height": 25,
    "text": "Database", "fontSize": 16, "textAlign": "center",
    "id": "db-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 678, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "db-lifeline"
  }
}
```

Position 4 (x=850):
```json
{
  "header": {
    "type": "rectangle",
    "x": 850, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#2f9e44", "strokeColor": "#37b24d",
    "id": "cache-header"
  },
  "label": {
    "type": "text",
    "x": 930, "y": 80, "width": 50, "height": 25,
    "text": "Cache", "fontSize": 16, "textAlign": "center",
    "id": "cache-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 928, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "cache-lifeline"
  }
}
```

## External Participant

Position 1 (x=100):
```json
{
  "header": {
    "type": "rectangle",
    "x": 100, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#6741d9", "strokeColor": "#7048e8",
    "id": "external-header"
  },
  "label": {
    "type": "text",
    "x": 180, "y": 80, "width": 60, "height": 25,
    "text": "External", "fontSize": 16, "textAlign": "center",
    "id": "external-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 178, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "external-lifeline"
  }
}
```

Position 4 (x=850):
```json
{
  "header": {
    "type": "rectangle",
    "x": 850, "y": 50, "width": 160, "height": 60,
    "fillStyle": "solid", "strokeWidth": 2,
    "backgroundColor": "#6741d9", "strokeColor": "#7048e8",
    "id": "payment-api-header"
  },
  "label": {
    "type": "text",
    "x": 930, "y": 80, "width": 90, "height": 25,
    "text": "Payment API", "fontSize": 14, "textAlign": "center",
    "id": "payment-api-label"
  },
  "lifeline": {
    "type": "rectangle",
    "x": 928, "y": 110, "width": 4, "height": 400,
    "fillStyle": "solid", "backgroundColor": "#495057",
    "id": "payment-api-lifeline"
  }
}
```