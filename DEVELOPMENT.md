# May I Have a Room? — Development Notes

Understood as: grow the published browser game into a stable DAY 1 → DAY 30 hotel survival loop without replacing working systems or reducing the story, room strategy, resource management, and risk decisions to a UI-only demo.

## Current playable contract

- DAY 0 illustrated prologue and title reveal
- DAY 1 front-desk guest screening with questions, item inspection, negotiation, hold, check-in, and refusal
- Explicit choice among 30 rooms, with movement and manual or stay-expiry checkout
- Data-driven grid Aura calculation; Eleanor's Medical Care Zone affects only `NORMAL_DISEASE`
- Nightly food, water, and generator-fuel settlement based on actual occupancy
- Remaining-stay countdown, automatic checkout, Aura removal, and HOTEL LOG entries
- Four-stage guest stories that advance from arrival through resolution and persist in the hotel log
- Relationship event strength based on room distance: adjacent ×2, same floor ×1.5, otherwise ×1, recorded when conflict stages fire
- Eleanor + Ruth `MEDICAL WARD` Aura synergy heals 10 Health nightly in overlapping treatment rooms
- Versioned local save restoration that recomputes derived room effects from guest source state
- A guarded DAY boundary that reaches a terminal DAY 30 screen instead of resolving forever

## Next system priorities

- Turn the five featured event-chain stages into authored choice scenes with explicit conditions and consequences
- Apply relationship weights to conditional guest events and surface relationship changes in the journal
- Add action points and meaningful daytime hotel actions
- Add conditional night events, shortage consequences, monster threat, and reputation
- Expand HOTEL LOG into an accessible journal and build the full DAY 30 ending evaluation

## Main NPC catalog

Twenty story NPCs share one versioned data contract for arrival conditions, offers, room Aura, relationships, hidden-trait discovery, four-stage story progression, survival state, and ending state. The UI and save migration consume this catalog generically; adding a visitor must not require another character-specific branch in the core loop.
