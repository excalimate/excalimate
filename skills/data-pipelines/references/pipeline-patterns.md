# Pipeline Patterns

Complete topology examples with coordinates and full `create_scene` JSON.

## 1. Linear ETL Pipeline

**Pattern**: Source → Extract → Transform → Load → Sink

```json
{
  "elements": [
    {
      "id": "source", "type": "rectangle",
      "x": 50, "y": 275, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0,
      "boundElements": [{"id": "source-label", "type": "text"}]
    },
    {
      "id": "source-label", "type": "text",
      "x": 130, "y": 310, "text": "Database", "fontSize": 16, "opacity": 0
    },
    {
      "id": "extract", "type": "rectangle", 
      "x": 300, "y": 275, "width": 180, "height": 80,
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "opacity": 0,
      "boundElements": [{"id": "extract-label", "type": "text"}]
    },
    {
      "id": "extract-label", "type": "text",
      "x": 390, "y": 315, "text": "Extract", "fontSize": 16, "opacity": 0
    },
    {
      "id": "transform", "type": "rectangle",
      "x": 550, "y": 275, "width": 180, "height": 80, 
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "opacity": 0,
      "boundElements": [{"id": "transform-label", "type": "text"}]
    },
    {
      "id": "transform-label", "type": "text",
      "x": 640, "y": 315, "text": "Transform", "fontSize": 16, "opacity": 0
    },
    {
      "id": "load", "type": "rectangle",
      "x": 800, "y": 275, "width": 180, "height": 80,
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "opacity": 0,
      "boundElements": [{"id": "load-label", "type": "text"}]
    },
    {
      "id": "load-label", "type": "text", 
      "x": 890, "y": 315, "text": "Load", "fontSize": 16, "opacity": 0
    },
    {
      "id": "sink", "type": "rectangle",
      "x": 1050, "y": 275, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "sink-label", "type": "text"}]
    },
    {
      "id": "sink-label", "type": "text",
      "x": 1130, "y": 310, "text": "Warehouse", "fontSize": 16, "opacity": 0
    },
    {"id": "arrow1", "type": "arrow", "x": 210, "y": 310, "x2": 300, "y2": 315, "opacity": 0},
    {"id": "arrow2", "type": "arrow", "x": 480, "y": 315, "x2": 550, "y2": 315, "opacity": 0},
    {"id": "arrow3", "type": "arrow", "x": 730, "y": 315, "x2": 800, "y2": 315, "opacity": 0},
    {"id": "arrow4", "type": "arrow", "x": 980, "y": 315, "x2": 1050, "y2": 310, "opacity": 0}
  ]
}
```

## 2. Fan-Out Pattern

**Pattern**: Source → Router → 3 Consumers

```json
{
  "elements": [
    {
      "id": "source", "type": "rectangle",
      "x": 50, "y": 275, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0,
      "boundElements": [{"id": "source-label", "type": "text"}]
    },
    {
      "id": "source-label", "type": "text",
      "x": 130, "y": 310, "text": "Event Source", "fontSize": 16, "opacity": 0
    },
    {
      "id": "router", "type": "diamond",
      "x": 330, "y": 240, "width": 140, "height": 120,
      "strokeColor": "#0c8599", "backgroundColor": "#99e9f2", "opacity": 0,
      "boundElements": [{"id": "router-label", "type": "text"}]
    },
    {
      "id": "router-label", "type": "text", 
      "x": 400, "y": 300, "text": "Router", "fontSize": 16, "opacity": 0
    },
    {
      "id": "consumer1", "type": "rectangle",
      "x": 600, "y": 150, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "consumer1-label", "type": "text"}]
    },
    {
      "id": "consumer1-label", "type": "text",
      "x": 680, "y": 185, "text": "Analytics", "fontSize": 16, "opacity": 0
    },
    {
      "id": "consumer2", "type": "rectangle", 
      "x": 600, "y": 275, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "consumer2-label", "type": "text"}]
    },
    {
      "id": "consumer2-label", "type": "text",
      "x": 680, "y": 310, "text": "Audit Log", "fontSize": 16, "opacity": 0
    },
    {
      "id": "consumer3", "type": "rectangle",
      "x": 600, "y": 400, "width": 160, "height": 70, 
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "consumer3-label", "type": "text"}]
    },
    {
      "id": "consumer3-label", "type": "text",
      "x": 680, "y": 435, "text": "Notification", "fontSize": 16, "opacity": 0
    },
    {"id": "arrow1", "type": "arrow", "x": 210, "y": 310, "x2": 330, "y2": 300, "opacity": 0},
    {"id": "arrow2", "type": "arrow", "x": 470, "y": 280, "x2": 600, "y2": 185, "opacity": 0},
    {"id": "arrow3", "type": "arrow", "x": 470, "y": 300, "x2": 600, "y2": 310, "opacity": 0},
    {"id": "arrow4", "type": "arrow", "x": 470, "y": 320, "x2": 600, "y2": 435, "opacity": 0}
  ]
}
```

