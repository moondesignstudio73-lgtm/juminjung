# May I Have a Room? — Development Notes

Understood as: grow the published browser game into an open-duration hotel survival loop where story, management, faction, and world-state conditions unlock player-chosen final events.

Aura presentation is understood as data-owned: every Aura defines its own short label, category, and icon, and room UI must never infer presentation from an NPC role.

## Current playable contract

- DAY 0 illustrated prologue with a dedicated father-departure scene, timed first knock, and title reveal
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
- Save v9 restoration for facilities, reputations, daily actions, night choices, pending NPC story scenes, and one-time cutscene progress
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
- Save restoration now repairs duplicate room claims and guest/room mismatches into one authoritative room per active guest before Aura recalculation
- Four facilities now support three upgrade levels with escalating costs, visible next-stage previews, daily production, upkeep, and shortage shutdown logs
- The trade network creates a renewable parts/fuel route; a deterministic 30-day regression covers four continuously occupied rooms at maximum infrastructure
- HOTEL JOURNAL exposes the complete reverse-chronological record with check-in, checkout, resource, and event filters plus relationship details
- Every ending route now has a distinct three-scene final event and epilogue; progress saves mid-scene and completion returns to open-ended operation
- All seven ending routes own distinct full-screen artwork and accessible scene descriptions: SAFE HAVEN, THE TRUTH, FORTRESS, HOME, KING OF THE RUINS, MILITARY OCCUPATION, and the hidden THE DOOR route
- Aura placement previews stay strongly visible, while the management grid starts clean and exposes the selected guest's subdued range through an accessible Aura 보기/숨기기 toggle
- The management panel can select every current resident, keeping room moves, checkout, and Aura inspection tied to the chosen guest
- All 20 main NPCs now appear as large authored half-body 2D sprites at the front desk and in their story scenes
- The portrait catalog selects authored assets per expression with a neutral fallback; all 20 main NPCs have at least one authored variant, including afraid and happy variants for Thomas, and save restoration refreshes variant paths from the catalog
- Relationship night events can stage two character portraits with event-authored expression overrides; Owen and Hayes face off angrily during their military standoff, while Lily's relief contrasts with Vale's suspicion during their investigation breakthrough
- NPC story events can author a scene-specific expression override; the expanded story cast now carries scene-specific emotional arcs from conflict through resolution, with Thomas moving from fear under the generator overload to quiet pride in the completed hotel grid
- Guest visual state is derived from Health, Stress, infection, and arrival status, exposing wet, exhausted, bandaged, bloodied, and infection-suspected presentation layers
- The first night, first monster sighting, generator blackout, and a dedicated guest-attack outcome for fighting a perimeter breach interrupt their morning reports once, using full-screen illustrated scenes with rain, lamp flicker, slow camera movement, reduced-motion support, choice-aware triggers, and save restoration
- The refugee-wave decision now branches into distinct shelter and denial aftermath cutscenes, preserving the selected moral consequence alongside resources, reputation, threat, and follow-up flags
- From DAY 10, low Security and rising monster threat can reveal an unknown death in empty Room 207; sealing or investigating it changes resources, stress, threat, evidence flags, the room's usable state, and opens a dedicated illustrated aftermath, while hotel repair can later restore the room
- From DAY 20, discovering the father's archive can wake the dead 91.3 MHz frequency; tracing it creates an alternate monster-origin clue for THE TRUTH, while answering opens a dangerous conditional return route, both with a dedicated illustrated signal scene
- From DAY 24, only players who answered that signal can meet the father's likeness at the locked gate; quarantine verification trades medical and security supplies for an anomalous biological clue, while opening the gate gains carried generator supplies and a riskier reunion route, with choice-specific illustrated aftermaths
- From DAY 25, CRITICAL or END STAGE pressure with high Monster Threat and weakened Security can trigger a one-time full-hotel siege; holding the lobby spends scarce defense supplies and inflicts a nonfatal defender injury while supporting military/fortress play, and retreating preserves lives at heavy structural cost that a later hotel-repair action can clear, each with a choice-specific illustrated aftermath
- Checked-out survivors can return after five complete road days once no first-time arrival is waiting, using the actual checkout day as the next-visit anchor and preserving their trust, health, relationships, story progress, and Aura while restarting their stay; repeat offers are bound once to each visit count, and refusing a returning survivor delays rather than permanently removes them
- Major NPC story choices can own data-driven one-time full-screen cutscenes. Mia and Daniel's HOME-route reunion uses dedicated artwork, and a saved cutscene queue prevents unique story scenes from being lost when another scene is already active
- Walter's decision to use the inherited brass key opens a dedicated basement-archive cutscene, visually linking his story resolution to the later 91.3 MHz signal and THE TRUTH investigation
- Eleanor's permanent clinic spends scarce medicine to open a dedicated illustrated scene and lowers hotel-wide normal disease risk by five percentage points, logging the residents whose illness it prevents

## Next system priorities

- Expand full-screen illustrated cutscenes for the remaining major story and ending beats

## Main NPC catalog

Twenty story NPCs share one versioned data contract for arrival conditions, offers, room Aura, relationships, hidden-trait discovery, four-stage story progression, survival state, and ending state. The UI and save migration consume this catalog generically; adding a visitor must not require another character-specific branch in the core loop.
