# Mind Map Styling Guide

## Node Sizing System

### Hierarchy Table
| Level | Width | Height | Font Size | Font Weight | Stroke Width |
|-------|-------|--------|-----------|-------------|--------------|
| Center | 280px | 100px | 28px | bold | 3px |
| Primary | 200px | 70px | 20px | semibold | 2px |
| Secondary | 160px | 50px | 16px | regular | 1px |
| Tertiary | 140px | 40px | 14px | regular | 1px |

### Responsive Sizing
```javascript
// Adjust width based on text content
const calculateWidth = (text, baseWidth) => {
  const charWidth = baseWidth / 12; // Approximate characters per base width
  const minWidth = baseWidth * 0.8;
  const maxWidth = baseWidth * 1.4;
  
  return Math.max(minWidth, Math.min(maxWidth, text.length * charWidth));
};
```

## Color Palettes

### Branch Colors (6 distinct palettes)
1. **Blue Branch**: stroke: #1971c2, fill: #a5d8ff, accent: #74c0fc
2. **Green Branch**: stroke: #2f9e44, fill: #b2f2bb, accent: #8ce99a  
3. **Orange Branch**: stroke: #f08c00, fill: #ffec99, accent: #ffd43b
4. **Purple Branch**: stroke: #6741d9, fill: #d0bfff, accent: #b197fc
5. **Teal Branch**: stroke: #0c8599, fill: #99e9f2, accent: #66d9ef
6. **Red Branch**: stroke: #e03131, fill: #ffc9c9, accent: #ff8787

### Color Application Rules
- **Primary branches**: Full opacity colors
- **Sub-branches**: 70% opacity of parent color  
- **Connectors**: Match target node stroke color
- **Text**: Always high contrast (#1e1e1e or #ffffff)

### Neutral Options
For single-color maps or minimal styling:
- **Light**: stroke: #868e96, fill: #f1f3f4
- **Medium**: stroke: #495057, fill: #e9ecef  
- **Dark**: stroke: #212529, fill: #ffffff

## Typography Scale

### Font Families (Excalidraw)
- **1**: Virgil (hand-drawn, default)
- **2**: Helvetica (clean, professional)
- **3**: Cascadia (monospace, technical)

### Text Alignment
- **Center nodes**: center + middle
- **Branch nodes**: center + middle
- **Long text**: Consider left alignment for readability

### Text Contrast Rules
```javascript
// Ensure readable contrast
const getTextColor = (backgroundColor) => {
  const lightColors = ['#a5d8ff', '#b2f2bb', '#ffec99', '#d0bfff', '#99e9f2', '#ffc9c9'];
  return lightColors.includes(backgroundColor) ? '#1e1e1e' : '#ffffff';
};
```

## Connector Styles

### By Hierarchy Level
| Connection | Type | Width | Style | Color |
|------------|------|-------|--------|-------|
| Center → Primary | line | 3px | curved | target stroke |
| Primary → Sub | line | 2px | curved | target stroke |
| Sub → Sub | line | 1px | straight | parent stroke |

### Curve Styles
- **Gentle curves**: Use 3-point bezier with slight bend
- **Organic feel**: Avoid perfectly straight lines
- **Visual flow**: Curves should guide eye naturally

```json
{
  "type": "line",
  "points": [[x1, y1], [midX, midY], [x2, y2]],
  "strokeColor": "#1971c2",
  "strokeWidth": 2
}
```

## Visual Hierarchy

### Emphasis Techniques
1. **Size**: Larger = more important
2. **Color**: Bright/saturated = primary focus
3. **Position**: Center = most important
4. **Stroke weight**: Thicker = higher hierarchy

### Background and Canvas
- **Canvas background**: #f8f9fa (light gray)
- **Alternative**: #ffffff (white) for high contrast
- **Avoid**: Dark backgrounds (reduce readability)

## Accessibility Guidelines

### Color Considerations
- Don't rely on color alone for meaning
- Ensure sufficient contrast ratios (4.5:1 minimum)
- Test with colorblind simulation

### Text Readability
- Minimum font size: 14px
- Maximum text per node: 3-4 words
- Use sentence case, not ALL CAPS

### Visual Clarity
- Maintain consistent spacing
- Avoid overlapping elements
- Provide adequate white space around nodes

## Common Style Combinations

### Professional Style
```json
{
  "backgroundColor": "#ffffff",
  "strokeColor": "#495057", 
  "fontFamily": 2,
  "roughness": 0
}
```

### Creative/Brainstorming Style  
```json
{
  "backgroundColor": "#colorful",
  "strokeColor": "#contrasting",
  "fontFamily": 1,
  "roughness": 1
}
```

### Technical/Documentation Style
```json
{
  "backgroundColor": "#f1f3f4",
  "strokeColor": "#868e96",
  "fontFamily": 3,
  "roughness": 0  
}
```