---
name: data-pipelines
description: >
  Create animated data pipeline and ETL flow diagrams using the Excalimate MCP server.
  Use when asked to visualize data pipelines, ETL/ELT processes, streaming architectures,
  data warehousing flows, ML pipelines, Kafka/event streaming topologies, or any data
  transformation workflow — even if the user just says "data flow" or "how the data moves."
---

# Data Pipelines Agent Skill

This skill specializes in creating animated data pipeline and ETL flow diagrams using the Excalimate MCP server.

## When to Use

Use this skill when users ask to visualize:
- Data pipelines and ETL/ELT processes
- Streaming architectures (Kafka, RabbitMQ, SQS)
- Data warehousing flows
- ML pipelines and data science workflows
- Event streaming topologies
- Data transformation workflows
- Any scenario involving "data flow" or "how the data moves"

## Workflow

1. **Identify Components**: Sources, transforms, sinks, queues, routers
2. **Choose Topology**: Linear pipeline, fan-out, fan-in, diamond, or streaming
3. **Layout Left-to-Right**: Sources → Processing → Sinks with 350px stage separation
4. **Color-Code by Role**: Green sources, blue transforms, purple sinks, etc.
5. **Animate Left-to-Right**: Stage-by-stage reveal from sources to sinks

## Components

All components use consistent sizing and include `boundElements` for labels:

### Data Source (Green)
```json
{
  "type": "rectangle",
  "width": 160,
  "height": 70,
  "strokeColor": "#2f9e44",
  "backgroundColor": "#b2f2bb",
  "boundElements": [{"id": "label-id", "type": "text"}]
}
```

### Transform (Blue) 
```json
{
  "type": "rectangle", 
  "width": 180,
  "height": 80,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "boundElements": [{"id": "label-id", "type": "text"}]
}
```

### Sink (Purple)
```json
{
  "type": "rectangle",
  "width": 160, 
  "height": 70,
  "strokeColor": "#6741d9",
  "backgroundColor": "#d0bfff",
  "boundElements": [{"id": "label-id", "type": "text"}]
}
```

### Queue/Stream (Orange)
```json
{
  "type": "rectangle",
  "width": 200,
  "height": 50, 
  "strokeColor": "#f08c00",
  "backgroundColor": "#ffec99",
  "boundElements": [{"id": "label-id", "type": "text"}]
}
```

### Router (Teal Diamond)
```json
{
  "type": "diamond",
  "width": 140,
  "height": 120,
  "strokeColor": "#0c8599", 
  "backgroundColor": "#99e9f2",
  "boundElements": [{"id": "label-id", "type": "text"}]
}
```

### Error/DLQ (Red)
```json
{
  "type": "rectangle",
  "width": 160,
  "height": 70,
  "strokeColor": "#e03131",
  "backgroundColor": "#ffc9c9", 
  "boundElements": [{"id": "label-id", "type": "text"}]
}
```

## Left-to-Right Layout

- **Sources**: x=50
- **Processing**: x=400  
- **Sinks**: x=750
- **Stage separation**: 350px
- **Parallel paths**: 120px vertical spacing
- **Center point**: y=300

## Color Reference

| Component | Stroke | Background |
|-----------|--------|------------|
| Source    | #2f9e44 | #b2f2bb |
| Transform | #1971c2 | #a5d8ff |
| Sink      | #6741d9 | #d0bfff |
| Queue     | #f08c00 | #ffec99 |
| Router    | #0c8599 | #99e9f2 |
| Error/DLQ | #e03131 | #ffc9c9 |

## Animation Pattern

**Stage-by-stage left-to-right reveal**:

1. Sources fade in: 0-500ms
2. First arrows draw: 500-1200ms 
3. Transforms fade in: 1200-1700ms
4. Second arrows draw: 1700-2400ms
5. Sinks fade in: 2400-2900ms

Parallel paths animate simultaneously within each stage.

## Complete Example: Linear ETL

