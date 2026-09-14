# Orbit Foundry

A mobile-first JavaScript clicker / idle game built around atomic progression, electron orbitals, and later macro orbital expansion.

## Current build — v0.3.0

The first atomic prestige prototype is playable from Hydrogen through Carbon.

### Atomic progression

- H — Z=1 — `1s¹` — 1s visual state
- He — Z=2 — `1s²` — 1s visual state
- Li — Z=3 — `1s² 2s¹` — unlocks the 2s orbital visual
- Be — Z=4 — `1s² 2s²` — expanded 2s state
- B — Z=5 — `1s² 2s² 2p¹` — unlocks the first p-orbital lobes
- C — Z=6 — `1s² 2s² 2p²` — adds a second p-orbital direction

Atomic number advancement is the primary prestige loop. Each synthesis resets current Energy and local production upgrades, while the new element and its permanent production multiplier remain unlocked.

Progress toward synthesis is based on Energy produced while on the current element, not Energy currently held, so buying upgrades does not move prestige progress backward.

## Progression layers

1. Atomic number — frequent prestige: H → He → Li → Be → B → C → later elements
2. Electron shell / orbital families — milestone unlocks: s → p → later d → f
3. Space orbit — higher-tier prestige: LEO → MEO → GEO → Lunar and later trajectories

The v0.2 macro-orbit state is preserved in save-data migration and is shown as a higher progression layer while the atomic loop is being tested.

## Core systems

- Tap reactor for Energy
- Particle collectors for passive Energy production
- Tap and automation upgrades
- Automatic local save every 5 seconds
- Offline production capped at 8 hours
- Touch-first responsive UI for iPad, phone, and desktop browsers
- Save migration from earlier v0.1/v0.2 builds

## Files

- `index.html` — interface and orbital visualization structure
- `style.css` — responsive UI, s/p orbital states, animations
- `game.js` — economy, atomic synthesis, prestige, save migration, offline progress
- `.github/workflows/pages.yml` — GitHub Pages deployment

## Live build

https://8v6mbkbw54-coder.github.io/orbit-foundry/

## Next targets

Balance the H→C loop, then extend the periodic-table progression toward N/O and the rest of period 2. Later milestones will introduce d and f orbital families, element-specific industrial effects, and reconnect full macro-orbit prestige.
