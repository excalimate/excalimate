# Magic, Sequence, and Studio

## Choose a workspace

| Workspace | Best for                                  | Default behavior                       |
| --------- | ----------------------------------------- | -------------------------------------- |
| Magic     | Fast intent-based animation and templates | New and empty projects                 |
| Sequence  | Reviewing and reordering managed actions  | Available from Magic/Studio disclosure |
| Studio    | Direct tracks and keyframes               | Existing animated legacy projects      |

Magic is the compact mobile-first surface. Sequence is optimized for tablet and
desktop review. Studio exposes the full desktop timeline; its disclosure
explains the extra complexity before switching. Workspace choice is saved in
the V2 project and can be overridden with the rollout query parameters in
[the V2 release guide](v2-release.md).

## Managed actions

Magic and Sequence create managed actions. Editing action parameters regenerates
only content owned by that action. Editing a generated keyframe directly marks
the action customized. Detaching preserves the current tracks but stops future
action regeneration. This same managed/customized/detached state is used by the
editor, MCP, imports, and live hydration.

## Templates

The gallery ships eight validated V2 templates. Posters load first; a
PlayerPackage preview is fetched and integrity-checked only when requested.
Choosing a template creates a fresh project ID and timestamps, so the checked-in
template is never edited in place.

## Create transitions

Use **Capture state** to save your starting point. Make changes, capture the next
state, then choose **Create transition**. The control stays unavailable until two
states exist and its adjacent guidance explains the next step.

Presence is independent of opacity: an element at zero opacity is still present.
Removed elements fade through retained tombstones; returning elements fade back
in. Group transforms and bound labels follow their containers. Camera animation
is opt-in.

Managed transition recipes are the source of truth for transforms. Editing a
generated track uses the same customized/detached rules as other actions.

| Output                     | Transition behavior                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Editor/player/MP4/WebM/GIF | Shared frame sampler, sparse states, tombstones, groups, labels, camera               |
| Animated SVG               | CSS-keyframe or SMIL profile plus a static/reduced-motion poster                      |
| Lottie/dotLottie           | Vector shapes remain vector; image, freehand, and frame elements become raster layers |

Lottie keeps transform, opacity, group, and camera animation on raster fallback
layers. Draw progress cannot be represented on those raster layers, so they
remain fully drawn and export preflight announces the fallback. It is never
silently omitted.

## Sharing

Share creates an encrypted V2 envelope containing the project and PlayerPackage.
The dialog shows expiry and supports revoke while the in-memory delete
capability is available. The public URL contains the share ID and encryption key
in its fragment; it never contains the delete capability. Keep the revoke action
open until it succeeds if immediate deletion is required.