```json
// create_scene call
{
  "elements": [
    {
      "id": "postgres-src",
      "type": "rectangle", 
      "x": 50, "y": 265, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb",
      "opacity": 0,
      "boundElements": [{"id": "postgres-label", "type": "text"}]
    },
    {
      "id": "postgres-label",
      "type": "text",
      "x": 130, "y": 300,
      "text": "PostgreSQL",
      "fontSize": 16, "opacity": 0
    },
    {
      "id": "mysql-src", 
      "type": "rectangle",
      "x": 50, "y": 355, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", 
      "opacity": 0,
      "boundElements": [{"id": "mysql-label", "type": "text"}]
    },
    {
      "id": "mysql-label",
      "type": "text", 
      "x": 130, "y": 390,
      "text": "MySQL",
      "fontSize": 16, "opacity": 0
    },
    {
      "id": "queue",
      "type": "rectangle",
      "x": 300, "y": 300, "width": 200, "height": 50,
      "strokeColor": "#f08c00", "backgroundColor": "#ffec99",
      "opacity": 0,
      "boundElements": [{"id": "queue-label", "type": "text"}]
    },
    {
      "id": "queue-label", 
      "type": "text",
      "x": 400, "y": 325,
      "text": "Kafka Topic",
      "fontSize": 16, "opacity": 0
    },
    {
      "id": "etl-transform",
      "type": "rectangle", 
      "x": 600, "y": 285, "width": 180, "height": 80,
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff",
      "opacity": 0,
      "boundElements": [{"id": "etl-label", "type": "text"}]
    },
    {
      "id": "etl-label",
      "type": "text",
      "x": 690, "y": 325, 
      "text": "ETL Transform",
      "fontSize": 16, "opacity": 0
    },
    {
      "id": "warehouse-sink",
      "type": "rectangle",
      "x": 900, "y": 265, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff",
      "opacity": 0,
      "boundElements": [{"id": "warehouse-label", "type": "text"}]
    },
    {
      "id": "warehouse-label",
      "type": "text", 
      "x": 980, "y": 300,
      "text": "Data Warehouse", 
      "fontSize": 16, "opacity": 0
    },
    {
      "id": "dashboard-sink",
      "type": "rectangle",
      "x": 900, "y": 355, "width": 160, "height": 70, 
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff",
      "opacity": 0,
      "boundElements": [{"id": "dashboard-label", "type": "text"}]
    },
    {
      "id": "dashboard-label",
      "type": "text",
      "x": 980, "y": 390,
      "text": "Dashboard",
      "fontSize": 16, "opacity": 0
    },
    {
      "id": "arrow1", "type": "arrow", 
      "x": 210, "y": 300, "x2": 300, "y2": 315,
      "opacity": 0
    },
    {
      "id": "arrow2", "type": "arrow",
      "x": 210, "y": 390, "x2": 300, "y2": 335, 
      "opacity": 0
    },
    {
      "id": "arrow3", "type": "arrow",
      "x": 500, "y": 325, "x2": 600, "y2": 325,
      "opacity": 0 
    },
    {
      "id": "arrow4", "type": "arrow",
      "x": 780, "y": 315, "x2": 900, "y2": 300,
      "opacity": 0
    },
    {
      "id": "arrow5", "type": "arrow", 
      "x": 780, "y": 335, "x2": 900, "y2": 390,
      "opacity": 0
    }
  ]
}

// add_keyframes_batch call
{
  "keyframes": [
    {
      "elementIds": ["postgres-src", "postgres-label", "mysql-src", "mysql-label"],
      "property": "opacity", "value": 1,
      "startTime": 0, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow1", "arrow2"], 
      "property": "opacity", "value": 1,
      "startTime": 500, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["queue", "queue-label"],
      "property": "opacity", "value": 1, 
      "startTime": 1200, "duration": 500, "easing": "ease-out"
    },
    {
      "elementIds": ["arrow3"],
      "property": "opacity", "value": 1,
      "startTime": 1700, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["etl-transform", "etl-label"],
      "property": "opacity", "value": 1,
      "startTime": 2400, "duration": 500, "easing": "ease-out" 
    },
    {
      "elementIds": ["arrow4", "arrow5"],
      "property": "opacity", "value": 1,
      "startTime": 2900, "duration": 700, "easing": "ease-out"
    },
    {
      "elementIds": ["warehouse-sink", "warehouse-label", "dashboard-sink", "dashboard-label"],
      "property": "opacity", "value": 1,
      "startTime": 3600, "duration": 500, "easing": "ease-out"
    }
  ]
}
```

## Reference Files

- `component-library.md`: Pre-built JSON templates for common components
- `pipeline-patterns.md`: Complete topology examples with coordinates  
- `animation-recipes.md`: Animation timing patterns and effects