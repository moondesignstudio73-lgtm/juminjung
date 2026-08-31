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
- All twenty catalog NPCs have authored conflict and resolution choices with persistent consequences
- Resolution choices persist medical, father-secret, family-route, military-resistance, and THE DOOR route flags for ending evaluation and future scenes
- Lily's decoded documents and Dr. Vale's completed research now provide the two investigation flags required by THE TRUTH
- The morning DESTINY journal lists every visible route as IN PROGRESS, AVAILABLE, or COMPLETED while preserving hidden routes as UNKNOWN
- Room-distance-weighted relationships now trigger one-time night choices for Eleanor/Ruth, Lily/Vale, and Owen/Hayes, changing both NPC state and relationship values
- Structured relationship deltas from story and night choices persist in the hotel log and appear in the morning RELATIONSHIP JOURNAL
- Reputation and prior-event flags now produce authored front-desk reactions, modifying visitor Trust, Risk, dialogue, and check-in offers
- Refugee shelter/denial, generator blackout, medical cooperation, investigation, and military resistance create later visitor follow-up dialogue
- Four facilities now support three upgrade levels with escalating costs, visible next-stage previews, daily production, upkeep, and shortage shutdown logs
- The trade network creates a renewable parts/fuel route; a deterministic 30-day regression covers four continuously occupied rooms at maximum infrastructure
- HOTEL JOURNAL exposes the complete reverse-chronological record with check-in, checkout, resource, and event filters plus relationship details
- Every ending route now has a distinct three-scene final event and epilogue; progress saves mid-scene and completion returns to open-ended operation
- All 20 main NPCs now appear as large authored half-body 2D sprites at the front desk and in their story scenes
- The portrait catalog selects authored assets per expression with a neutral fallback; Eleanor and Ruth have afraid and injured variants, Mia and Claire have afraid and happy variants, Walter and Daniel have suspicious and happy variants, Mr. White and Vale have suspicious variants, Owen and Hayes have angry variants, Lily has a happy variant, and save restoration refreshes variant paths from the catalog
- Relationship night events can stage two character portraits with event-authored expression overrides; Owen and Hayes face off angrily during their military standoff, while Lily's relief contrasts with Vale's suspicion during their investigation breakthrough
- NPC story events can author a scene-specific expression override; Mia and Claire appear afraid during their family-related conflicts and quietly hopeful during their resolutions, Walter shifts from guarded suspicion over the father's lie to restrained relief when leaving the key, and Daniel moves from defensiveness over the torn photograph to relief as he puts Mia's choice before his claim
- Guest visual state is derived from Health, Stress, infection, and arrival status, exposing wet, exhausted, bandaged, bloodied, and infection-suspected presentation layers

## Next system priorities

- Expand authored expression and condition variants from the 11 completed characters to the remaining nine-character portrait catalog

## Main NPC catalog

Twenty story NPCs share one versioned data contract for arrival conditions, offers, room Aura, relationships, hidden-trait discovery, four-stage story progression, survival state, and ending state. The UI and save migration consume this catalog generically; adding a visitor must not require another character-specific branch in the core loop.