## 3. Fan-In Pattern

**Pattern**: 3 Sources → Merge → Transform → Sink

```json
{
  "elements": [
    {
      "id": "source1", "type": "rectangle", 
      "x": 50, "y": 150, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0,
      "boundElements": [{"id": "source1-label", "type": "text"}]
    },
    {
      "id": "source1-label", "type": "text",
      "x": 130, "y": 185, "text": "Sales DB", "fontSize": 16, "opacity": 0
    },
    {
      "id": "source2", "type": "rectangle",
      "x": 50, "y": 275, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0,
      "boundElements": [{"id": "source2-label", "type": "text"}]
    },
    {
      "id": "source2-label", "type": "text",
      "x": 130, "y": 310, "text": "Marketing DB", "fontSize": 16, "opacity": 0
    },
    {
      "id": "source3", "type": "rectangle",
      "x": 50, "y": 400, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0, 
      "boundElements": [{"id": "source3-label", "type": "text"}]
    },
    {
      "id": "source3-label", "type": "text",
      "x": 130, "y": 435, "text": "Support DB", "fontSize": 16, "opacity": 0
    },
    {
      "id": "merge", "type": "rectangle",
      "x": 350, "y": 275, "width": 180, "height": 80,
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "opacity": 0,
      "boundElements": [{"id": "merge-label", "type": "text"}]
    },
    {
      "id": "merge-label", "type": "text",
      "x": 440, "y": 315, "text": "Merge", "fontSize": 16, "opacity": 0
    },
    {
      "id": "transform", "type": "rectangle", 
      "x": 600, "y": 275, "width": 180, "height": 80,
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "opacity": 0,
      "boundElements": [{"id": "transform-label", "type": "text"}]
    },
    {
      "id": "transform-label", "type": "text",
      "x": 690, "y": 315, "text": "Transform", "fontSize": 16, "opacity": 0
    },
    {
      "id": "sink", "type": "rectangle",
      "x": 850, "y": 275, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "sink-label", "type": "text"}]
    },
    {
      "id": "sink-label", "type": "text", 
      "x": 930, "y": 310, "text": "Data Lake", "fontSize": 16, "opacity": 0
    },
    {"id": "arrow1", "type": "arrow", "x": 210, "y": 185, "x2": 350, "y2": 295, "opacity": 0},
    {"id": "arrow2", "type": "arrow", "x": 210, "y": 310, "x2": 350, "y2": 315, "opacity": 0},
    {"id": "arrow3", "type": "arrow", "x": 210, "y": 435, "x2": 350, "y2": 335, "opacity": 0},
    {"id": "arrow4", "type": "arrow", "x": 530, "y": 315, "x2": 600, "y2": 315, "opacity": 0},
    {"id": "arrow5", "type": "arrow", "x": 780, "y": 315, "x2": 850, "y2": 310, "opacity": 0}
  ]
}
```

## 4. Diamond Pattern

**Pattern**: 2 Sources → 2 Transforms (cross-connected) → 2 Sinks

