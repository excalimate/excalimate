# Symbol Library Reference

Complete JSON definitions for all standard flowchart symbols with bound labels.

## Terminal Symbols

### Start Terminal
```json
{
  "id": "start",
  "type": "ellipse",
  "x": 360,
  "y": 50,
  "width": 140,
  "height": 60,
  "strokeColor": "#2f9e44",
  "backgroundColor": "#b2f2bb",
  "strokeWidth": 2,
  "boundElements": [{"id": "start-label", "type": "text"}]
}
```

### Start Terminal Label
```json
{
  "id": "start-label",
  "type": "text",
  "text": "Start",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "start",
  "originalText": "Start"
}
```

### End Terminal
```json
{
  "id": "end",
  "type": "ellipse", 
  "x": 360,
  "y": 700,
  "width": 140,
  "height": 60,
  "strokeColor": "#2f9e44",
  "backgroundColor": "#b2f2bb",
  "strokeWidth": 2,
  "boundElements": [{"id": "end-label", "type": "text"}]
}
```

### End Terminal Label
```json
{
  "id": "end-label",
  "type": "text",
  "text": "End",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center", 
  "verticalAlign": "middle",
  "containerId": "end",
  "originalText": "End"
}
```

## Process Symbols

### Process Step
```json
{
  "id": "process1",
  "type": "rectangle",
  "x": 320,
  "y": 200,
  "width": 180,
  "height": 80,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "strokeWidth": 2,
  "boundElements": [{"id": "process1-label", "type": "text"}]
}
```

### Process Step Label
```json
{
  "id": "process1-label",
  "type": "text",
  "text": "Process Step",
  "fontSize": 14,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "process1",
  "originalText": "Process Step"
}
```

## Decision Symbols

### Decision Diamond
```json
{
  "id": "decision1",
  "type": "diamond",
  "x": 340,
  "y": 350,
  "width": 160,
  "height": 140,
  "strokeColor": "#f08c00",
  "backgroundColor": "#ffec99",
  "strokeWidth": 2,
  "boundElements": [{"id": "decision1-label", "type": "text"}]
}
```

### Decision Diamond Label
```json
{
  "id": "decision1-label",
  "type": "text",
  "text": "Decision?",
  "fontSize": 14,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle", 
  "containerId": "decision1",
  "originalText": "Decision?"
}
```

## Input/Output Symbols

### Input/Output Box
```json
{
  "id": "io1",
  "type": "rectangle",
  "x": 320,
  "y": 300,
  "width": 180,
  "height": 70,
  "strokeColor": "#0c8599",
  "backgroundColor": "#99e9f2",
  "strokeWidth": 2,
  "boundElements": [{"id": "io1-label", "type": "text"}]
}
```

### Input/Output Box Label
```json
{
  "id": "io1-label",
  "type": "text",
  "text": "Input/Output",
  "fontSize": 14,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "io1", 
  "originalText": "Input/Output"
}
```

## Error/Reject Symbols

### Error/Reject Box
```json
{
  "id": "error1",
  "type": "rectangle",
  "x": 320,
  "y": 450,
  "width": 180,
  "height": 80,
  "strokeColor": "#e03131",
  "backgroundColor": "#ffc9c9",
  "strokeWidth": 2,
  "boundElements": [{"id": "error1-label", "type": "text"}]
}
```

### Error/Reject Box Label
```json
{
  "id": "error1-label",
  "type": "text",
  "text": "Error/Reject",
  "fontSize": 14,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "error1",
  "originalText": "Error/Reject"
}
```

## Connector Symbols

### Connector Dot
```json
{
  "id": "connector1",
  "type": "ellipse",
  "x": 425,
  "y": 520,
  "width": 10,
  "height": 10,
  "strokeColor": "#495057",
  "backgroundColor": "#495057",
  "strokeWidth": 1
}
```

## Arrow Connectors

### Standard Arrow
```json
{
  "id": "arrow1",
  "type": "arrow",
  "x": 430,
  "y": 110,
  "width": 0,
  "height": 90,
  "strokeColor": "#495057",
  "strokeWidth": 2,
  "startBinding": {
    "elementId": "start",
    "focus": 0,
    "gap": 1
  },
  "endBinding": {
    "elementId": "process1", 
    "focus": 0,
    "gap": 1
  },
  "points": [[0, 0], [0, 90]]
}
```

### Labeled Arrow (Decision Branch)
```json
{
  "id": "arrow-yes",
  "type": "arrow",
  "x": 420,
  "y": 490,
  "width": 0,
  "height": 60,
  "strokeColor": "#495057",
  "strokeWidth": 2,
  "startBinding": {
    "elementId": "decision1",
    "focus": 0,
    "gap": 1
  },
  "endBinding": {
    "elementId": "process2",
    "focus": 0, 
    "gap": 1
  },
  "points": [[0, 0], [0, 60]],
  "label": {
    "text": "Yes",
    "fontSize": 12,
    "fontFamily": 1,
    "textAlign": "center"
  }
}
```

## Usage Notes

1. **IDs must be unique** across the entire scene
2. **Bound elements** automatically position text within shapes
3. **Color consistency** - use the standard color palette for each symbol type
4. **Stroke width** should be 2 for shapes, 1-2 for connectors
5. **Font settings** - fontSize 14 for shapes, 12 for arrow labels, 16 for terminals
6. **Arrow bindings** automatically maintain connections when shapes move
7. **Points array** defines arrow path - use [[0,0], [0,90]] for straight vertical arrows