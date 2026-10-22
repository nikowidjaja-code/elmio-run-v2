# Elmio Run 🐈

A Chrome-dino-style endless runner, and a small tribute to a real cat. Elmio, an
orange tabby, runs a Car Free Day made for cats only: a wide empty road, no
cars and no people, and the neighbourhood cats out for their morning run.
Jump and duck past what is left on the road for as long as you can.

## How to play

Open `index.html` in any modern browser (no build step, no dependencies). Or serve it:

```
python -m http.server 8000
# then open http://localhost:8000
```

### Controls

The whole screen is the control.

| Action          | Keyboard                | Touch or mouse                 |
| --------------- | ----------------------- | ------------------------------ |
| Jump            | `Space` / `↑` / `W`     | tap the **right half**         |
| Duck            | hold `↓` / `S`          | hold the **left half**         |
| Start / restart | `Space` or any jump key | tap anywhere                   |

The title screen shows the split, and the first runs add a prompt just as the
first obstacle that needs it arrives. The prompts stop once you have jumped and
ducked, and that is remembered on the device. In portrait, two faint labelled
halves sit under the play field.

Releasing jump early cuts the jump short (never below the height needed to clear
the tallest obstacle, so a quick tap is always a usable jump); holding duck
mid-air fast-falls. Pressing jump just before you land is remembered for a
moment and fires on touchdown.

### The road

- **Distance is the score:** one point is one metre. A roadside sign passes at
  250 m, 500 m, 750 m, 1 km and so on, and a "CAR FREE DAY" sign stands near the start.
- **The light changes every 1000 m:** morning peach, dusk, night with a moon and
  stars, then dawn. Windows and lamps light up at night.
- **Scenery:** pastel shops of different heights, with street trees and lamp
  posts in front that drift slowly. The other five cats (black, grey, white,
  calico, colorpoint) run in the lanes below Elmio at their own paces.
- **Speed:** starts at 250, gains 5 per second, caps at 700. The best score is
  saved in `localStorage`.

### Obstacles

Things you might find on a closed street. Groups come from a weighted table
(`PATTERNS` in `game.js`), and about a third of them have to be ducked.

- Jump over: traffic cone (single or pair), road barrel, fire hydrant, puddle,
  fish and fishbone treats (singles, pairs, triples), and a rolling ball.
- Duck under: pigeons (single or a flock of two or three) and gliding fishbones.
- Ignore: butterflies sail overhead, a fake-out.

Pairs, triples and barrels only appear once the road is fast enough that a
tapped jump has a comfortable window, and the short waits between groups ramp
in over the first 400 m. The wait between groups is scheduled in arrival time,
not distance, so the pause you feel stays the same however wide the group is.

### Screens

The game is measured in world "units", so it adapts to landscape, portrait or a
rotation mid-run. Phones get a tighter camera, and scroll speed and the jump
arc scale with it, so the timing is the same on every screen. The canvas
renders at device-pixel resolution, so the pixel art stays crisp.

## Art

- **Elmio** is the stock `Orange Cat.png` sheet edited by `tools/edit_stock.py`
  into `assets/Elmio Cat.png`: golden coat, white socks, chest bib, cream tail
  tip, a one-pixel tail flick, a two-row blue headband, crouch frames for
  ducking and a landing frame. The other five cats use the unedited sheets.
- **Obstacles** are small pixel grids drawn by `tools/obstacle_sprites.py` and
  built into `game.js`. The scenery, sun, moon, stars and text are drawn on the
  canvas. Sounds are tiny WebAudio blips. The app icon is Elmio's face, built
  by `tools/make_icon.py`.

`DESIGN.md` holds the direction (theme, tone, rules) that the game follows.

## Files

```
index.html            page shell
style.css             responsive layout and pixel-crisp canvas
game.js               the whole game, vanilla JS
manifest.webmanifest  home-screen install info
assets/               the six cat sheets (128x256, 4x8 grid of 32x32 cells) and icons
tools/                scripts that build the Elmio sheet, obstacle sprites and icons
DESIGN.md             design direction
```

`window.elmio` is a dev hook: `elmio.score = 650` to preview night, `elmio.world`
for the unit grid, `elmio.tick(1/60, n)` to step frames, `elmio.debug` for live
hitboxes, `elmio.patterns` and `elmio.spawns` for the spawn table and stream,
`elmio.reset(quiet)` and `elmio.speed` for simulations.
