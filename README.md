# Orbit Foundry

A mobile-first JavaScript clicker / idle game prototype.

## Current build — v0.2.0

- Tap the reactor to generate Energy.
- Buy orbital generators for passive Energy production.
- Upgrade tap strength and generator efficiency.
- Transfer to higher orbits as the game's prestige progression.
- Orbital path: LEO → MEO → GEO → Lunar Orbit.
- Each higher orbit permanently increases all Energy production.
- Orbital transfer resets current Energy, generators, and normal upgrades while preserving lifetime production and orbital progress.
- Transfer requirements use Energy produced in the current orbit, so spending Energy does not reduce prestige progress.
- Automatic local saving every 5 seconds.
- Offline production, capped at 8 hours.
- Responsive touch-first UI for phone and tablet browsers.

## Orbit multipliers

- LEO: x1
- MEO: x2
- GEO: x5
- Lunar Orbit: x12

## Files

- `index.html` — game screen, orbital path UI, and transfer confirmation
- `style.css` — responsive orbit themes, visual design, and animations
- `game.js` — economy, upgrades, orbital prestige, save migration, and offline progress
- `.github/workflows/pages.yml` — automatic GitHub Pages deployment

## Play

https://8v6mbkbw54-coder.github.io/orbit-foundry/

The project has no build step and no external JavaScript dependencies.

## Next targets

More production tiers, orbit-specific facilities, progression goals, sound/haptics, balancing, PWA installation, and monetization hooks can be added after the orbital prestige loop is tested.
