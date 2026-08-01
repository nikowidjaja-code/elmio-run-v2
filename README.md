# Elmio Run 🐈

A Chrome-dino-style endless runner starring the orange cat from the
*Cat Sprites Animation* pack. Jump and duck your way past the other
neighborhood cats for as long as you can.

## How to play

Open `index.html` in any modern browser (double-clicking works — no build
step, no dependencies). Or serve it:

```
python -m http.server 8000
# then open http://localhost:8000
```

### Controls

| Action          | Keyboard                | Touch                          |
| --------------- | ----------------------- | ------------------------------ |
| Jump            | `Space` / `↑` / `W`     | **JUMP** pad, or tap the field |
| Duck            | hold `↓` / `S`          | hold the **DUCK** pad          |
| Start / restart | `Space` or any jump key | tap anywhere                   |

On touch devices two thumb pads appear below the play field (duck left, jump
right) and a fullscreen toggle appears in the corner of the field. Tapping
anywhere in the play field also jumps, so the pads are optional.

Releasing jump early cuts the jump short (but never below the height needed to
clear the tallest obstacle, so a quick tap is always a usable jump); holding
duck mid-air fast-falls. Pressing jump just before you land is remembered for
a moment and fires on touchdown. Jumping out of a duck works, so mashing both
pads is safe.

### Screens

The play field adapts to whatever box the page gives it — landscape, portrait,
or a rotation mid-run — and the game is measured in world "units" rather than
pixels:

- Phones get a **tighter camera** (a ~700-unit runway instead of 900) so the
  cat and the food stay big enough to read.
- Scroll speed and the jump arc are scaled with the runway, so the *timing* is
  identical on every screen: an obstacle always takes the same number of
  seconds to arrive, a jump always covers the same amount of ground (236
  units) and reaches the same height (115 units), and scores are comparable
  between devices.
- The canvas is rendered at device-pixel resolution, so the pixel art stays
  crisp on high-DPI displays.

### Obstacles

All cat food, rudely left in the running lane — or thrown at you. Groups are
drawn from a weighted table (`PATTERNS` in `game.js`), and about a third of them
have to be **ducked** rather than jumped.

On the ground, jump over:

- **Whole fish** — alone or in schools of 2–3 (three only above a certain speed,
  so a quick tapped jump can still clear the whole school).
- **Open pâté cans** — single or in pairs.
- **Kibble bags** (tall), **wet food pouches**, **kibble piles**, **fishbones**.

In the air, closing in 25% faster than the ground scrolls:

- **Low flying fish** — jump it.
- **Head-height flying fish**, single, or **flocks of 2–3** — duck. A single one
  can also be jumped with good timing, but a flock is too wide for the arc to
  span while staying above it, so sliding under is the only answer.
- **Gliding fishbones**, single or in pairs, also at head height — duck.
- **High flying fish** — sails overhead. Do nothing; it's a fake-out.

The head-height groups unlock as your score climbs (single at 50, flocks at
160, wide flocks at 320+), so the opening stretch stays calm.

### Pacing

The pause between one group finishing its pass and the next one arriving is
drawn from three buckets rather than one flat range, so the rhythm keeps
shifting: **back-to-back** (~0.7–0.95 s), **cruising** (~1.05–1.65 s), and a
**breather** (~1.9–2.9 s).

Because that pause is what a player actually feels, it is scheduled in arrival
time, not in distance: the next group is picked in advance and its spawn is
solved backwards from when it should reach the cat. A plain distance timer gets
this wrong twice over — flyers close in faster than the ground scrolls, and a
wide flock takes far longer to finish passing than a single fish, so both would
silently eat into your reaction time.

The other neighborhood cats (black, grey, white, calico, colorpoint) race
along in the distance as a faded background layer.

The game speeds up the longer you survive, day turns to night every 500
points, and your best score is saved in `localStorage`.

## Assets

All cats are drawn from the 32×32-per-frame sprite sheets in `assets/`
(orange cat = player; the other five colors = background racers). The
animation sequences (run, jump, duck/laying, sitting, sleeping) follow
the pack's own labelled reference sheet. The duck pose is the laying
animation with only the body squashed flat — the head stays at full
size — since the pack has no true crouch-run frame.

The cat-food obstacles (can, kibble bag, pouch, bowl) are procedural
pixel art defined as character grids in `game.js` — no image files. Ground, clouds,
stars, moon and text are procedural canvas shapes — no other art assets
are used. Sounds are tiny WebAudio blips, no audio files.

## Files

```
index.html   page shell + touch pads
style.css    responsive layout (landscape/portrait) + pixel-crisp canvas
game.js      the whole game (~700 lines, vanilla JS)
assets/      the six cat sprite sheets (128×256, 4×8 grid of 32×32 cells)
```

`window.elmio` is a dev hook: `elmio.score = 495` to preview night mode,
`elmio.world` for the current unit grid, `elmio.tick(1/60, n)` to step frames,
`elmio.debug` for live hitboxes, `elmio.patterns` for the spawn table and
`elmio.spawns` for the recent spawn stream (name + intended gap) when tuning
pacing.
