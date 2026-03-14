# Callout Templates

Pre-defined JSON structures for common callout patterns in explainer animations.

## Basic Callout Box

Standard explanatory callout with contrasting background:

```json
{
  "id": "callout-basic",
  "type": "rectangle",
  "x": 50, "y": 50,
  "width": 180, "height": 60,
  "strokeColor": "#2D3748",
  "strokeWidth": 2,
  "backgroundColor": "#FFFFFF",
  "cornerRadius": 8,
  "label": {
    "text": "Your explanation text here",
    "fontSize": 12,
    "fontWeight": "normal",
    "color": "#2D3748"
  }
}
```

## Annotation Arrow

Connects callout to specific diagram element:

```json
{
  "id": "annotation-arrow",
  "type": "arrow",
  "points": [[230, 80], [320, 140]],
  "strokeColor": "#E53E3E",
  "strokeWidth": 2,
  "arrowheadType": "triangle"
}
```

## Step Number Badge

Small circular badge with step number:

```json
{
  "id": "step-badge",
  "type": "ellipse",
  "x": 40, "y": 40,
  "width": 24, "height": 24,
  "strokeColor": "#3182CE",
  "backgroundColor": "#3182CE",
  "label": {
    "text": "1",
    "fontSize": 12,
    "fontWeight": "bold",
    "color": "#FFFFFF"
  }
}
```

## Highlight Overlay

Semi-transparent rectangle to emphasize regions:

```json
{
  "id": "highlight-overlay",
  "type": "rectangle",
  "x": 200, "y": 150,
  "width": 100, "height": 80,
  "strokeColor": "#F6E05E",
  "strokeWidth": 3,
  "backgroundColor": "#F6E05E",
  "opacity": 0.3,
  "cornerRadius": 4
}
```

## Info Box

Detailed information panel with structured content:

```json
{
  "id": "info-box",
  "type": "rectangle",
  "x": 400, "y": 100,
  "width": 220, "height": 100,
  "strokeColor": "#4299E1",
  "strokeWidth": 2,
  "backgroundColor": "#EBF8FF",
  "cornerRadius": 6,
  "label": {
    "text": "💡 Key Information\nDetailed explanation\nwith multiple lines",
    "fontSize": 11,
    "color": "#2B6CB0"
  }
}
```

## Warning Box

Special emphasis for important caveats:

```json
{
  "id": "warning-box",
  "type": "rectangle", 
  "x": 300, "y": 300,
  "width": 200, "height": 80,
  "strokeColor": "#F56565",
  "strokeWidth": 2,
  "backgroundColor": "#FED7D7",
  "cornerRadius": 6,
  "label": {
    "text": "⚠️ Important\nCritical information\nto remember",
    "fontSize": 11,
    "fontWeight": "bold",
    "color": "#C53030"
  }
}
```

## Combined Callout Pattern

Callout box with arrow and step badge:

```json
[
  {
    "id": "step-2-badge",
    "type": "ellipse",
    "x": 40, "y": 120,
    "width": 24, "height": 24,
    "strokeColor": "#38A169",
    "backgroundColor": "#38A169",
    "label": {
      "text": "2",
      "fontSize": 12,
      "fontWeight": "bold", 
      "color": "#FFFFFF"
    }
  },
  {
    "id": "step-2-callout",
    "type": "rectangle",
    "x": 70, "y": 100,
    "width": 160, "height": 65,
    "strokeColor": "#38A169",
    "strokeWidth": 2,
    "backgroundColor": "#F0FFF4",
    "cornerRadius": 8,
    "label": {
      "text": "Step 2: Process\nData is processed\nby the server",
      "fontSize": 11,
      "color": "#276749"
    }
  },
  {
    "id": "step-2-arrow", 
    "type": "arrow",
    "points": [[230, 132], [300, 200]],
    "strokeColor": "#38A169",
    "strokeWidth": 2,
    "arrowheadType": "triangle"
  }
]
```

## Animation Patterns for Callouts

### Slide-in Animation

```json
{
  "id": "callout-slide-in",
  "keyframes": [
    {
      "time": 2000,
      "elements": {
        "callout-basic": {
          "opacity": 0,
          "x": 20
        }
      }
    },
    {
      "time": 2500,
      "elements": {
        "callout-basic": {
          "opacity": 1, 
          "x": 50
        }
      }
    }
  ]
}
```

### Arrow Draw-on

```json
{
  "id": "arrow-draw",
  "keyframes": [
    {
      "time": 2500,
      "elements": {
        "annotation-arrow": {
          "strokeDasharray": "200",
          "strokeDashoffset": "200"
        }
      }
    },
    {
      "time": 2800,
      "elements": {
        "annotation-arrow": {
          "strokeDasharray": "200",
          "strokeDashoffset": "0"
        }
      }
    }
  ]
}
```

### Highlight Pulse

```json
{
  "id": "highlight-pulse",
  "keyframes": [
    {
      "time": 3000,
      "elements": {
        "highlight-overlay": {
          "opacity": 0.1
        }
      }
    },
    {
      "time": 3300,
      "elements": {
        "highlight-overlay": {
          "opacity": 0.4
        }
      }
    },
    {
      "time": 3600,
      "elements": {
        "highlight-overlay": {
          "opacity": 0.2
        }
      }
    }
  ]
}
```

## Color Schemes

### Primary Steps (Blue Theme)
- Badge: `#3182CE`
- Callout Border: `#4299E1` 
- Background: `#EBF8FF`
- Text: `#2B6CB0`

### Secondary Steps (Green Theme)
- Badge: `#38A169`
- Callout Border: `#48BB78`
- Background: `#F0FFF4` 
- Text: `#276749`

### Warning/Critical (Red Theme)
- Badge: `#E53E3E`
- Callout Border: `#F56565`
- Background: `#FED7D7`
- Text: `#C53030`

### Neutral/Info (Gray Theme)
- Badge: `#4A5568`
- Callout Border: `#718096`
- Background: `#F7FAFC`
- Text: `#2D3748`