```json
{
  "elements": [
    {
      "id": "source1", "type": "rectangle",
      "x": 50, "y": 200, "width": 160, "height": 70, 
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0,
      "boundElements": [{"id": "source1-label", "type": "text"}]
    },
    {
      "id": "source1-label", "type": "text",
      "x": 130, "y": 235, "text": "Stream A", "fontSize": 16, "opacity": 0
    },
    {
      "id": "source2", "type": "rectangle",
      "x": 50, "y": 350, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0,
      "boundElements": [{"id": "source2-label", "type": "text"}]
    },
    {
      "id": "source2-label", "type": "text",
      "x": 130, "y": 385, "text": "Stream B", "fontSize": 16, "opacity": 0
    },
    {
      "id": "transform1", "type": "rectangle",
      "x": 350, "y": 200, "width": 180, "height": 80,
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "opacity": 0,
      "boundElements": [{"id": "transform1-label", "type": "text"}]
    },
    {
      "id": "transform1-label", "type": "text",
      "x": 440, "y": 240, "text": "Process X", "fontSize": 16, "opacity": 0
    },
    {
      "id": "transform2", "type": "rectangle",
      "x": 350, "y": 350, "width": 180, "height": 80,
      "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff", "opacity": 0,
      "boundElements": [{"id": "transform2-label", "type": "text"}]
    },
    {
      "id": "transform2-label", "type": "text",
      "x": 440, "y": 390, "text": "Process Y", "fontSize": 16, "opacity": 0
    },
    {
      "id": "sink1", "type": "rectangle",
      "x": 650, "y": 200, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "sink1-label", "type": "text"}]
    },
    {
      "id": "sink1-label", "type": "text",
      "x": 730, "y": 235, "text": "Output 1", "fontSize": 16, "opacity": 0
    },
    {
      "id": "sink2", "type": "rectangle", 
      "x": 650, "y": 350, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "sink2-label", "type": "text"}]
    },
    {
      "id": "sink2-label", "type": "text",
      "x": 730, "y": 385, "text": "Output 2", "fontSize": 16, "opacity": 0
    },
    {"id": "arrow1", "type": "arrow", "x": 210, "y": 235, "x2": 350, "y2": 240, "opacity": 0},
    {"id": "arrow2", "type": "arrow", "x": 210, "y": 385, "x2": 350, "y2": 390, "opacity": 0},
    {"id": "arrow3", "type": "arrow", "x": 210, "y": 250, "x2": 350, "y2": 375, "opacity": 0},
    {"id": "arrow4", "type": "arrow", "x": 210, "y": 370, "x2": 350, "y2": 255, "opacity": 0},
    {"id": "arrow5", "type": "arrow", "x": 530, "y": 235, "x2": 650, "y2": 235, "opacity": 0},
    {"id": "arrow6", "type": "arrow", "x": 530, "y": 385, "x2": 650, "y2": 385, "opacity": 0}
  ]
}
```

## 5. Streaming with Replay and Error Handling

**Pattern**: Source → Kafka → 2 Consumers + DLQ

```json
{
  "elements": [
    {
      "id": "source", "type": "rectangle",
      "x": 50, "y": 275, "width": 160, "height": 70,
      "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", "opacity": 0,
      "boundElements": [{"id": "source-label", "type": "text"}]
    },
    {
      "id": "source-label", "type": "text", 
      "x": 130, "y": 310, "text": "Event Source", "fontSize": 16, "opacity": 0
    },
    {
      "id": "kafka", "type": "rectangle",
      "x": 300, "y": 275, "width": 200, "height": 50,
      "strokeColor": "#f08c00", "backgroundColor": "#ffec99", "opacity": 0,
      "boundElements": [{"id": "kafka-label", "type": "text"}]
    },
    {
      "id": "kafka-label", "type": "text",
      "x": 400, "y": 300, "text": "Kafka Topic", "fontSize": 16, "opacity": 0
    },
    {
      "id": "consumer1", "type": "rectangle",
      "x": 650, "y": 200, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "consumer1-label", "type": "text"}]
    },
    {
      "id": "consumer1-label", "type": "text",
      "x": 730, "y": 235, "text": "Real-time", "fontSize": 16, "opacity": 0
    },
    {
      "id": "consumer2", "type": "rectangle", 
      "x": 650, "y": 325, "width": 160, "height": 70,
      "strokeColor": "#6741d9", "backgroundColor": "#d0bfff", "opacity": 0,
      "boundElements": [{"id": "consumer2-label", "type": "text"}]
    },
    {
      "id": "consumer2-label", "type": "text",
      "x": 730, "y": 360, "text": "Batch", "fontSize": 16, "opacity": 0
    },
    {
      "id": "dlq", "type": "rectangle",
      "x": 650, "y": 450, "width": 160, "height": 70,
      "strokeColor": "#e03131", "backgroundColor": "#ffc9c9", "opacity": 0,
      "boundElements": [{"id": "dlq-label", "type": "text"}]
    },
    {
      "id": "dlq-label", "type": "text",
      "x": 730, "y": 485, "text": "Dead Letter", "fontSize": 16, "opacity": 0
    },
    {"id": "arrow1", "type": "arrow", "x": 210, "y": 310, "x2": 300, "y2": 300, "opacity": 0},
    {"id": "arrow2", "type": "arrow", "x": 500, "y": 290, "x2": 650, "y2": 235, "opacity": 0},
    {"id": "arrow3", "type": "arrow", "x": 500, "y": 310, "x2": 650, "y2": 360, "opacity": 0}, 
    {"id": "arrow4", "type": "arrow", "x": 500, "y": 325, "x2": 650, "y2": 485, "opacity": 0}
  ]
}
```

## Layout Guidelines

- **X-coordinates**: Sources=50, Processing=350-500, Sinks=650-850
- **Stage separation**: 250-350px between columns
- **Parallel paths**: 120-150px vertical spacing
- **Centering**: Align around y=300 for single-path flows
- **Diamonds**: Use for routers/decision points
- **Colors**: Follow component library color scheme