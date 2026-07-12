# V2 accessibility validation

The target is WCAG 2.2 AA across Magic, templates, Smart Transition mapping,
Sequence, Studio disclosure, exports, share/revoke, and player controls.

Automated component tests cover dialog names, keyboard activation, focus
restoration, status/error announcements, player labels, and reduced-motion
output. CSS and component layouts must remain usable at 200% zoom without
two-dimensional page scrolling. Pointer controls require at least a 24 by
24 CSS-pixel target, with 44 by 44 preferred for primary touch controls.

Release checks:

1. Complete every operation with keyboard only, including template selection,
   mapping, action reorder, workspace disclosure, export cancel, share copy,
   revoke, player seek, and close.
2. Confirm focus enters dialogs, remains trapped, returns to the trigger, and
   never lands behind an overlay.
3. Confirm errors and asynchronous progress are announced once without stealing
   focus.
4. Enable reduced motion and verify Magic/player previews and animated SVG use
   the static poster while controls remain functional.
5. Test 200% browser zoom and narrow/mobile widths for reflow, text clipping,
   horizontal overflow, and touch-target collisions.

## Manual assistive-technology matrix

These manual runs have **not** been performed on this integration branch. They
are required before promotion beyond release candidate.

| Screen reader | Browser/platform                      | Required surfaces                              |
| ------------- | ------------------------------------- | ---------------------------------------------- |
| NVDA          | Current Chrome and Firefox on Windows | Full editor workflow, exports, sharing, player |
| VoiceOver     | Current Safari on macOS               | Dialogs, workspaces, mapping, player           |
| VoiceOver     | Current Safari on iOS                 | Magic, templates, share result, player         |
| TalkBack      | Current Chrome on Android             | Magic, templates, player controls              |

Record product/browser/AT versions, date, keyboard or gesture path, expected and
actual announcement, focus location, and a defect link. Do not convert an
automated assertion into a claim of manual AT coverage.
