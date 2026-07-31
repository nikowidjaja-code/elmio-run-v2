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

| Action  | Keyboard                  | Touch                          |
| ------- | ------------------------- | ------------------------------ |
| Jump    | `Space` / `↑` / `W`       | tap the upper part of the game |
| Duck    | hold `↓` / `S`            | hold the lower part            |
| Start / restart | `Space` or any jump key | tap                     |

Releasing jump early cuts the jump short; holding duck mid-air fast-falls.

### Obstacles

All cat food, rudely left in the running lane:

- **Whole fish** — alone or in schools of 2–3. Jump!
- **Open pâté cans** — single or in pairs.
- **Kibble bags** (tall) and **wet food pouches** — jump over them.
- **Kibble piles** and **fishbones** — low and easy hops.
- **Flying fish** tumbling toward you at three heights — jump the low ones,
  **duck** under the mid ones, and ignore the high ones.

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
index.html   page shell
style.css    layout + pixel-crisp canvas scaling
game.js      the whole game (~450 lines, vanilla JS)
assets/      the six cat sprite sheets (128×256, 4×8 grid of 32×32 cells)
```
