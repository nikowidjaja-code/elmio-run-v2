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
- MOTION 1: the road's lane dashes scroll (that is what shows speed) and the characters animate.
  The backdrop is static.

## The world

- **Ground:** asphalt road with dashed white lane markings that scroll. A curb line at the edge.
- **Backdrop:** one static picture, painted once. Sky, a flat green hedge band, a few simple tree
  shapes, and a single "CAR FREE DAY" banner. No vehicles, no people, no parallax.
- **Light:** morning that brightens toward midday. No night mode. It is a colour shift only.
- **The crowd:** the five other cats (black, grey, white, calico, colorpoint) keep running faded
  in the distance. Nothing else is added to them.
- **Paper look:** keep the existing cream, flat, pixel-crisp look of the page.

## Elmio

An orange tabby, edited from the stock cat sheet (same 32x32 grid and frames): golden coat, white
socks, V-shaped chest bib, cream tail tip, a one-pixel tail flick while running. Still to add:
a headband, and a landing-squash frame for the jump. The other cats do not get headbands.

## Obstacles

Small, flat, simple sprites (7 new ones: cone, scratching post, box with ears, toy mouse, pigeon,
butterfly, rolling yarn ball). A sleeping-loaf cat was considered and left out for now; it could
replace the fishbone later (similar footprint). Each new sprite matches the footprint of the sprite it replaces (within
one pixel), so the tuned spawn timing and jump clearance stay valid.

| Replaces | New sprite |
| --- | --- |
| Can, 14x14 | Orange traffic cone (single or pairs) |
| Bag, 16x22 | Scratching post |
| Pouch, 13x16 | Cardboard box with two ears poking out of the top |
| Kibble pile, 16x7 | Toy mouse |
| Fish and fishbone on the ground | Kept as they are, as treats left on the road |
| Fish at head height (duck) | Pigeon |
| Fishbone at head height (duck) | Butterfly |
| Low flyer (jump) | Rolling yarn ball |
| High fake-out | Butterfly |

## Progress and HUD

Score becomes distance: metres, then km. A small km flag every 500 m at first (tunable after
playtesting). A "Car Free Day" line on the title screen. The best score is still saved on the
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

Daily streak, collectibles, power-ups, levels, new music, other cats in costume, a parallax
backdrop, anything with vehicles.

## Plan, in order (each step ends with a preview, the owner's approval, then a commit)

1. This file.
2. World: road, static backdrop, morning light.
3. Obstacles: the 7 new sprites, ground first, then the flyers.
4. Elmio: headband and the landing squash.
5. HUD: distance, km flags, the title line.
6. Clean-up: remove the unused gallop frames and bring the README up to date.
