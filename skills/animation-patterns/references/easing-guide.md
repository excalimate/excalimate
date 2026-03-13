# Easing Functions Guide

Complete reference for all 18 easing functions supported by the Excalimate MCP server. Each easing controls how a value interpolates between keyframes over time.

---

## Linear

### `linear`
Constant speed from start to finish. No acceleration or deceleration — perfectly uniform motion.

**Motion:** Moves at exactly the same rate throughout the entire duration.

**Use for:** Progress bars, countdowns, loading indicators, or any animation where mechanical precision is desired. Rarely used for element reveals since it feels robotic.

---

## Basic Ease Family

### `easeIn`
Starts slow and accelerates toward the end. The element gathers speed as it moves.

**Motion:** Begins gently, then picks up pace — like a car pulling away from a stop sign.

**Use for:** Exit animations where an element is leaving the canvas. Also good for elements being "launched" toward something.

### `easeOut`
Starts fast and decelerates to a gentle stop. The default choice for most reveals.

**Motion:** Arrives quickly then settles softly — like a ball rolling to a stop on flat ground.

**Use for:** Fade-in reveals, opacity transitions, any element arriving on screen. This is the recommended default for most animations.

### `easeInOut`
Slow start, fast middle, slow end. Symmetrical acceleration and deceleration.

**Motion:** Eases in and eases out — like a pendulum swinging through the middle.

**Use for:** Arrow draw-on strokes, transitions between states, any animation where both the start and end should feel smooth. Good for `drawProgress`.

---

## Quadratic Family

Moderate acceleration curves — slightly more pronounced than basic ease.

### `easeInQuad`
Quadratic ease-in. Slow start with moderate acceleration.

**Motion:** Similar to `easeIn` but with a mathematically precise quadratic curve. Slightly more gradual.

**Use for:** Subtle exits, departures that should feel gentle rather than abrupt.

### `easeOutQuad`
Quadratic ease-out. Fast start with moderate deceleration.

**Motion:** Arrives with moderate energy and settles gently. Between `linear` and `easeOutCubic` in strength.

**Use for:** Reveals where `easeOut` feels too subtle but `easeOutCubic` feels too strong.

### `easeInOutQuad`
Quadratic ease-in-out. Moderate symmetrical curve.

**Motion:** Gentle version of `easeInOut` — less dramatic speed change in the middle.

**Use for:** Subtle transitions, camera movements over short distances.

---

## Cubic Family

Stronger acceleration curves — the workhorse for motion animations.

### `easeInCubic`
Cubic ease-in. Very slow start with strong acceleration.

**Motion:** Starts barely moving, then rapidly picks up speed — like a dropped object accelerating under gravity.

**Use for:** Dramatic exits, elements flying away with increasing speed.

### `easeOutCubic`
Cubic ease-out. Fast start with strong deceleration. **The best easing for slide-in animations.**

**Motion:** Arrives with energy and decelerates firmly — like a hockey puck hitting friction. Feels snappy and decisive.

**Use for:** Slide-in movements (`translateX`, `translateY`). The strong deceleration makes the element feel like it has weight and momentum.

### `easeInOutCubic`
Cubic ease-in-out. Strong symmetrical curve. **The best easing for camera movements.**

**Motion:** Clearly slow at both ends with fast movement through the middle — like an elevator starting, cruising, and stopping.

**Use for:** Camera pans and zooms. The smooth start/end prevents jarring viewport jumps. Also good for long-duration transitions.

---

## Back Family

Overshoot effects — the value briefly exceeds the target before settling. The overshoot parameter is s=1.70158.

### `easeInBack`
Pulls back slightly before moving forward. Values briefly go below the starting value.

**Motion:** Like pulling a slingshot back before releasing — element moves slightly backward first, then shoots forward.

**Use for:** Elements that need a wind-up effect before appearing. Rarely used alone; more common in combination with other properties.

### `easeOutBack`
Overshoots the target then settles back. **The best easing for pop-in scale effects.**

**Motion:** Arrives past the target, then bounces back to settle — like a door swinging open past its resting point. Values briefly exceed 1.0 before returning.

**Use for:** Pop-in animations with `scaleX`/`scaleY`. The overshoot creates a satisfying bounce that makes elements feel alive. Also great for attention-grabbing reveals.

### `easeInOutBack`
Pulls back at start, overshoots at end.

**Motion:** Combines the wind-up of easeInBack with the overshoot of easeOutBack. Dramatic and eye-catching.

**Use for:** Emphasis pulses (scale 1→1.1→1), attention effects, or any animation that needs to feel dynamic at both ends.

---

## Elastic Family

Spring oscillation effects — the value oscillates around the target like a spring.

### `easeInElastic`
Oscillates at the start before moving to target.

**Motion:** Wobbles in place before launching toward the final value — like a spring being compressed and released.

**Use for:** Very rarely used. Can work for dramatic exit animations where an element vibrates before departing.

### `easeOutElastic`
Oscillates around the target value before settling. Creates a spring/wobble effect.

**Motion:** Arrives at the target then bounces past it several times with decreasing amplitude — like a spring doorstop being flicked.

**Use for:** Playful, attention-grabbing reveals. Use sparingly — one or two elements per animation at most. Works well for hero elements, logos, or call-to-action shapes. Apply to `scaleX`/`scaleY` or `translateX`/`translateY`.

---

## Bounce Family

Gravity-inspired bounce effects — the value bounces at the boundary like a dropped ball.

### `easeInBounce`
Bounces at the start before moving to target.

**Motion:** Multiple small bounces that increase in height, then launches to target — like a ball bouncing in reverse.

**Use for:** Rarely used alone. Can create an interesting "charging up" effect before a reveal.

### `easeOutBounce`
Bounces at the target value before settling. Creates a gravity drop effect.

**Motion:** Arrives at target, bounces up, falls back, bounces smaller, settles — like a ball dropped on a hard floor.

**Use for:** Elements dropping from above (`translateY` from negative to 0). Creates a physical, weighty feeling. Good for icons, badges, or elements that should feel like they have mass.

---

## Step

### `step`
Instant jump with no interpolation. The value changes from start to end with no in-between frames.

**Motion:** No animation at all — the value snaps instantly from one state to another at the keyframe time.

**Use for:** Discrete state changes — toggling visibility, instantly changing position, or creating frame-by-frame effects. Use when you need an element to appear at an exact time with no transition.

---

## Choosing the Right Easing

| Scenario | Best Easing | Runner-up |
|----------|------------|-----------|
| General reveal | `easeOut` | `easeOutQuad` |
| Slide entrance | `easeOutCubic` | `easeOutQuad` |
| Pop/scale entrance | `easeOutBack` | `easeOutElastic` |
| Arrow stroke | `easeInOut` | `easeInOutCubic` |
| Camera movement | `easeInOutCubic` | `easeInOutQuad` |
| Exit/departure | `easeIn` | `easeInCubic` |
| Playful/fun | `easeOutElastic` | `easeOutBounce` |
| Dropping in | `easeOutBounce` | `easeOutBack` |
| Emphasis pulse | `easeInOutBack` | `easeInOut` |
| Instant change | `step` | — |
