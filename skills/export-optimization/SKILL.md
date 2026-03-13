---
name: export-optimization
description: >
  Optimize Excalimate diagram exports for different formats and platforms. Use when
  asked to export animations, set up camera framing, choose output format, adjust
  aspect ratios, or prepare diagrams for specific destinations like presentations,
  social media, documentation, or video — even if the user just says "export" or
  "make it ready to share."
---

# Export Optimization

Prepare Excalimate animated diagrams for high-quality export across formats and platforms. This skill covers camera framing, format selection, aspect ratios, clip ranges, and pre-export verification.

## Export Workflow

Follow these steps in order before every export:

1. **Verify visibility** — call `items_visible_in_camera({time: 0})` and check at key animation times. All important elements should appear in the results.
2. **Verify centering** — call `is_camera_centered({axis: "both"})`. If off-center, adjust camera position with `set_camera_frame`.
3. **Set clip range** — call `set_clip_range({start: 0, end: lastKeyframeTime + 500})`. The padding gives breathing room after the last animation.
4. **Save checkpoint** — call `save_checkpoint()` to persist the final state.
5. **Export from web app** — the user selects format and downloads from the Excalimate web interface.

> **Always verify before exporting.** A missing element or clipped animation is the most common export issue.

---

## Format Selection Quick Guide

| Format | Best For | Quality | File Size |
|--------|----------|---------|-----------|
| **MP4** (H.264) | Presentations, video, sharing | ★★★★★ | Medium |
| **WebM** (VP9) | Web embedding, documentation sites | ★★★★ | Small |
| **GIF** | Slack, README, universal embed | ★★ | Large |
| **SVG** (Animated) | Documentation, print, scalable | ★★★★★ | Small |

**Decision flow:**
- Need universal compatibility? → **MP4**
- Embedding on a website? → **WebM** (falls back to MP4)
- Needs to auto-play everywhere (chat, docs)? → **GIF**
- Need vector/scalable output? → **SVG**

See [format-guide.md](references/format-guide.md) for detailed pros/cons and encoding notes.

---

## Camera Framing

Use `set_camera_frame` to define what the exported video/image will show:

