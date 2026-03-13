# Aspect Ratios & Camera Framing

Detailed camera frame dimensions, positioning, and safe zones for each supported aspect ratio.

---

## Supported Aspect Ratios

### 16:9 — Widescreen

The standard for presentations, video, and modern displays.

| Property | Value |
|----------|-------|
| Width | 1600 |
| Height | 900 |
| Use cases | Presentations, YouTube, video embeds, widescreen displays |

```
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
```

**Safe zone:** Keep important content within x: 80–1520, y: 50–850 (80px horizontal / 50px vertical inset).

**Content layout tips:**
- Wide layouts work best — use horizontal flows
- Place titles along the top, details below
- Side-by-side comparisons fit naturally

---

### 4:3 — Classic

Traditional slide format. Still common in documentation and some projection systems.

| Property | Value |
|----------|-------|
| Width | 1200 |
| Height | 900 |
| Use cases | Classic slides, documentation, older projectors |

```
set_camera_frame({ x: 200, y: 0, width: 1200, aspectRatio: "4:3" })
```

**Safe zone:** Keep important content within x: 260–1340, y: 50–850 (60px horizontal / 50px vertical inset).

**Content layout tips:**
- More vertical space relative to width — good for taller diagrams
- Center-focused layouts work well
- Good for diagrams with roughly equal width and height

---

### 1:1 — Square

Optimized for social media and thumbnails.

| Property | Value |
|----------|-------|
| Width | 1000 |
| Height | 1000 |
| Use cases | Social media posts, thumbnails, avatars, icons |

```
set_camera_frame({ x: 300, y: 0, width: 1000, aspectRatio: "1:1" })
```

**Safe zone:** Keep important content within x: 350–1250, y: 50–950 (50px inset on all sides).

**Content layout tips:**
- Center the main subject
- Radial or circular layouts work naturally
- Keep text large — square frames are often viewed at small sizes
- Avoid wide horizontal flows — they'll be too small

---

### 9:16 — Vertical / Portrait

For mobile-first content, stories, and vertical video.

| Property | Value |
|----------|-------|
| Width | 600 |
| Height | 1067 |
| Use cases | Instagram/TikTok stories, mobile video, portrait displays |

```
set_camera_frame({ x: 500, y: 0, width: 600, aspectRatio: "9:16" })
```

**Safe zone:** Keep important content within x: 540–1060, y: 60–1007 (40px horizontal / 60px vertical inset).

**Content layout tips:**
- Vertical flows work best — top-to-bottom progressions
- Single-column layouts only
- Text must be large (small text becomes unreadable on mobile)
- Keep diagrams simple — limited horizontal space

---

## Positioning the Camera

The camera `x` and `y` define the **top-left corner** of the visible area. To center the camera on your content:

```
x = contentCenterX - (cameraWidth / 2)
y = contentCenterY - (cameraHeight / 2)
```

### Example: Centering on Content

If your diagram spans from (200, 100) to (1400, 800):

```
contentCenterX = (200 + 1400) / 2 = 800
contentCenterY = (100 + 800) / 2 = 450

// For 16:9 (1600×900):
x = 800 - 800 = 0
y = 450 - 450 = 0

set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
```

### Example: Content That Doesn't Fit

If your diagram is wider than the camera, increase `width` to zoom out:

```
// Diagram spans 2400px wide
// Add 100px padding (50px each side)
set_camera_frame({ x: -50, y: 0, width: 2500, aspectRatio: "16:9" })
// Height auto-calculated: 2500 * (9/16) = 1406px
```

---

## Safe Zones

Safe zones ensure content isn't cut off or too close to the edge of the exported frame. Different platforms crop or overlay UI elements at different margins.

### General Safe Zone Rule

Keep important content **50–80px** from each edge of the camera frame.

| Zone | Description | Inset |
|------|-------------|-------|
| **Title safe** | Text, labels, titles | 80px from edges |
| **Action safe** | Interactive elements, key visuals | 50px from edges |
| **Bleed area** | Decorative, can be partially cut | 0–50px from edges |

### Per-Ratio Safe Zone Summary

| Ratio | Camera Size | Safe Area (x range) | Safe Area (y range) |
|-------|------------|--------------------|--------------------|
| 16:9 | 1600×900 | 80–1520 | 50–850 |
| 4:3 | 1200×900 | 60–1140 | 50–850 |
| 1:1 | 1000×1000 | 50–950 | 50–950 |
| 9:16 | 600×1067 | 40–560 | 60–1007 |

> **Note:** Safe zone coordinates are relative to the camera frame, not the canvas. Add the camera's x/y to get canvas coordinates.

---

## Zoom Levels

The camera `width` controls zoom. The relationship between width and zoom:

| Width | Zoom Effect | Use Case |
|-------|------------|----------|
| 400–600 | Very zoomed in | Focus on a single element or detail |
| 800–1000 | Zoomed in | Small group of elements |
| 1200–1600 | Standard view | Full diagram, typical export |
| 2000–3000 | Zoomed out | Large diagram, overview |
| 3000+ | Very zoomed out | Huge canvas, many sections |

### Zoom During Camera Animation

When animating the camera with `add_camera_keyframes_batch`, animate the `width` property to zoom:

```json
[
  {"property": "width", "time": 0, "value": 1600},
  {"property": "width", "time": 2000, "value": 600, "easing": "easeInOutCubic"}
]
```

This zooms from showing 1600px to 600px over 2 seconds — a 2.67× zoom in.

---

## Choosing the Right Ratio

| Question | Answer → Ratio |
|----------|---------------|
| Going into a slide deck? | **16:9** (or **4:3** for older templates) |
| Posting on social media? | **1:1** for feed posts, **9:16** for stories |
| Embedding in a web page? | **16:9** for hero sections, **4:3** for inline |
| Adding to documentation? | **16:9** or **4:3** depending on layout |
| Sharing on mobile? | **9:16** for full-screen, **1:1** for compact |
| Creating a video? | **16:9** (standard) or **9:16** (vertical video) |
