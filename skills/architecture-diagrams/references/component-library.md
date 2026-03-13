# Component Library

Complete JSON templates for standard architecture diagram components. Each component includes its bound label.

## Service Components

### Service Box
```json
{
  "id": "service_id",
  "type": "rectangle",
  "x": 400, "y": 300,
  "width": 180, "height": 80,
  "backgroundColor": "#a5d8ff",
  "strokeColor": "#1971c2",
  "strokeWidth": 2,
  "boundElements": [{"id": "service_label", "type": "text"}]
}
```

### Service Label
```json
{
  "id": "service_label", 
  "type": "text",
  "x": 490, "y": 340,
  "text": "User Service",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

### Microservice (Smaller)
```json
{
  "id": "microservice_id",
  "type": "rectangle", 
  "x": 400, "y": 300,
  "width": 140, "height": 70,
  "backgroundColor": "#a5d8ff",
  "strokeColor": "#1971c2",
  "strokeWidth": 2,
  "boundElements": [{"id": "micro_label", "type": "text"}]
}
```

## Data Components

### Database
```json
{
  "id": "database_id",
  "type": "rectangle",
  "x": 400, "y": 500,
  "width": 140, "height": 70,
  "backgroundColor": "#b2f2bb", 
  "strokeColor": "#2f9e44",
  "strokeWidth": 2,
  "boundElements": [{"id": "db_label", "type": "text"}]
}
```

### Database Label
```json
{
  "id": "db_label",
  "type": "text", 
  "x": 470, "y": 535,
  "text": "PostgreSQL",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

### Cache
```json
{
  "id": "cache_id",
  "type": "ellipse",
  "x": 400, "y": 400, 
  "width": 130, "height": 80,
  "backgroundColor": "#d0bfff",
  "strokeColor": "#6741d9",
  "strokeWidth": 2,
  "boundElements": [{"id": "cache_label", "type": "text"}]
}
```

### Cache Label
```json
{
  "id": "cache_label",
  "type": "text",
  "x": 465, "y": 440,
  "text": "Redis",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center", 
  "verticalAlign": "middle"
}
```

## Infrastructure Components

### Load Balancer
```json
{
  "id": "lb_id",
  "type": "diamond",
  "x": 400, "y": 250,
  "width": 120, "height": 100,
  "backgroundColor": "#99e9f2",
  "strokeColor": "#0c8599",
  "strokeWidth": 2,
  "boundElements": [{"id": "lb_label", "type": "text"}]
}
```

### Load Balancer Label
```json
{
  "id": "lb_label",
  "type": "text",
  "x": 460, "y": 300,
  "text": "Load Balancer", 
  "fontSize": 14,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

### API Gateway
```json
{
  "id": "gateway_id",
  "type": "rectangle",
  "x": 400, "y": 200,
  "width": 180, "height": 80,
  "backgroundColor": "#99e9f2",
  "strokeColor": "#0c8599", 
  "strokeWidth": 2,
  "boundElements": [{"id": "gateway_label", "type": "text"}]
}
```

### API Gateway Label
```json
{
  "id": "gateway_label",
  "type": "text",
  "x": 490, "y": 240,
  "text": "API Gateway",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

## Message Components

### Message Queue
```json
{
  "id": "queue_id", 
  "type": "rectangle",
  "x": 400, "y": 350,
  "width": 200, "height": 60,
  "backgroundColor": "#ffd8a8",
  "strokeColor": "#f08c00",
  "strokeWidth": 2,
  "boundElements": [{"id": "queue_label", "type": "text"}]
}
```

### Queue Label
```json
{
  "id": "queue_label",
  "type": "text",
  "x": 500, "y": 380,
  "text": "Message Queue",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle" 
}
```

## Client Components

### Web Client
```json
{
  "id": "client_id",
  "type": "rectangle", 
  "x": 400, "y": 50,
  "width": 120, "height": 70,
  "backgroundColor": "#ffec99",
  "strokeColor": "#f08c00",
  "strokeWidth": 2,
  "boundElements": [{"id": "client_label", "type": "text"}]
}
```

### Client Label
```json
{
  "id": "client_label",
  "type": "text",
  "x": 460, "y": 85,
  "text": "Web Client", 
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

### Mobile Client
```json
{
  "id": "mobile_id",
  "type": "rectangle",
  "x": 250, "y": 50,
  "width": 100, "height": 80,
  "backgroundColor": "#ffec99",
  "strokeColor": "#f08c00",
  "strokeWidth": 2,
  "rx": 20, "ry": 20,
  "boundElements": [{"id": "mobile_label", "type": "text"}]
}
```

## External Components

### External Service
```json
{
  "id": "external_id",
  "type": "rectangle",
  "x": 700, "y": 300, 
  "width": 160, "height": 75,
  "backgroundColor": "#d0bfff",
  "strokeColor": "#6741d9",
  "strokeWidth": 2,
  "strokeStyle": "dashed",
  "boundElements": [{"id": "external_label", "type": "text"}]
}
```

### External Label
```json
{
  "id": "external_label",
  "type": "text",
  "x": 780, "y": 337,
  "text": "Payment API",
  "fontSize": 16, 
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

## Boundary Components

### System Boundary Frame
```json
{
  "id": "boundary_id",
  "type": "rectangle",
  "x": 150, "y": 150,
  "width": 500, "height": 400,
  "backgroundColor": "transparent",
  "strokeColor": "#868e96",
  "strokeWidth": 2,
  "strokeStyle": "dashed",
  "boundElements": [{"id": "boundary_title", "type": "text"}]
}
```

### Boundary Title
```json
{
  "id": "boundary_title", 
  "type": "text",
  "x": 170, "y": 170,
  "text": "Internal Services",
  "fontSize": 18,
  "fontFamily": 1,
  "fontWeight": "bold",
  "textAlign": "left",
  "verticalAlign": "top"
}
```

## Title Components

### Diagram Title
```json
{
  "id": "title_id",
  "type": "text",
  "x": 400, "y": 30,
  "text": "E-Commerce Architecture",
  "fontSize": 24,
  "fontFamily": 1, 
  "fontWeight": "bold",
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

### Layer Title
```json
{
  "id": "layer_title_id",
  "type": "text",
  "x": 50, "y": 200,
  "text": "API Layer",
  "fontSize": 18,
  "fontFamily": 1,
  "fontWeight": "bold", 
  "textAlign": "left",
  "verticalAlign": "middle",
  "angle": 4.71 // 270 degrees for vertical text
}
```

## Standard Arrow Connections

### Basic Arrow
```json
{
  "id": "arrow_id",
  "type": "arrow",
  "startBinding": {"elementId": "source_id", "focus": 0, "gap": 10},
  "endBinding": {"elementId": "target_id", "focus": 0, "gap": 10},
  "strokeColor": "#495057",
  "strokeWidth": 2
}
```

### Bidirectional Arrow
```json
{
  "id": "bidirectional_id", 
  "type": "arrow",
  "startBinding": {"elementId": "source_id", "focus": 0},
  "endBinding": {"elementId": "target_id", "focus": 0},
  "strokeColor": "#495057",
  "strokeWidth": 2,
  "startArrowhead": "arrow", 
  "endArrowhead": "arrow"
}
```

### Data Flow Arrow (Colored)
```json
{
  "id": "dataflow_id",
  "type": "arrow", 
  "startBinding": {"elementId": "source_id", "focus": 0},
  "endBinding": {"elementId": "target_id", "focus": 0},
  "strokeColor": "#1971c2",
  "strokeWidth": 3,
  "endArrowhead": "arrow"
}
```