```
set_camera_frame({
  x: 50,
  y: 50,
  width: 1600,
  aspectRatio: "16:9"
})
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `x` | Left edge of the camera view (pixels) |
| `y` | Top edge of the camera view (pixels) |
| `width` | How wide the camera sees — controls zoom level |
| `aspectRatio` | `"16:9"`, `"4:3"`, `"1:1"`, or `"9:16"` |

### Width Controls Zoom

- `width: 1600` — shows a 1600px-wide area (standard view)
- `width: 800` — shows an 800px-wide area (zoomed in 2×)
- `width: 3200` — shows a 3200px-wide area (zoomed out 2×)

### Padding Rule

Always add **50px padding** around your content on all sides. If your diagram spans x=100–1500 and y=100–900:

```
set_camera_frame({
  x: 50,       // 100 - 50 padding
  y: 50,       // 100 - 50 padding
  width: 1500, // (1500 - 100) + 100 padding
  aspectRatio: "16:9"
})
```

---

## Aspect Ratio Guide

Choose based on the destination platform:

| Ratio | Use Case | Camera Width | Resulting Height |
|-------|----------|-------------|-----------------|
| **16:9** | Presentations, YouTube, widescreen | 1600 | 900 |
| **4:3** | Classic slides, documentation | 1200 | 900 |
| **1:1** | Social media, thumbnails | 1000 | 1000 |
| **9:16** | Mobile stories, vertical video | 600 | 1067 |

### Common Setups

**Presentation (16:9):**
```
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
```

**Social post (1:1):**
```
set_camera_frame({ x: 250, y: 0, width: 1000, aspectRatio: "1:1" })
```

**Vertical story (9:16):**
```
set_camera_frame({ x: 400, y: 0, width: 600, aspectRatio: "9:16" })
```

See [aspect-ratios.md](references/aspect-ratios.md) for detailed dimensions and safe zone guidance.

---

## Clip Range

The clip range defines the time window that gets exported.

```
set_clip_range({ start: 0, end: 5500 })
```

### Rules

- **Start** is usually `0` unless you want to skip an intro.
- **End** should be the last keyframe time **+ 500–1000ms** padding.
- Padding gives the viewer a moment to absorb the final state.
- For looping GIFs, consider adding a 1000–2000ms hold at the end.

### Calculating End Time

1. Identify your last keyframe time (e.g., an arrow finishes drawing at 5000ms).
2. Add 500ms minimum padding: `end: 5500`.
3. For presentations or complex diagrams, add 1000ms: `end: 6000`.

---

## Pre-Export Verification Checklist

Run these checks before every export:

### 1. Element Visibility

```
items_visible_in_camera({ time: 0 })
items_visible_in_camera({ time: 2500 })  // mid-animation
items_visible_in_camera({ time: 5000 })  // end of animation
```

Check at multiple times throughout the animation. Every important element should appear in at least one check. Elements that animate in later may not be visible at time 0 — that's expected.

### 2. Camera Centering

```
is_camera_centered({ axis: "both" })
is_camera_centered({ axis: "x", tolerance: 50 })
```

The camera should be centered on your content. Use `tolerance` to allow small offsets (default is tight). For asymmetric layouts, check each axis independently.

### 3. Animation Timing

```
animations_of_item({ targetId: "title" })
animations_of_item({ targetId: "final_arrow" })
```

Verify that key elements have the expected keyframes and that the last animation ends before your clip range end time (minus padding).

### 4. Final Review

| Check | Tool | Expected |
|-------|------|----------|
| All elements visible | `items_visible_in_camera` | Key elements present at relevant times |
| Camera centered | `is_camera_centered` | Centered on both axes |
| Clip covers animation | `set_clip_range` | End ≥ last keyframe + 500ms |
| Checkpoint saved | `save_checkpoint` | State persisted |

---

## Platform Quick Reference

| Platform | Format | Ratio | Max Duration | Notes |
|----------|--------|-------|-------------|-------|
| Google Slides | GIF / MP4 | 16:9 | Any | GIF auto-plays in slides |
| Slack | GIF | 1:1 / 16:9 | < 15s | Keep under 10MB |
| Twitter/X | MP4 | 16:9 | < 30s | MP4 required for quality |
| YouTube | MP4 | 16:9 | Any | Highest quality settings |
| README / Docs | GIF | Any | < 10s | Small dimensions, low file size |
| Email | GIF | Any | < 5s | Many clients block video |
| Figma | SVG | Any | N/A | Vector preserves editability |
| Website embed | WebM | 16:9 | Any | Falls back to MP4 |

See [platform-requirements.md](references/platform-requirements.md) for detailed per-platform optimization settings.

---

## Common Export Recipes

### Presentation Export

```
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: totalAnimationTime + 1000 })
save_checkpoint()
// Export as MP4 for embedded video, or GIF for auto-play in slides
```

### Social Media Export

```
set_camera_frame({ x: centerX - 500, y: centerY - 500, width: 1000, aspectRatio: "1:1" })
set_clip_range({ start: 0, end: totalAnimationTime + 500 })
save_checkpoint()
// Export as MP4 for Twitter, GIF for other platforms
```

### Documentation Export

```
set_camera_frame({ x: contentLeft - 50, y: contentTop - 50, width: contentWidth + 100, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: totalAnimationTime + 500 })
save_checkpoint()
// Export as GIF for README, WebM for docs sites, SVG for technical docs
```

---

## Key Rules

- **Always verify before exporting** — run `items_visible_in_camera` and `is_camera_centered` checks
- **Always add padding** — 50px spatial padding around content, 500ms+ temporal padding after last keyframe
- **Match aspect ratio to platform** — 16:9 for video/presentations, 1:1 for social, 9:16 for mobile
- **MP4 is the safe default** — use it when unsure about the destination
- **GIF for universal auto-play** — but accept larger files and lower quality
- **Save checkpoint before export** — `save_checkpoint()` persists the state for the web app to read

---

## Reference Files

| File | Content |
|------|---------|
| [references/format-guide.md](references/format-guide.md) | Detailed format comparison with pros, cons, and encoding details |
| [references/aspect-ratios.md](references/aspect-ratios.md) | Camera dimensions, safe zones, and positioning for each ratio |
| [references/platform-requirements.md](references/platform-requirements.md) | Per-platform export settings, size limits, and optimization tips |
