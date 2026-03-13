# Layout Algorithms Reference

Complete positioning algorithms and scene JSON for common flowchart layouts.

## 1. Linear Flow Layout

Simple sequential flow with no branches - 6 steps arranged vertically.

### Positioning Algorithm
- **Start Position**: (400, 50) - center horizontally
- **Vertical Spacing**: 150px between elements
- **Consistent Width**: 180px for all process boxes, 140px for terminals

### Complete Scene JSON
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "excalimate",
  "elements": [
    {
      "id": "start",
      "type": "ellipse",
      "x": 330,
      "y": 50,
      "width": 140,
      "height": 60,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "strokeWidth": 2,
      "boundElements": [{"id": "start-label", "type": "text"}]
    },
    {
      "id": "start-label",
      "type": "text",
      "text": "Start",
      "fontSize": 16,
      "containerId": "start"
    },
    {
      "id": "step1",
      "type": "rectangle", 
      "x": 310,
      "y": 160,
      "width": 180,
      "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "strokeWidth": 2,
      "boundElements": [{"id": "step1-label", "type": "text"}]
    },
    {
      "id": "step1-label",
      "type": "text",
      "text": "Initialize System",
      "fontSize": 14,
      "containerId": "step1"
    },
    {
      "id": "step2",
      "type": "rectangle",
      "x": 310,
      "y": 290,
      "width": 180,
      "height": 80,
      "strokeColor": "#1971c2", 
      "backgroundColor": "#a5d8ff",
      "strokeWidth": 2,
      "boundElements": [{"id": "step2-label", "type": "text"}]
    },
    {
      "id": "step2-label",
      "type": "text",
      "text": "Load Configuration",
      "fontSize": 14,
      "containerId": "step2"
    },
    {
      "id": "step3",
      "type": "rectangle",
      "x": 310,
      "y": 420,
      "width": 180,
      "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "strokeWidth": 2,
      "boundElements": [{"id": "step3-label", "type": "text"}]
    },
    {
      "id": "step3-label",
      "type": "text",
      "text": "Validate Input",
      "fontSize": 14,
      "containerId": "step3"
    },
    {
      "id": "step4",
      "type": "rectangle",
      "x": 310,
      "y": 550,
      "width": 180,
      "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "strokeWidth": 2,
      "boundElements": [{"id": "step4-label", "type": "text"}]
    },
    {
      "id": "step4-label",
      "type": "text",
      "text": "Process Data",
      "fontSize": 14,
      "containerId": "step4"
    },
    {
      "id": "end",
      "type": "ellipse",
      "x": 330,
      "y": 680,
      "width": 140,
      "height": 60,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "strokeWidth": 2,
      "boundElements": [{"id": "end-label", "type": "text"}]
    },
    {
      "id": "end-label",
      "type": "text",
      "text": "End",
      "fontSize": 16,
      "containerId": "end"
    },
    {
      "id": "arrow1",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "start"},
      "endBinding": {"elementId": "step1"}
    },
    {
      "id": "arrow2",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "step1"},
      "endBinding": {"elementId": "step2"}
    },
    {
      "id": "arrow3",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "step2"},
      "endBinding": {"elementId": "step3"}
    },
    {
      "id": "arrow4",
      "type": "arrow", 
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "step3"},
      "endBinding": {"elementId": "step4"}
    },
    {
      "id": "arrow5",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "step4"},
      "endBinding": {"elementId": "end"}
    }
  ]
}
```

## 2. Single Decision Branch Layout

Flow with one decision point that branches and rejoins.

### Positioning Algorithm
- **Main Path**: Straight down center (400px)
- **Decision Point**: Diamond at center
- **Yes Branch**: Continue straight down from decision
- **No Branch**: Branch right by 300px, then return to main path
- **Rejoin Point**: Connector below both branches

### Complete Scene JSON
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "excalimate",
  "elements": [
    {
      "id": "start",
      "type": "ellipse",
      "x": 330,
      "y": 50,
      "width": 140,
      "height": 60,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "strokeWidth": 2,
      "boundElements": [{"id": "start-label", "type": "text"}]
    },
    {
      "id": "start-label",
      "type": "text",
      "text": "Start",
      "fontSize": 16,
      "containerId": "start"
    },
    {
      "id": "input",
      "type": "rectangle",
      "x": 310,
      "y": 160,
      "width": 180,
      "height": 70,
      "strokeColor": "#0c8599",
      "backgroundColor": "#99e9f2",
      "strokeWidth": 2,
      "boundElements": [{"id": "input-label", "type": "text"}]
    },
    {
      "id": "input-label",
      "type": "text",
      "text": "Get User Input",
      "fontSize": 14,
      "containerId": "input"
    },
    {
      "id": "decision",
      "type": "diamond",
      "x": 320,
      "y": 280,
      "width": 160,
      "height": 140,
      "strokeColor": "#f08c00",
      "backgroundColor": "#ffec99",
      "strokeWidth": 2,
      "boundElements": [{"id": "decision-label", "type": "text"}]
    },
    {
      "id": "decision-label",
      "type": "text",
      "text": "Valid Input?",
      "fontSize": 14,
      "containerId": "decision"
    },
    {
      "id": "process-yes",
      "type": "rectangle",
      "x": 310,
      "y": 470,
      "width": 180,
      "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "strokeWidth": 2,
      "boundElements": [{"id": "process-yes-label", "type": "text"}]
    },
    {
      "id": "process-yes-label",
      "type": "text",
      "text": "Process Input",
      "fontSize": 14,
      "containerId": "process-yes"
    },
    {
      "id": "process-no",
      "type": "rectangle",
      "x": 610,
      "y": 470,
      "width": 180,
      "height": 80,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffc9c9",
      "strokeWidth": 2,
      "boundElements": [{"id": "process-no-label", "type": "text"}]
    },
    {
      "id": "process-no-label", 
      "type": "text",
      "text": "Show Error",
      "fontSize": 14,
      "containerId": "process-no"
    },
    {
      "id": "connector",
      "type": "ellipse",
      "x": 395,
      "y": 600,
      "width": 10,
      "height": 10,
      "strokeColor": "#495057",
      "backgroundColor": "#495057",
      "strokeWidth": 1
    },
    {
      "id": "end",
      "type": "ellipse",
      "x": 330,
      "y": 660,
      "width": 140,
      "height": 60,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "strokeWidth": 2,
      "boundElements": [{"id": "end-label", "type": "text"}]
    },
    {
      "id": "end-label",
      "type": "text",
      "text": "End",
      "fontSize": 16,
      "containerId": "end"
    },
    {
      "id": "arrow1",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "start"},
      "endBinding": {"elementId": "input"}
    },
    {
      "id": "arrow2",
      "type": "arrow",
      "strokeColor": "#495057", 
      "strokeWidth": 2,
      "startBinding": {"elementId": "input"},
      "endBinding": {"elementId": "decision"}
    },
    {
      "id": "arrow-yes",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "decision"},
      "endBinding": {"elementId": "process-yes"},
      "label": {"text": "Yes", "fontSize": 12}
    },
    {
      "id": "arrow-no",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "decision"},
      "endBinding": {"elementId": "process-no"},
      "label": {"text": "No", "fontSize": 12}
    },
    {
      "id": "arrow3",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "process-yes"},
      "endBinding": {"elementId": "connector"}
    },
    {
      "id": "arrow4",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "process-no"},
      "endBinding": {"elementId": "connector"}
    },
    {
      "id": "arrow5",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "connector"},
      "endBinding": {"elementId": "end"}
    }
  ]
}
```

