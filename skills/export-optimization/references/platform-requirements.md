# Platform Export Requirements

Optimal export settings for each target platform. Follow these recommendations for the best results.

---

## Slack

| Setting | Recommendation |
|---------|---------------|
| **Format** | GIF |
| **Aspect Ratio** | 1:1 or 16:9 |
| **Max Duration** | 15 seconds (under 10s preferred) |
| **Max File Size** | 10MB (free), 25MB (paid) |
| **Resolution** | 800px wide max |

**Setup:**
```
set_camera_frame({ x: 0, y: 0, width: 800, aspectRatio: "1:1" })
set_clip_range({ start: 0, end: 10000 })
save_checkpoint()
// Export as GIF
```

**Tips:**
- GIF auto-plays inline in Slack — no click needed
- Keep animations simple to reduce file size
- Shorter is better — Slack users scan quickly
- Use 1:1 for maximum inline visibility
- Consider reducing diagram complexity for smaller GIF sizes

---

## Twitter / X

| Setting | Recommendation |
|---------|---------------|
| **Format** | MP4 |
| **Aspect Ratio** | 16:9 |
| **Max Duration** | 30 seconds (under 15s for engagement) |
| **Max File Size** | 512MB |
| **Resolution** | 1920×1080 preferred |

**Setup:**
```
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: 15000 })
save_checkpoint()
// Export as MP4
```

**Tips:**
- MP4 is required — Twitter converts GIFs to MP4 anyway (with quality loss)
- First frame matters — it becomes the video thumbnail
- Keep text large and readable on mobile screens
- Front-load the interesting content — most viewers drop off after 5s
- 16:9 fills the full player width on desktop

---

## YouTube

| Setting | Recommendation |
|---------|---------------|
| **Format** | MP4 |
| **Aspect Ratio** | 16:9 |
| **Max Duration** | No practical limit |
| **Resolution** | 1920×1080 (1080p) or 3840×2160 (4K) |

**Setup:**
```
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: totalAnimationTime + 1000 })
save_checkpoint()
// Export as MP4 at highest quality
```

**Tips:**
- Always use 16:9 — other ratios get black bars
- Higher quality settings are worth the larger file size
- Consider longer hold times (1500–2000ms) between steps for educational content
- Add a 2s hold at the end for the final state
- YouTube shorts use 9:16 if targeting mobile

---

## Google Slides

| Setting | Recommendation |
|---------|---------------|
| **Format** | GIF (auto-plays) or MP4 (click to play) |
| **Aspect Ratio** | 16:9 (standard) or 4:3 (classic) |
| **Max Duration** | Any, but shorter is better for presentations |
| **Max File Size** | 100MB per file |

**Setup:**
```
// Match your slide format — most modern decks are 16:9
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: totalAnimationTime + 500 })
save_checkpoint()
// Export as GIF for auto-play, MP4 for click-to-play
```

**Tips:**
- GIFs auto-loop in Slides — great for ambient diagrams
- MP4 gives a play button — better for step-by-step reveals
- Match the slide aspect ratio exactly to avoid borders
- Keep GIF file sizes reasonable (under 10MB) for smooth presentations
- Test on the actual presentation screen resolution

---

## README / Documentation (GitHub, GitLab, etc.)

| Setting | Recommendation |
|---------|---------------|
| **Format** | GIF (GitHub) or WebM (docs sites) |
| **Aspect Ratio** | Any — match content shape |
| **Max Duration** | Under 10 seconds |
| **Max File Size** | Under 5MB for README, up to 25MB for docs |
| **Resolution** | 600–800px wide |

**Setup:**
```
set_camera_frame({ x: 0, y: 0, width: 1000, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: 8000 })
save_checkpoint()
// Export as GIF for README, WebM for hosted docs
```

**Tips:**
- GitHub renders GIFs inline in markdown — `![demo](demo.gif)`
- Keep file sizes small — large GIFs slow down page loads
- Use smaller camera width for smaller output dimensions
- Animated SVG works for simple diagrams but GitHub strips animation
- Consider a static screenshot with a link to the full animation for very large diagrams

---

## Email

| Setting | Recommendation |
|---------|---------------|
| **Format** | GIF |
| **Aspect Ratio** | Any — 16:9 or 4:3 work well |
| **Max Duration** | Under 5 seconds |
| **Max File Size** | Under 3MB |
| **Resolution** | 600px wide max |

**Setup:**
```
set_camera_frame({ x: 0, y: 0, width: 600, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: 4000 })
save_checkpoint()
// Export as GIF
```

**Tips:**
- Many email clients block video — GIF is the only reliable animated format
- Some clients block GIFs too — first frame should convey the message
- Keep file size very small — large attachments get clipped or blocked
- Simple, short animations only
- 600px wide matches common email content width

---

## Figma / Design Tools

| Setting | Recommendation |
|---------|---------------|
| **Format** | SVG (Animated) |
| **Aspect Ratio** | Any — match your design frame |
| **Max Duration** | N/A for static, any for animated |

**Setup:**
```
set_camera_frame({ x: 0, y: 0, width: contentWidth + 100, aspectRatio: "16:9" })
save_checkpoint()
// Export as SVG
```

**Tips:**
- SVG preserves vector paths — elements remain editable in Figma
- Animated SVG can be used in prototypes
- Remove unnecessary elements before export for cleaner SVG output
- Some design tools strip SVG animations on import — test first
- For static design handoff, any frame from the animation works

---

## Website Embed

| Setting | Recommendation |
|---------|---------------|
| **Format** | WebM (primary), MP4 (fallback) |
| **Aspect Ratio** | 16:9 for hero sections, 4:3 for inline |
| **Max Duration** | Any |
| **Resolution** | Match container width |

**Setup:**
```
set_camera_frame({ x: 0, y: 0, width: 1600, aspectRatio: "16:9" })
set_clip_range({ start: 0, end: totalAnimationTime + 500 })
save_checkpoint()
// Export as WebM, also export MP4 as fallback
```

**Tips:**
- Use HTML5 `<video>` with WebM source and MP4 fallback
- Add `autoplay muted loop playsinline` attributes for auto-play
- WebM saves bandwidth — significantly smaller than MP4
- Consider lazy-loading for below-the-fold animations
- Transparent WebM works well for overlaying on colored backgrounds

**Embed pattern:**
```html
<video autoplay muted loop playsinline>
  <source src="animation.webm" type="video/webm">
  <source src="animation.mp4" type="video/mp4">
</video>
```

---

## Platform Comparison Matrix

| Platform | Format | Ratio | Max Duration | Max Size | Auto-play |
|----------|--------|-------|-------------|----------|-----------|
| Slack | GIF | 1:1 / 16:9 | 15s | 10MB | ✅ |
| Twitter/X | MP4 | 16:9 | 30s | 512MB | ✅ (muted) |
| YouTube | MP4 | 16:9 | Unlimited | — | ❌ |
| Google Slides | GIF / MP4 | 16:9 / 4:3 | Any | 100MB | GIF only |
| README/Docs | GIF | Any | 10s | 5MB | ✅ |
| Email | GIF | Any | 5s | 3MB | ✅ (most clients) |
| Figma | SVG | Any | N/A | — | — |
| Website | WebM / MP4 | Any | Any | — | ✅ (muted) |
