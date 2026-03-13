# Scene Layout Patterns

Different ways to arrange scenes on the Excalidraw canvas for various presentation styles.

## 1. Horizontal Strip Layout
**Best for**: Linear presentations, timeline narratives, step-by-step tutorials

```
Scene dimensions: 1600×900 (16:9)
Gap: 400px
Total width for 5 scenes: 5×1600 + 4×400 = 9600px

Scene positions:
- Scene 1: x=0, y=0
- Scene 2: x=2000, y=0  
- Scene 3: x=4000, y=0
- Scene 4: x=6000, y=0
- Scene 5: x=8000, y=0

Camera: width=1600, aspectRatio="16:9"
```

## 2. Grid Layout (2×3)
**Best for**: Comparing options, before/after, structured content

```
Scene dimensions: 1600×900 (16:9)
Horizontal gap: 400px, Vertical gap: 300px

Grid positions:
- Scene 1 (top-left): x=0, y=0
- Scene 2 (top-right): x=2000, y=0
- Scene 3 (middle-left): x=0, y=1200  
- Scene 4 (middle-right): x=2000, y=1200
- Scene 5 (bottom-left): x=0, y=2400
- Scene 6 (bottom-right): x=2000, y=2400

Camera: width=1600, aspectRatio="16:9"
Total canvas: 4000×3300px
```

## 3. Zoom Hierarchy Layout  
**Best for**: Overview→detail→context presentations, technical deep-dives

```
Overview scene (wide view):
- Position: x=2000, y=1000
- Dimensions: 3200×1800 (needs camera width=3200)

Detail scenes (zoomed in):
- Detail 1: x=0, y=0 (1600×900)
- Detail 2: x=4000, y=0 (1600×900)  
- Detail 3: x=0, y=2000 (1600×900)
- Detail 4: x=4000, y=2000 (1600×900)

Camera transitions:
- Start: width=1600 (detail)
- Zoom out: width=3200 (overview)
- Zoom in: width=1600 (other details)
```

## 4. Aspect Ratio Reference

### 16:9 (Widescreen - Recommended)
- **1600×900**: Standard scene size
- **3200×1800**: Large overview scene
- **800×450**: Small detail scene

### 4:3 (Traditional)  
- **1600×1200**: Square-ish scene
- **800×600**: Small traditional scene

### 1:1 (Square)
- **1200×1200**: Perfect square
- **600×600**: Small square

### 9:16 (Portrait/Mobile)
- **900×1600**: Vertical scene
- **450×800**: Small vertical scene

## Layout Selection Guide

**Choose Horizontal Strip when**:
- Linear story progression
- Timeline-based content
- Step-by-step instructions
- Simple slide-like flow

**Choose Grid when**:
- Comparing multiple options
- Showing different perspectives  
- Organizing by categories
- Matrix-style analysis

**Choose Zoom Hierarchy when**:
- Technical architecture diagrams
- Detailed system explanations
- Multi-level information
- Context→detail→context flow

**Camera Width Formula**:
```
For aspect ratio 16:9:
height = width ÷ 16 × 9

For aspect ratio 4:3:  
height = width ÷ 4 × 3

For aspect ratio 1:1:
height = width
```