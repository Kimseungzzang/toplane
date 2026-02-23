# Toplane Duel (Next.js)

2-player invite-code top lane duel MVP.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## How To Start A Match

1. Host opens `/practice` (ex: `http://localhost:3000/practice`) and gets a room code.
2. Friend opens `/play/[code]` (ex: `http://localhost:3000/play/AB12CD`).
3. Both select champion, then match starts automatically.

Available routes:

- `/` : home lobby (route entry page)
- `/practice` : auto-create room
- `/play/[code]` : auto-join by invite code (invalid code redirects to `/`)

Production:

```bash
npm run build
npm start
```

## Core Features

- 2-player private room with invite code
- Champion select (Vanguard / Executioner)
- Server-authoritative simulation (20Hz)
- Minions, towers, respawn, win by tower destroy
- Q/W/E/R skill kit + passive + crit + armor
- Shop with gold-based item purchase
- Skill VFX telegraphs synced from server state
- In-game tooltip panel for champion Q/W/E/R
- Top lane bushes (visual + concealment; attacking/casting in bush reveals attacker for 1 second)
- Top lane bushes use server-side vision filtering (hidden enemy coordinates are not sent)
- Tower aggro: minion priority by default, swaps to enemy champion when they hit an allied champion under tower, with warning -> projectile -> impact phases and ramping champion-shot damage

## Champion Stats

| Champion | HP | Move Speed | Armor | Attack Range | Attack Damage | Attack Cooldown | Crit Chance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Vanguard | 390 | 255 | 38 | 95 | 34 | 0.55s | 10% |
| Executioner | 430 | 235 | 40 | 100 | 42 | 0.68s | 5% |

### Vanguard Skill Kit

- Passive `Resolve`: regenerates HP when out of combat
- Q `Swift Slash`: burst move speed + empowered next attack
- W `Iron Guard`: temporary damage reduction
- E `Cyclone Edge`: spinning AoE damage over time
- R `Final Verdict`: execute-like single target damage by missing HP

### Executioner Skill Kit

- Passive `Hemorrhage`: bleed stacks with damage over time
- Q `Crimson Arc`: inner/outer ring slash (outer stronger + self-heal)
- W `Crippling Blow`: heavy hit + short slow
- E `Hook Pull`: pull + temporary armor penetration
- R `Doomfall`: execute-like finisher scaling with bleed stacks

## Shop Items

| Item | Cost | Effect |
| --- | ---: | --- |
| Long Sword | 300 | +8 Attack Damage |
| Boots | 250 | +25 Move Speed |
| Ruby Crystal | 350 | +90 Max HP |
| Agile Cloak | 400 | +15% Crit Chance |
| Potion | 120 | Instant heal 120 HP |

## Controls

- Mobile buttons: `LEFT`, `ATK`, `Q`, `W`, `E`, `R`, `RIGHT`
- Keyboard:
  - Move: `A/D` or left/right arrows
  - Basic attack: `J` or `Space`
  - Skills: `Q`, `W`, `E`, `R`

## Economy

- Passive gold: `4 / sec`
- Player kill reward: `120`
- Minion last-hit reward (player/skill): `18`
