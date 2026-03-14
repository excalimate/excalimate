# Role Card Templates for Org Charts

This reference provides JSON templates for different types of role cards and organizational elements.

## Basic Role Card Templates

### 1. Simple Card (Name Only)
For minimalist org charts or when titles are obvious from context.

```json
{
  "type": "rectangle",
  "id": "role-simple-001",
  "x": 300,
  "y": 100,
  "width": 200,
  "height": 60,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "fillStyle": "hachure",
  "strokeSharpness": "round",
  "seed": 12345,
  "groupIds": [],
  "roundness": {"type": 3, "value": 8},
  "boundElements": [{
    "type": "text",
    "id": "role-simple-text-001"
  }],
  "updated": 1
}
```

```json
{
  "type": "text",
  "id": "role-simple-text-001",
  "x": 400,
  "y": 120,
  "width": 160,
  "height": 25,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "hachure",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "strokeSharpness": "sharp",
  "seed": 54321,
  "fontFamily": 1,
  "fontSize": 16,
  "fontWeight": "normal",
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "role-simple-001",
  "originalText": "Sarah Johnson",
  "text": "Sarah Johnson"
}
```

### 2. Standard Card (Name + Title)
Most common format for organizational charts.

```json
{
  "type": "rectangle",
  "id": "role-standard-001",
  "x": 300,
  "y": 100,
  "width": 200,
  "height": 80,
  "strokeColor": "#6741d9",
  "backgroundColor": "#d0bfff", 
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "fillStyle": "hachure",
  "strokeSharpness": "round",
  "seed": 12345,
  "groupIds": [],
  "roundness": {"type": 3, "value": 8},
  "boundElements": [{
    "type": "text",
    "id": "role-standard-text-001"
  }],
  "updated": 1
}
```

```json
{
  "type": "text", 
  "id": "role-standard-text-001",
  "x": 400,
  "y": 125,
  "width": 160,
  "height": 35,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "hachure",
  "strokeWidth": 1,
  "strokeStyle": "solid", 
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "strokeSharpness": "sharp",
  "seed": 54321,
  "fontFamily": 1,
  "fontSize": 14,
  "fontWeight": "normal",
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "role-standard-001",
  "originalText": "Sarah Johnson\nChief Executive Officer",
  "text": "Sarah Johnson\nChief Executive Officer"
}
```

### 3. Detailed Card (Name + Title + Department)
For complex organizations where department context is important.

```json
{
  "type": "rectangle",
  "id": "role-detailed-001", 
  "x": 300,
  "y": 100,
  "width": 220,
  "height": 100,
  "strokeColor": "#0c8599",
  "backgroundColor": "#99e9f2",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "fillStyle": "hachure", 
  "strokeSharpness": "round",
  "seed": 12345,
  "groupIds": [],
  "roundness": {"type": 3, "value": 8},
  "boundElements": [{
    "type": "text",
    "id": "role-detailed-text-001"
  }],
  "updated": 1
}
```

```json
{
  "type": "text",
  "id": "role-detailed-text-001", 
  "x": 410,
  "y": 125,
  "width": 180,
  "height": 55,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "hachure",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "strokeSharpness": "sharp",
  "seed": 54321,
  "fontFamily": 1,
  "fontSize": 13,
  "fontWeight": "normal", 
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "role-detailed-001",
  "originalText": "Mike Chen\nVP Engineering\nProduct Development",
  "text": "Mike Chen\nVP Engineering\nProduct Development"
}
```

## Color Schemes by Hierarchy Level

### Executive Level
- **Fill**: `#d0bfff` (light purple)
- **Stroke**: `#6741d9` (deep purple)
- **Use for**: CEO, CTO, CFO, COO, President

### Director Level  
- **Fill**: `#a5d8ff` (light blue)
- **Stroke**: `#1971c2` (deep blue)
- **Use for**: VP, Director, Head of Department

### Manager Level
- **Fill**: `#99e9f2` (light cyan) 
- **Stroke**: `#0c8599` (deep cyan)
- **Use for**: Manager, Team Lead, Senior Manager

### Individual Contributor
- **Fill**: `#b2f2bb` (light green)
- **Stroke**: `#2f9e44` (deep green)
- **Use for**: Engineer, Designer, Analyst, Specialist

### Alternative Color Schemes

#### Department-Based Colors
```json
{
  "engineering": {"fill": "#ffd8a8", "stroke": "#fd7e14"},
  "sales": {"fill": "#ffec99", "stroke": "#fab005"}, 
  "marketing": {"fill": "#d0ebff", "stroke": "#339af0"},
  "hr": {"fill": "#e7f5ff", "stroke": "#74c0fc"},
  "finance": {"fill": "#f8f0fc", "stroke": "#9775fa"}
}
```