## 3. Swimlane Layout

Multi-actor process with vertical lanes separated by frames.

### Positioning Algorithm
- **Lane Width**: 250px per lane
- **Lane Separation**: 50px between lanes  
- **Vertical Alignment**: Elements aligned within lanes
- **Frame Elements**: Background rectangles for each lane
- **Cross-Lane Arrows**: Connect between lanes when process transfers

### Complete Scene JSON
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "excalimate",
  "elements": [
    {
      "id": "lane1-frame",
      "type": "rectangle",
      "x": 50,
      "y": 20,
      "width": 250,
      "height": 600,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "strokeWidth": 2,
      "strokeStyle": "dashed",
      "boundElements": [{"id": "lane1-title", "type": "text"}]
    },
    {
      "id": "lane1-title",
      "type": "text",
      "text": "Customer",
      "fontSize": 18,
      "fontFamily": 1,
      "textAlign": "center",
      "x": 150,
      "y": 30,
      "width": 100,
      "height": 25
    },
    {
      "id": "lane2-frame",
      "type": "rectangle",
      "x": 350,
      "y": 20,
      "width": 250,
      "height": 600,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "strokeWidth": 2,
      "strokeStyle": "dashed",
      "boundElements": [{"id": "lane2-title", "type": "text"}]
    },
    {
      "id": "lane2-title",
      "type": "text",
      "text": "System",
      "fontSize": 18,
      "fontFamily": 1,
      "textAlign": "center",
      "x": 450,
      "y": 30,
      "width": 100,
      "height": 25
    },
    {
      "id": "lane3-frame",
      "type": "rectangle",
      "x": 650,
      "y": 20,
      "width": 250,
      "height": 600,
      "strokeColor": "#868e96",
      "backgroundColor": "transparent",
      "strokeWidth": 2,
      "strokeStyle": "dashed",
      "boundElements": [{"id": "lane3-title", "type": "text"}]
    },
    {
      "id": "lane3-title",
      "type": "text",
      "text": "Administrator",
      "fontSize": 18,
      "fontFamily": 1,
      "textAlign": "center",
      "x": 750,
      "y": 30,
      "width": 100,
      "height": 25
    },
    {
      "id": "start",
      "type": "ellipse",
      "x": 135,
      "y": 80,
      "width": 140,
      "height": 60,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#b2f2bb",
      "strokeWidth": 2,
      "boundElements": [{"id": "start-label", "type": "text"}]
    },
    {
      "id": "start-label",
      "type": "text",
      "text": "Start Request",
      "fontSize": 14,
      "containerId": "start"
    },
    {
      "id": "request",
      "type": "rectangle",
      "x": 125,
      "y": 200,
      "width": 160,
      "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "strokeWidth": 2,
      "boundElements": [{"id": "request-label", "type": "text"}]
    },
    {
      "id": "request-label",
      "type": "text",
      "text": "Submit Form",
      "fontSize": 14,
      "containerId": "request"
    },
    {
      "id": "validate",
      "type": "rectangle",
      "x": 405,
      "y": 200,
      "width": 160,
      "height": 80,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "strokeWidth": 2,
      "boundElements": [{"id": "validate-label", "type": "text"}]
    },
    {
      "id": "validate-label",
      "type": "text",
      "text": "Validate Request",
      "fontSize": 14,
      "containerId": "validate"
    },
    {
      "id": "review",
      "type": "rectangle",
      "x": 705,
      "y": 350,
      "width": 160,
      "height": 80,
      "strokeColor": "#f08c00",
      "backgroundColor": "#ffec99",
      "strokeWidth": 2,
      "boundElements": [{"id": "review-label", "type": "text"}]
    },
    {
      "id": "review-label",
      "type": "text",
      "text": "Manual Review",
      "fontSize": 14,
      "containerId": "review"
    },
    {
      "id": "notify",
      "type": "rectangle",
      "x": 125,
      "y": 500,
      "width": 160,
      "height": 80,
      "strokeColor": "#0c8599",
      "backgroundColor": "#99e9f2",
      "strokeWidth": 2,
      "boundElements": [{"id": "notify-label", "type": "text"}]
    },
    {
      "id": "notify-label",
      "type": "text",
      "text": "Receive Notification",
      "fontSize": 14,
      "containerId": "notify"
    },
    {
      "id": "arrow1",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "start"},
      "endBinding": {"elementId": "request"}
    },
    {
      "id": "arrow2",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "request"},
      "endBinding": {"elementId": "validate"}
    },
    {
      "id": "arrow3",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "validate"},
      "endBinding": {"elementId": "review"}
    },
    {
      "id": "arrow4",
      "type": "arrow",
      "strokeColor": "#495057",
      "strokeWidth": 2,
      "startBinding": {"elementId": "review"},
      "endBinding": {"elementId": "notify"}
    }
  ]
}
```

## Layout Tips

1. **Consistent Spacing**: Use multiples of 50px for positioning (50, 100, 150, etc.)
2. **Center Alignment**: Calculate center positions: (totalWidth - elementWidth) / 2
3. **Frame Elements**: Use dashed stroke style for swimlane boundaries
4. **Arrow Routing**: Bound arrows automatically route around obstacles
5. **Scale Considerations**: Design for 800-1200px width, adjust lanes accordingly
6. **Element Hierarchy**: Frames first, then shapes, then connectors, then labels