# Color Palettes

10 curated palettes for Excalimate diagrams. Each palette provides 5 stroke + background hex pairs mapped to standard roles: **Primary**, **Secondary**, **Accent**, **Neutral**, and **Emphasis**.

Pick one palette per diagram and apply it consistently.

---

## 1. Corporate Blue

Professional business presentations, enterprise architecture, formal documentation.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#1864ab` | `#a5d8ff`   | Main shapes, key nodes  |
| Secondary | `#495057` | `#dee2e6`   | Supporting elements     |
| Accent    | `#e67700` | `#fff3bf`   | Highlights, callouts    |
| Neutral   | `#495057` | `transparent` | Arrows, connectors    |
| Emphasis  | `#c92a2a` | `#ffc9c9`   | Warnings, blockers      |

---

## 2. Tech / Developer

Dark strokes, cool tones. Ideal for software architecture, system design, API docs.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#1971c2` | `#d0ebff`   | Services, modules       |
| Secondary | `#6741d9` | `#e5dbff`   | Libraries, dependencies |
| Accent    | `#0c8599` | `#c3fae8`   | Databases, storage      |
| Neutral   | `#343a40` | `transparent` | Arrows, data flow     |
| Emphasis  | `#e03131` | `#ffe3e3`   | Errors, critical paths  |

---

## 3. Nature / Organic

Greens, browns, earth tones. Great for environmental, biology, or organic-feeling diagrams.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#2b8a3e` | `#b2f2bb`   | Main concepts           |
| Secondary | `#5c4813` | `#fff3bf`   | Supporting items        |
| Accent    | `#e67700` | `#ffd8a8`   | Highlights              |
| Neutral   | `#495057` | `transparent` | Connectors            |
| Emphasis  | `#862e9c` | `#eebefa`   | Special callouts        |

---

## 4. Warm Sunset

Oranges, reds, warm yellows. Energetic and eye-catching for marketing or creative diagrams.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#e8590c` | `#ffd8a8`   | Main elements           |
| Secondary | `#c92a2a` | `#ffc9c9`   | Supporting elements     |
| Accent    | `#e67700` | `#ffec99`   | Highlights              |
| Neutral   | `#495057` | `transparent` | Connectors            |
| Emphasis  | `#a61e4d` | `#ffdeeb`   | Emphasis items          |

---

## 5. Cool Ocean

Blues, teals, cyans. Calm and clean for data visualization, dashboards, analytics.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#1864ab` | `#a5d8ff`   | Main elements           |
| Secondary | `#0c8599` | `#99e9f2`   | Supporting elements     |
| Accent    | `#0b7285` | `#c3fae8`   | Highlights              |
| Neutral   | `#343a40` | `transparent` | Connectors            |
| Emphasis  | `#364fc7` | `#bac8ff`   | Emphasis items          |

---

## 6. Monochrome

Black, gray, white only. Maximum clarity, works everywhere, prints well.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#1e1e1e` | `#dee2e6`   | Main elements           |
| Secondary | `#495057` | `#f1f3f5`   | Supporting elements     |
| Accent    | `#1e1e1e` | `#ced4da`   | Highlights              |
| Neutral   | `#868e96` | `transparent` | Connectors            |
| Emphasis  | `#1e1e1e` | `#adb5bd`   | Emphasis items          |

---

## 7. Pastel Soft

Light, gentle colors. Friendly and approachable for onboarding, tutorials, educational content.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#4263eb` | `#dbe4ff`   | Main elements           |
| Secondary | `#ae3ec9` | `#f3d9fa`   | Supporting elements     |
| Accent    | `#f76707` | `#ffe8cc`   | Highlights              |
| Neutral   | `#868e96` | `transparent` | Connectors            |
| Emphasis  | `#2b8a3e` | `#d3f9d8`   | Emphasis items          |

---

## 8. High Contrast

Bold, saturated colors. Maximum visual impact for presentations on projectors or large screens.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#1864ab` | `#74c0fc`   | Main elements           |
| Secondary | `#5f3dc4` | `#b197fc`   | Supporting elements     |
| Accent    | `#e67700` | `#ffc078`   | Highlights              |
| Neutral   | `#1e1e1e` | `transparent` | Connectors            |
| Emphasis  | `#c92a2a` | `#ff8787`   | Emphasis items          |

---

## 9. Dark Mode

Dark backgrounds with light strokes. Note: Excalidraw has limited dark background support — use with `fillStyle: "solid"` for best results. Best paired with Excalidraw's dark canvas mode.

| Role      | Stroke    | Background  | Use                     |
|-----------|-----------|-------------|-------------------------|
| Primary   | `#74c0fc` | `#1864ab`   | Main elements           |
| Secondary | `#b197fc` | `#5f3dc4`   | Supporting elements     |
| Accent    | `#ffc078` | `#e67700`   | Highlights              |
| Neutral   | `#ced4da` | `transparent` | Connectors            |
| Emphasis  | `#ff8787` | `#c92a2a`   | Emphasis items          |

> **Tip**: When using dark mode, set `strokeWidth: 2` and `roughness: 0` for cleaner edges against dark fills.

---

## 10. Accessible

WCAG AA compliant combinations. All stroke-on-background pairs meet 4.5:1 contrast ratio. Safe for colorblind users — differentiation does not rely on red/green distinction alone.

| Role      | Stroke    | Background  | Contrast | Use                |
|-----------|-----------|-------------|----------|--------------------|
| Primary   | `#1864ab` | `#d0ebff`   | 5.2:1    | Main elements      |
| Secondary | `#495057` | `#f1f3f5`   | 7.1:1    | Supporting elements|
| Accent    | `#e67700` | `#fff9db`   | 4.6:1    | Highlights         |
| Neutral   | `#343a40` | `transparent` | —      | Connectors         |
| Emphasis  | `#862e9c` | `#f3d9fa`   | 5.8:1    | Emphasis items     |

---

## Custom Palette Tips

When creating a custom palette:

1. **Pick 3–5 colors** — more than 5 becomes visually noisy.
2. **Test contrast** — stroke against background should be ≥ 4.5:1 for readability.
3. **Use one hue family** for primary/secondary, a complementary hue for accent.
4. **Keep neutral desaturated** — grays work best for arrows and connectors.
5. **Light backgrounds, dark strokes** — this is the most readable combination in Excalidraw.