#### Monochrome Scheme
```json
{
  "level1": {"fill": "#f8f9fa", "stroke": "#343a40"},
  "level2": {"fill": "#e9ecef", "stroke": "#495057"},
  "level3": {"fill": "#dee2e6", "stroke": "#6c757d"}, 
  "level4": {"fill": "#ced4da", "stroke": "#868e96"}
}
```

## Special Elements

### Team Boundary Frame
Groups multiple roles within the same team or department.

```json
{
  "type": "rectangle",
  "id": "team-boundary-001",
  "x": 250,
  "y": 50, 
  "width": 500,
  "height": 200,
  "strokeColor": "#868e96",
  "backgroundColor": "transparent",
  "strokeWidth": 2,
  "strokeStyle": "dashed",
  "roughness": 1,
  "opacity": 60,
  "fillStyle": "hachure",
  "strokeSharpness": "round",
  "seed": 12345,
  "groupIds": [],
  "roundness": {"type": 3, "value": 12},
  "boundElements": [{
    "type": "text", 
    "id": "team-boundary-label-001"
  }],
  "updated": 1
}
```

```json
{
  "type": "text",
  "id": "team-boundary-label-001",
  "x": 480,
  "y": 60,
  "width": 140,
  "height": 20,
  "strokeColor": "#868e96", 
  "backgroundColor": "#ffffff",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "groupIds": [],
  "strokeSharpness": "sharp",
  "seed": 54321,
  "fontFamily": 1,
  "fontSize": 12,
  "fontWeight": "bold",
  "textAlign": "center",
  "verticalAlign": "top",
  "containerId": "team-boundary-001",
  "originalText": "Engineering Team",
  "text": "Engineering Team"
}
```

### Dotted Reporting Arrow
Shows matrix reporting or advisory relationships.

```json
{
  "type": "arrow",
  "id": "dotted-reporting-001",
  "x": 400,
  "y": 200,
  "width": 200,
  "height": 100,
  "angle": 0,
  "strokeColor": "#868e96",
  "backgroundColor": "transparent",
  "strokeWidth": 2,
  "strokeStyle": "dotted",
  "roughness": 1,
  "opacity": 70,
  "fillStyle": "hachure",
  "strokeSharpness": "round", 
  "seed": 12345,
  "groupIds": [],
  "roundness": {"type": 2},
  "boundElements": [],
  "updated": 1,
  "points": [
    [0, 0],
    [200, 100]
  ],
  "lastCommittedPoint": [200, 100],
  "startBinding": null,
  "endBinding": null,
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

## Card Size Guidelines

### Width Recommendations
- **Minimum**: 160px (very short names/titles)
- **Standard**: 200px (most use cases)
- **Extended**: 220px (longer titles) 
- **Wide**: 250px (detailed cards with department info)

### Height Recommendations
- **Single line**: 50px (name only)
- **Two lines**: 80px (name + title)
- **Three lines**: 100px (name + title + department)
- **Four lines**: 120px (additional context like location)

## Text Formatting

### Font Specifications
```json
{
  "fontFamily": 1,          // Virgil (hand-drawn style)
  "fontSize": 14,           // Standard readable size
  "fontWeight": "normal",   // Regular weight for names
  "textAlign": "center",    // Centered within card
  "verticalAlign": "middle" // Vertically centered
}
```

### Multi-line Text Format
```javascript
// Standard format
"FirstName LastName\nJob Title"

// With department
"FirstName LastName\nJob Title\nDepartment Name"

// With location
"FirstName LastName\nJob Title\nLocation • Department"

// Abbreviated for space
"F. LastName\nTitle" 
```

### Text Overflow Handling
```javascript
function formatText(name, title, maxWidth = 180) {
  const maxCharsPerLine = Math.floor(maxWidth / 8); // ~8px per character
  
  if (title.length > maxCharsPerLine) {
    title = title.substring(0, maxCharsPerLine - 3) + "...";
  }
  
  return `${name}\n${title}`;
}
```

## Accessibility Considerations

### Color Contrast
Ensure sufficient contrast between text and background colors:
- **Minimum ratio**: 4.5:1 for normal text
- **Preferred ratio**: 7:1 for enhanced readability

### Color-Blind Friendly
Use patterns or shapes in addition to color coding:
```json
{
  "executive": {"strokeStyle": "solid", "strokeWidth": 3},
  "director": {"strokeStyle": "solid", "strokeWidth": 2},
  "manager": {"strokeStyle": "dashed", "strokeWidth": 2},
  "ic": {"strokeStyle": "dotted", "strokeWidth": 2}
}
```

These templates provide a comprehensive foundation for creating clear, professional organizational charts with appropriate visual hierarchy and accessibility features.