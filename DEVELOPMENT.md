# May I Have a Room? — Development Notes

Understood as: grow the published browser game into an open-duration hotel survival loop where story, management, faction, and world-state conditions unlock player-chosen final events.

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
- Unbounded DAY progression; DAY records survival time but never triggers an ending by itself
- Seven data-driven ending routes that unlock optional final events without stopping normal management
- A soft-pressure World State derived from time, scarcity, threat, and hotel stability
- Two daily action points for repair, community, patrol, and trade decisions
- Four buildable facilities with resource costs, passive production, stat changes, and faction reputation effects
- Save v8 restoration for facilities, reputations, daily actions, night choices, and pending NPC story scenes
- Conditional night events driven by World State, shortages, Monster Threat, Security, and resources
- Two-choice night outcomes that alter resources, hotel stats, faction reputation, flags, and guest condition
- Seven authored NPC conflict and resolution chains for Eleanor, Walter, Mia, Owen, Lily, Dr. Vale, and Mr. White with persistent consequences
- Resolution choices persist medical, father-secret, family-route, military-resistance, and THE DOOR route flags for ending evaluation and future scenes
- Lily's decoded documents and Dr. Vale's completed research now provide the two investigation flags required by THE TRUTH
- The morning DESTINY journal lists every visible route as IN PROGRESS, AVAILABLE, or COMPLETED while preserving hidden routes as UNKNOWN
- Room-distance-weighted relationships now trigger one-time night choices for Eleanor/Ruth, Lily/Vale, and Owen/Hayes, changing both NPC state and relationship values
- Structured relationship deltas from story and night choices persist in the hotel log and appear in the morning RELATIONSHIP JOURNAL

## Next system priorities

- Add reputation-driven visitor reactions and authored follow-up scenes for night-event consequences
- Add facility upgrades and balance the resource economy across long campaigns
- Expand HOTEL LOG into an accessible journal and author each unlocked final event and epilogue

## Main NPC catalog

Twenty story NPCs share one versioned data contract for arrival conditions, offers, room Aura, relationships, hidden-trait discovery, four-stage story progression, survival state, and ending state. The UI and save migration consume this catalog generically; adding a visitor must not require another character-specific branch in the core loop.
