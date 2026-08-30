# May I Have a Room? — Development Notes

Understood as: grow the published browser game into a stable DAY 1 → DAY 30 hotel survival loop without replacing working systems or reducing the story, room strategy, resource management, and risk decisions to a UI-only demo.

## Current playable contract

- DAY 0 illustrated prologue and title reveal
- DAY 1 front-desk guest screening with questions, item inspection, negotiation, hold, check-in, and refusal
- Explicit choice among 30 rooms, with movement and manual or stay-expiry checkout
- Data-driven grid Aura calculation; Eleanor's Medical Care Zone affects only `NORMAL_DISEASE`
- Nightly food, water, and generator-fuel settlement based on actual occupancy
- Remaining-stay countdown, automatic checkout, Aura removal, and HOTEL LOG entries
- Versioned local save restoration that recomputes derived room effects from guest source state
- A guarded DAY boundary that reaches a terminal DAY 30 screen instead of resolving forever

## Next system priorities

- Replace the repeated Eleanor encounter with a data-driven visitor schedule and multiple NPC states
- Add action points and meaningful daytime hotel actions
- Add conditional night events, shortage consequences, monster threat, and reputation
- Expand HOTEL LOG into an accessible journal and build the full DAY 30 ending evaluation
