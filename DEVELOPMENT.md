# May I Have a Room? — Development Notes

Understood as: build and publish a polished browser-playable vertical slice covering the complete DAY 0 → DAY 2 consequence loop, rather than attempting the full 30-day campaign in one pass.

## Vertical slice contract

- DAY 0 illustrated prologue and title reveal
- DAY 1 front-desk guest screening with questions, item inspection, negotiation, hold, check-in, and refusal
- Room/resource impact and one nighttime consequence event
- DAY 2 morning report that reflects the player’s decision
- Restartable, responsive, keyboard-accessible experience with local progress persistence

The full 30-day campaign, 20 complete NPC arcs, dollhouse management screen, and all facilities remain later milestones after this slice proves the central choice loop.

## Room strategy expansion contract

Understood as: preserve the playable DAY 0 → DAY 2 vertical slice while replacing the fixed 203 assignment with a 30-room hotel model, a reusable grid-distance Aura system, an explicit room assignment/management flow, and versioned save restoration. Eleanor's Medical Care Zone is the first data-driven Aura; it prevents only `NORMAL_DISEASE` in her room and adjacent grid rooms. Room movement and checkout must recompute derived effects from guest source data rather than persisting stale Aura results.
