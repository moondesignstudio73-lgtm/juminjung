# Front Desk Hub refactor verification

Date: 2026-09-04. Local production preview, 1366 × 768.

## Stage 1 — phase and save compatibility

- Removed `assignment` and `management` from `GamePhase` and their full-screen render branches.
- Room assignment is transient UI state; hotel tools are drawers within the desk root.
- Older saves in either removed phase restore to `desk`, preserving visitors, queue, rooms and resources. Pending assignment does not silently check a visitor in.
- Removed the unused legacy management component and duplicate lobby rendering.
- Improvement: operating the hotel no longer requires changing the game phase.
- Remaining concern: restored unfinished assignments must be opened again; they are intentionally not serialized.

## Stage 2 — integration and browser iteration

- Existing guest, room, ledger, resource, staff, event, investigation and exploration controls share the desk tool container and retain unlock gates.
- The original lobby remains mounted during visitor interactions and management. Room selection is a modal over that lobby.
- Guest room moves close the drawer before opening the room map, returning directly to the front after confirmation.
- Occupied rooms link to their guest details. Ledger displays quantities, basic expected consumption and estimated days remaining; estimates exclude events and ability effects.
- Fixed a small 768px-height document overflow found during browser inspection.
- Browser-tested DAY 1: new game/prologue → check-in → select room 301 → confirm → guest details/dialogue → move to 302, then 303 → room details → ledger → close → remaining visitor decisions → close business.
- Across ordinary operations, `data-game-phase` remained `desk` and the lobby's per-mount `data-front-desk-instance` stayed identical. Confirmed no modal remained after moving a guest. The backdrop was visually checked behind both allocation and ledger overlays.
- Improvement: menus are reachable during visitor reception, not only after the queue ends.

## Stage 3 — completion and regression checks

- Central no-visitor guidance points to the day's pending story event or operating objective; DAY 1 completed reception points to review and closing.
- Browser-tested the allowed night/story/result transitions and DAY 2 continuation.
- DAY 2 slot 1 save/load and Escape open/close succeeded. Three manual slots remain available; future systems remain gated.
- Final observed viewport and document dimensions: 1366 × 768, without document overflow. Browser warning/error log: empty.
- TypeScript check passed. All 501 tests passed, including legacy phase migration and room-assignment phase stability. Production Pages build passed.
- Build still warns about a JavaScript chunk above 500 kB. Full lint is not clean: effect/compiler and accessibility rules require a separate cleanup; do not interpret the successful build as lint success.

## Remaining UX and verification boundaries

- The existing DAY 2 report still shows an early-game external scouting recommendation. Report information prioritization remains a follow-up; this change targets the front-desk architecture.
- Higher-day staff, power, investigation and exploration controls were retained and structurally integrated, but their full day-by-day browser playthrough was not performed in this pass.
- No new gameplay system, currency or resource was added. No dependency install or TLS/security bypass was used.
- This report describes local changes and local browser verification, not a production deployment.
