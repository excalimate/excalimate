# Export Format Guide

Detailed comparison of all export formats available in the Excalimate web app.

---

## MP4 (H.264)

The most widely supported video format. Best choice for general-purpose sharing.

**Pros:**
- Universal playback — works on every device, browser, and OS
- Excellent compression — good quality at small file sizes
- Crisp rendering — full color depth, smooth gradients
- Hardware-accelerated decoding on most devices
- Accepted by all video platforms (YouTube, Twitter, Slack, etc.)

**Cons:**
- No transparency support — background is always opaque (white by default)
- Lossy compression — very slight quality reduction (usually imperceptible)
- Not editable after export

**Best for:** Presentations, video platforms, social media, general sharing

**Typical file sizes:**
- 5s animation, 1080p: ~500KB–2MB
- 15s animation, 1080p: ~1.5MB–5MB
- 30s animation, 1080p: ~3MB–10MB

---

## WebM (VP9)

Modern web-native video format with excellent compression.

**Pros:**
- Smaller file sizes than MP4 at equivalent quality
- Transparency support — can have transparent background
- Web-native — built for HTML5 `<video>` embedding
- Open format, royalty-free
- Good streaming performance

**Cons:**
- Less universal than MP4 — Safari support is limited on older versions
- Some platforms don't accept WebM uploads (e.g., Twitter)
- Slower encoding than MP4

**Best for:** Web embedding, documentation sites, transparent overlays

**Typical file sizes:**
- 5s animation, 1080p: ~300KB–1.5MB
- 15s animation, 1080p: ~1MB–4MB
- 30s animation, 1080p: ~2MB–8MB

---

## GIF

The universal animated image format. Auto-plays everywhere but with significant quality tradeoffs.

**Pros:**
- Auto-plays in virtually every context (email, Slack, GitHub, docs)
- No user interaction needed — plays on load
- Universal support — every browser, every platform
- Treated as an image, not a video — simpler embedding
- Loops by default

**Cons:**
- Limited to 256 colors per frame — causes color banding and dithering
- Very large file sizes — a 10s GIF can be 10–50MB
- No audio support
- Lower frame rate (typically 10–20fps vs 30–60fps for video)
- Transparency is binary (on/off per pixel, no semi-transparency)

**Best for:** Slack messages, GitHub README, email, anywhere auto-play is important

**Typical file sizes:**
- 5s animation, 800px wide: ~2MB–8MB
- 10s animation, 800px wide: ~5MB–20MB
- 15s animation, 800px wide: ~10MB–40MB

**Optimization tips:**
- Keep duration short (under 10 seconds)
- Use smaller dimensions (800px wide max for docs)
- Fewer colors = smaller files — Excalidraw's limited palette helps here
- Simple animations compress better than complex ones

---

## Animated SVG

Vector-based animated output. Preserves full scalability and crispness at any size.

**Pros:**
- Vector format — infinitely scalable, always crisp
- Very small file sizes for diagram-style content
- Editable after export — can be modified in code or design tools
- Perfect for print and high-DPI displays
- Accessible — text remains selectable/searchable

**Cons:**
- Complex animations may not render consistently across all browsers
- Some platforms strip SVG animations (e.g., GitHub README)
- Limited support in presentation tools
- Not suitable for raster effects or photographic content

**Best for:** Technical documentation, print, design tool imports, web embedding with interaction

**Typical file sizes:**
- Simple diagram: ~10KB–50KB
- Complex diagram with animations: ~50KB–200KB

---

## Format Comparison Matrix

| Feature | MP4 | WebM | GIF | SVG |
|---------|-----|------|-----|-----|
| Universal playback | ✅ | ⚠️ | ✅ | ⚠️ |
| File size | Small | Smallest | Large | Tiny |
| Quality | High | High | Low | Perfect |
| Transparency | ❌ | ✅ | ⚠️ (binary) | ✅ |
| Auto-play everywhere | ❌ | ❌ | ✅ | ⚠️ |
| Scalable | ❌ | ❌ | ❌ | ✅ |
| Audio support | ✅ | ✅ | ❌ | ❌ |
| Max colors | 16M+ | 16M+ | 256 | Unlimited |
| Editable post-export | ❌ | ❌ | ❌ | ✅ |

---

## Recommendations by Use Case

| Use Case | Primary | Fallback |
|----------|---------|----------|
| Conference presentation | MP4 | GIF |
| Team Slack message | GIF | MP4 |
| GitHub README | GIF | SVG |
| Documentation site | WebM | GIF |
| Blog post | WebM | MP4 |
| Email newsletter | GIF | — |
| YouTube/video | MP4 | — |
| Technical specification | SVG | — |
| Social media post | MP4 | GIF |
| Design handoff | SVG | — |
| Print material | SVG | — |
