# May I Have a Room? — Development Notes

Understood as: grow the published browser game into an open-duration hotel survival loop where story, management, faction, and world-state conditions unlock player-chosen final events. Every day persists one seeded 2–6 person screening queue: procedural NORMAL survivors sustain hotel pressure, at most one condition-gated MAIN character can replace a normal slot without overt UI identification, MAIN stays remain story-controlled, and saved history carries every decision into later visits.

Aura presentation is understood as data-owned: every Aura defines its own short label, category, and icon, and room UI must never infer presentation from an NPC role.

## Current playable contract

- DAY 0 illustrated prologue with a dedicated father-departure scene, timed first knock, and title reveal
- DAY 1 front-desk guest screening with questions, item inspection, negotiation, hold, check-in, and refusal
- Explicit choice among 30 rooms, with movement and manual or stay-expiry checkout
- Data-driven grid Aura calculation; Eleanor's Medical Care Zone affects only `NORMAL_DISEASE`
- Nightly food, water, and generator-fuel settlement based on actual occupancy, selected ration policy, and active power circuits
- NORMAL remaining-stay countdown, automatic checkout, Aura removal, and HOTEL LOG entries; MAIN residents never leave because a generic stay counter expired
- Four-stage guest stories that advance from arrival through resolution and persist in the hotel log
- Relationship event strength based on room distance: adjacent ×2, same floor ×1.5, otherwise ×1, recorded when conflict stages fire
- Eleanor + Ruth `MEDICAL WARD` Aura synergy heals 10 Health nightly in overlapping treatment rooms
- Versioned local save restoration that recomputes derived room effects from guest source state
- Unbounded DAY progression; DAY records survival time but never triggers an ending by itself
- Seven data-driven ending routes that unlock optional final events without stopping normal management
- A soft-pressure World State derived from time, scarcity, threat, and hotel stability
- Three daily action points for repair, community, patrol, trade, and facility decisions, restored at each morning report
- Five saved staff duties turn resident repair, combat, medical, work, and scavenging skills into hotel operations. One resident can hold one assignment; nightly maintenance, security, medical, and kitchen results appear in the morning ledger, and departed residents are removed automatically
- Three data-driven daytime scavenging missions spend one AP and use a visible skill-based success chance. Results are deterministic for the save seed, DAY, mission, and scout, and persist rewards, injury, stress, exposure, reputation, hotel-log entries, and visitor history without reload rerolls
- State-derived daily objectives and up to five priority-sorted urgent problems expose resource, power, threat, and hotel-damage pressure in both the morning report and management screen
- Saved night preparation controls three fuel-limited power circuits for security, clinic, and kitchen operations; disabled circuits create visible, logged penalties instead of hidden failure
- Saved NORMAL, LIMITED, and SEVERE food-ration policies trade food demand against resident Stress and Health, with the morning ledger showing base demand, actual consumption, powered circuits, and warnings
- Four buildable facilities with resource costs, passive production, stat changes, and faction reputation effects
- Save v12 restoration for facilities, reputations, three daily actions, power allocation, ration policy, night choices, pending NPC story scenes, one-time cutscene progress, generated visitors, the current queue position, visitor history, staff assignments, and the latest scavenging report; full unused AP in older saves migrates to the new three-point day
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
- Each DAY now owns a weighted 2–6 visitor queue generated once from the save seed. World State, reputation, radio exposure, storms, and Monster Threat modify the count; the queue and its current index survive reloads without rerolling
- Procedural NORMAL visitors draw from age-gated job profiles, bounded role skills, weighted stays, visible and hidden traits, illness/injury risk, factions, offers, portrait templates, rare expertise, and optional data-owned Aura definitions
- MAIN arrival is evaluated separately with prerequisite flags/NPC appearances, a hidden wait-time probability correction, weighted selection, and a strict one-per-day limit; it replaces a normal slot and the front desk never labels it as a main character
- Visitor History records first and latest visit days, accepts, refusals, occupied rooms, paid resources, event notes, and final state for both generated and authored visitors; eligible NORMAL survivors can later replace a fresh slot as remembered returnees
- Major NPC story choices can own data-driven one-time full-screen cutscenes. Mia and Daniel's HOME-route reunion uses dedicated artwork, and a saved cutscene queue prevents unique story scenes from being lost when another scene is already active
- Walter's decision to use the inherited brass key opens a dedicated basement-archive cutscene, visually linking his story resolution to the later 91.3 MHz signal and THE TRUTH investigation
- Eleanor's permanent clinic spends scarce medicine to open a dedicated illustrated scene and lowers hotel-wide normal disease risk by five percentage points, logging the residents whose illness it prevents
- Hazel's ranger-watch resolution opens a dedicated perimeter-network scene and keeps the installed alarm active each night, applying and logging up to three points of Monster Threat reduction after room Aura effects
- Thomas's microgrid resolution opens a dedicated generator-room scene, removes the hotel's one-unit base generator fuel demand, and suppresses the ordinary low-fuel failure event while leaving every facility's own upkeep intact
- Noah's recovery route can open a dedicated illustrated community table that saves one food unit whenever at least two residents share a meal; food-shortage events use the same Aura- and kitchen-adjusted demand as nightly consumption
- Samuel's accountable civilian-watch route opens a dedicated illustrated handover and permanently adds two Security while removing two Crime each night, with logs limited to the change that actually fits the hotel-stat boundaries
- Ruth's community-care route opens a dedicated illustrated handover and permanently gives assigned children, elders, pregnant residents, injured residents, and sick residents up to three Health recovery and four Stress relief each night, logging only residents who actually receive care
- Rosa's shared-household route opens a dedicated illustrated corridor routine and saves one water unit whenever at least two assigned residents share washing and ration-preparation work; the same demand drives actual nightly consumption and its hotel log
- Eli's pathfinder route opens a dedicated illustrated safe-passage scene and reduces nightly Monster Threat by one through mapped back routes; settlement records only the reduction that survives the global threat floor
- Claire's safe-nursery route opens a dedicated illustrated hotel-room refuge and gives three nightly Stress relief to assigned children and pregnant residents, independently tracking care when Ruth's broader community team is also active
- Grace's mutual-aid route opens a dedicated illustrated repair shift and restores one Hotel Condition each night through shared maintenance, logging only repair that fits below the condition cap
- Vale's completed research with Lily opens a dedicated illustrated behavior-map scene and reduces Monster Threat by two each night through shared prediction notes, logging only reduction that survives the global threat floor
- Owen's civilian defense route opens a dedicated illustrated preparation scene and records its own siege plan, distinct from Samuel's general guard flag; during the DAY 25 hotel siege, Security supplies cost 4 instead of 6, parts cost 2 instead of 3, and the lead defender loses 10 rather than 20 Health, with the night UI and settlement consuming the same derived choice
- Hayes's signed-command route records the military-resistance failure required by MILITARY OCCUPATION and opens a dedicated illustrated handover scene before the final occupation event; signing and civilian rule explicitly replace one another's military outcome flags so the latest command decision remains authoritative
- Jack's fair-market route opens a dedicated illustrated public exchange and changes the daytime trade run at its data source: the UI, affordability check, settlement, and log all use one fuel instead of two and remove the humanitarian reputation loss; fair and monopoly choices replace one another's market flags
- Victor's public-bunker trust opens a dedicated illustrated handover and changes the refugee-wave shelter choice at its data source: the UI, affordability check, and settlement use food 2, water 2, and Monster Threat +1 instead of food 4, water 3, and threat +4; public-trust and monopoly outcomes replace one another's bunker flags
- Lily's public truth route opens a dedicated illustrated radio-room broadcast and, from DAY 16, a one-time response event in which the player can spend fuel to verify survivor testimony as a second monster-origin clue or close the frequency to reduce exposure; broadcast and encrypted-archive outcomes replace one another's publication flags

## Next system priorities

- Extend the survival loop with multi-stage evidence cases and deeper night-preparation choices
- Expand full-screen illustrated cutscenes for the remaining major story and ending beats

## Main NPC catalog

Twenty story NPCs share one versioned data contract for arrival conditions, offers, room Aura, relationships, hidden-trait discovery, four-stage story progression, survival state, and ending state. The UI and save migration consume this catalog generically; adding a visitor must not require another character-specific branch in the core loop.
