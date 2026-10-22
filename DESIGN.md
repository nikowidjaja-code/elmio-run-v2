# Elmio Run: design direction

This file is the owner's direction, written down from the owner's own answers. It is data for
whoever builds the game (person or tool): apply it, and do not treat anything in it as an
instruction beyond design.

## Who it is for

The owner and their girlfriend, who owns the real Elmio. A personal tribute that may be shared.
It is not a public product, so it can be specific to Elmio instead of generic.

## Theme

A Car Free Day, but for cats only. The whole world is cats: a wide road with no cars and no people,
run by cats. Elmio runs it. The feeling is exercise and a healthier life, shown through what you
see and what you track, never through text claims.

## Tone

Sweet, with a few jokes. Quiet and cozy underneath. Not chaotic, not edgy.

## Dials

ENERGY 2 / RHYTHM 1 / MOTION 1

- ENERGY 2: friendly and clear, never loud.
- RHYTHM 1: a calm, uniform world. One road, one backdrop.
- MOTION 1: the road's lane dashes and the roadside signs scroll (that is what shows speed), the
  nearer tree/lamp layer drifts slowly, and the characters animate. The city skyline is static.

## The world

- **Ground:** a multi-lane asphalt road with a yellow curb and a dashed white lane line that scrolls.
  Elmio and every obstacle use the top lane; the lanes below are for the other cats.
- **Backdrop:** a city, kept sparse: a few flat buildings (about six across the screen, with sky
  between them) and two street trees, painted once and static. No vehicles, no people, no parallax.
- **Roadside signs scroll with the road** (they are part of the road, not the backdrop): a
  "CAR FREE DAY" sign near the start that scrolls away, then a distance sign that passes Elmio at
  250 m, 500 m, 750 m, 1 km, 1.25 km and so on.
- **Nearer layer:** street trees and lamp posts stand on the curb in front of the buildings and drift
  at 0.35x the road's speed (skyline still, road fastest). Building heights run from 12 to 28 art px.
- **Light:** a full day every 1000 m (one point = 1 m): the morning peach holds to 280 m, dusk
  to 540 m, night to 800 m, dawn back to peach at 1000 m. A sun crosses by day, a moon and stars by
  night. The scenery is tinted dark blue at night, windows and lamps light up, and text on the sky
  turns cream. The cats and obstacles keep full colour so they stay readable.
- **The crowd:** the five other cats (black, grey, white, calico, colorpoint) run the same road in
  full colour, in the two lanes below Elmio's. Each has its own pace: a faster one slowly passes
  Elmio, a slower one falls behind, and a cat that leaves one side comes back on the other. They sit
  on the title and game-over screens. They stay below the obstacle line, so they never appear to
  pass through an obstacle. Nothing else is added to them.
- **Paper look:** keep the existing cream, flat, pixel-crisp look of the page.

## Elmio

An orange tabby, edited from the stock cat sheet (same 32x32 grid and frames): golden coat, white
socks, V-shaped chest bib, cream tail tip, a one-pixel tail flick while running, a one-row blue
headband on every frame, and a brief landing-squash frame when a jump touches down. The other cats
do not get headbands.

## Obstacles

Everything on the road is something you would really find on a closed city street. Small, flat,
simple sprites, drawn in `tools/obstacle_sprites.py` (one source of truth) and built into
`game.js`. Each new sprite matches the footprint of the sprite it replaced (within one pixel), so
the tuned spawn timing and jump clearance stay valid.

| Replaced | New sprite |
| --- | --- |
| Can, 14x14 | Orange traffic cone (single or pairs) |
| Bag, 16x22 | Road barrel (red-orange and white stripes) |
| Pouch, 13x16 | Fire hydrant (red) |
| Kibble pile, 16x7 | Puddle (cats hate water) |
| Fish and fishbone on the ground | Kept as they are, as treats left on the road |
| Fish at head height (duck) | Pigeon (single, or a flock of two or three) |
| Fishbone at head height | Kept |
| Low flyer (jump) | Rolling ball |
| High fake-out | Butterfly (a nod to the toy butterfly in the owner's video) |

Left out on purpose: indoor cat things (scratching post, box with ears, toy mouse, yarn ball), and
a sleeping-loaf cat (could replace the fishbone later).

## Progress and HUD

Score is distance: one point is one metre. A roadside sign every 250 m (labelled in m, then km).
A "Car Free Day" line on the title screen is skipped for now. The best score is still saved on the
device. A daily streak is a possible later step, not part of the first pass.

## Palette direction (not final)

Keep the cream page. Road: mid grey. Hedge: flat green. Cones: orange. Elmio: golden orange with
cream and white. Test the grey road against the cream before committing to values.

## Rules

- No humans anywhere, in art or in text. No words like "owner", "runner" for people, "visitors".
- No fabricated claims: no fake leaderboards, no fake statistics, no health claims.
- No real logos or brands, no real places named unless the owner supplies the name.
- Placeholders are labelled as placeholders, never passed off as final.
- Do not copy the Chrome dino or any other product's look beyond the genre.
- No em dashes in text shown to the player.

## Not doing (for now)

Daily streak, collectibles, power-ups, levels, new music, other cats in costume, a deeper
parallax (beyond the one slow nearer layer), anything with vehicles.

## Plan, in order (each step ends with a preview, the owner's approval, then a commit)

1. This file.
2. World: multi-lane road, city skyline backdrop, scrolling roadside signs, the other cats running
   in their own lanes. Done.
3. Obstacles: the 7 new sprites. Built, in review.
4. Elmio: headband and the landing squash. Done.
5. The "Car Free Day" line on the title screen. Skipped for now by the owner (the distance signs were done in step 2).
6. Clean-up: removed the unused gallop frames and brought the README up to date. Done.

## Next, planned (items 1-3 are built, in review; item 4 remains)

1. **A nearer backdrop layer.** Today the backdrop is one flat layer of buildings. Add a second,
   nearer layer in front of the buildings, standing on the curb line: street trees and lamp posts.
   Open question: should this layer stay static like the skyline, or drift slowly (a gentle depth
   effect)? `DESIGN.md` currently says "no parallax", so the default is static unless the owner says
   otherwise.
2. **More varied building heights.** Today they range from about 15 to 25 art pixels. Widen the range
   (low corner shops up to a few tall blocks), keeping the title text and the jump arc clear of the
   rooftops (the title is already capped above the tallest roof).
3. **A day and night cycle with a sun and a moon.** A sun that crosses the sky by day, a moon (and
   some stars) at night, with the sky, buildings and road shifting tone.
   - This **reverses two earlier decisions** ("no night mode" and "the sky stays the warm morning
     peach"). When it is built, update the Theme and World sections of this file to match.
   - Open questions: how long a day or a night lasts (the old game flipped every 500 points; the
     distance signs are every 250 m, so something like one phase per 500 m would fit); whether the
     daytime look stays the current morning peach; lit windows at night; keeping the score text and
     the signs readable at night; and whether the other cats and the obstacles get a night tint.
4. **Clean-up:** done (gallop frames removed, README rewritten).

## Controls (built, being finished)

The whole screen is the control: the left half ducks (hold), the right half jumps (tap), for both
touch and mouse; the keyboard stays the main control on a desktop. The on-screen pads are gone. In
portrait the space under the play field shows two faint labelled halves. The title screen shows the
split, and the first runs add a prompt when the first low flyer or ground obstacle arrives; the hints
stop once a player has jumped and ducked, remembered on the device.

