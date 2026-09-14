# Orbit Foundry

A mobile-first JavaScript clicker / idle game built around atomic facility progression, electron orbitals, and long-term industrial expansion.

## Current build — v0.5.0

The playable prototype remains intentionally limited to Hydrogen through Carbon while the core economy is tested.

### Atomic facility progression

- H — Z=1 — `1s¹` — tutorial start
- He — Z=2 — `1s²` — tutorial remodel step
- Li — Z=3 — `1s² 2s¹` — unlocks 2s visuals and the Energy Market
- Be — Z=4 — `1s² 2s²`
- B — Z=5 — `1s² 2s² 2p¹` — unlocks p-orbital visuals
- C — Z=6 — `1s² 2s² 2p²` — current prototype endpoint

Progression is framed as facility shutdown and remodeling rather than generic prestige. The current facility is stopped, stabilized, and rebuilt for the next element. Reaction Energy and temporary operating upgrades reset, while permanent equipment and Credits remain.

## Economy

### Reaction Energy

The primary short-term resource is Reaction Energy, displayed in `MeV` and automatically scaled to `GeV` / `TeV` when appropriate.

- Tapping produces Reaction Energy.
- Particle collectors produce it automatically.
- Temporary operating upgrades cost Reaction Energy.
- Remodeling to the next element requires currently held Reaction Energy.
- Spending or selling energy therefore delays remodeling and creates a real progression tradeoff.

### Credits

Credits are the permanent resource.

Starting at Lithium, the facility can route a portion of generated Reaction Energy to the external grid. Sold energy is converted into Credits.

The player can route 0–80% of production to the grid. More selling means slower atomic progression but faster permanent equipment growth.

Credits survive every facility remodel.

## Permanent equipment

Three permanent equipment grades are currently implemented:

- Reactor Grade — boosts all manual and automatic Reaction Energy production.
- Collector Grade — boosts passive particle-collector production.
- Converter Grade — improves the MeV-to-Credits conversion rate.

Permanent equipment also begins to appear visually around the central atom as rings and collection nodes.

## Temporary facility equipment

These are tuned for the current element and reset during remodeling:

- Particle Collector
- Reaction Pulse Tuning
- Automatic Operation Control

## Visual progression

Electron configuration controls the central orbital form:

- `1s` — H / He
- `2s` — Li / Be
- `2p` — B / C

Element color presets and more scientifically grounded emission / flame-color references are planned for later passes.

## Save and offline behavior

- Existing v0.1–v0.4 saves migrate into v0.5.
- Atomic progress is preserved.
- New Credits and permanent equipment fields are added without deleting old progression.
- Automatic save every 5 seconds.
- Offline production is capped at 8 hours.
- Offline output follows the saved energy-routing ratio, producing both retained MeV and Credits when applicable.

## Files

- `index.html` — interface and system layout
- `style.css` — responsive UI, orbital states, permanent-equipment visuals
- `game.js` — economy, routing, remodeling, save migration, offline progress
- `.github/workflows/pages.yml` — GitHub Pages deployment

## Live build

https://8v6mbkbw54-coder.github.io/orbit-foundry/

## Next targets

Balance the H→C timing with the new two-currency economy, refine element-specific visual presets, and then extend the periodic table through the rest of period 2.
