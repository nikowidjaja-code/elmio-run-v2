/* ============================================================
   ELMIO RUN — a Chrome-dino-style endless runner
   starring the orange cat from the Cat Sprites animation set.

   All drawn imagery comes from the 6 cat sprite sheets in
   /assets (player = orange cat, obstacles = the other cats).
   Ground, clouds, stars and text are procedural canvas shapes.
   ============================================================ */

(() => {
  "use strict";

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const seeded = seed => {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };

  // ---------- canvas ----------
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ---------- responsive world ----------
  // Everything below is measured in world "units". The canvas shows a runway
  // of W units, picked from the CSS width so sprites land at a comfortable
  // physical size: ~900 on desktops/tablets, ~700 on phones (a tighter camera
  // rather than a shrunken one). Narrowing the camera would make the game
  // harder for free, so the scroll speed and the jump arc are scaled by
  //   f = W / REF_W
  // which keeps every timing identical on every screen: an obstacle still
  // takes the same number of seconds to reach the player, and a jump still
  // covers the same number of units of ground (see doJump / update).
  const REF_W = 900;            // reference runway the tuning was done at
  const RUNWAY_MIN = 700;
  const RUNWAY_MAX = 900;
  const RUNWAY_FLOOR = 620;     // never zoom in past this to trim sky
  const WORLD_H_MIN = 235;      // units needed for jump arc + HUD headroom
  const WORLD_H_MAX = 520;      // past this the extra height is dead sky

  let W = REF_W;                // visible width in units
  let H = 260;                  // visible height in units
  let GROUND = 225;             // y of the ground line (feet baseline)
  let f = 1;                    // world scale vs. the reference screen
  let U = 1;                    // units per CSS pixel (for UI text sizes)
  let ppu = 1;                  // device pixels per unit (canvas transform)

  // ---------- constants ----------
  const SCALE   = 3;          // sprite px -> world units
  const PLAYERX = 70;         // player content-left x
  const GRAVITY = 1900;       // units/s^2 at f = 1
  const FASTFALL= 3900;       // gravity while holding duck in the air
  const JUMP_V  = -660;       // jump impulse units/s
  // vy clamp when jump is released early. A touch "tap" is only ~60ms long, so
  // every tapped jump is a cut jump, and the cut therefore has to stay big
  // enough to clear the worst group in the spawn table (three fish, 228 units
  // of overlap at the speed they unlock). -600 -> apex 95 units and 0.62s of
  // air, vs 115 units / 0.68s for a jump that is held down.
  const JUMP_CUT= -600;
  const SPEED0  = 340;        // starting scroll speed, reference units/s
  const SPEEDMAX= 820;
  const SPEEDUP = 10.4;       // reference units/s gained per second
  const JUMP_BUFFER = 0.12;   // s of "I pressed just before landing" grace
  const NIGHT_EVERY = 500;    // score interval for day/night flip
  const HI_KEY  = "elmio-run.hi";

  // ---------- sprite sheet metadata ----------
  // Every sheet is a 128x256 PNG on a 4x8 grid of 32x32 cells (the Elmio sheet
  // has two more rows below, 128x320, for the gallop in-between frames).
  // bb = tight content box [x0,y0,x1,y1] (exclusive right/bottom),
  // measured from the sheets; identical across all cat colors.
  const CELL = 32;
  const F = {};
  for (const [name, r, c, bb] of [
    ["stand1",   1, 0, [8, 8, 26, 25]],   // idle/run pose A
    ["stand2",   1, 1, [8, 9, 26, 25]],   // idle/run pose B
    ["stand3",   0, 0, [8, 8, 26, 25]],   // jump-anticipation stand
    ["crouch",   0, 1, [8, 7, 26, 25]],   // gathered, tail up
    ["stretch",  0, 2, [8, 6, 26, 22]],   // airborne stretch
    ["tuck",     0, 3, [8, 7, 26, 24]],   // airborne tuck / landing
    ["stand4",   2, 0, [8, 8, 26, 25]],   // sit-down transition stand
    ["duck1",    2, 1, [8, 12, 26, 25]],  // crouch run A (head dropped onto the body)
    ["duck2",    2, 2, [8, 13, 26, 25]],  // crouch run B
    // gallop: the air frames (1, 5, 6) are drawn lifted off the ground; bb[1] is
    // the hitbox top only, so it stays at the old run cycle's 8/9 and the lift is forgiving.
    ["gallop1",  2, 3, [8, 8, 26, 25]],   // stretched out in the air
    ["gallop2",  4, 2, [8, 8, 26, 25]],   // front paws land
    ["gallop3",  4, 3, [8, 9, 26, 25]],   // legs under the body
    ["gallop4",  6, 1, [8, 8, 26, 25]],   // push off
    ["gallop5",  6, 2, [8, 8, 26, 25]],   // tucked at the top of the leap
    ["gallop6",  6, 3, [8, 8, 26, 25]],   // reaching forward
    // in-between poses, in two extra rows at the bottom of the Elmio sheet only
    ["gallop1b", 8, 0, [8, 8, 26, 25]],   // coming down out of the stretch
    ["gallop2b", 8, 1, [8, 8, 26, 25]],   // settling after the landing
    ["gallop3b", 8, 2, [8, 8, 26, 25]],   // hind starting to sweep back
    ["gallop4b", 8, 3, [8, 8, 26, 25]],   // leaving the ground
    ["gallop5b", 9, 0, [8, 8, 26, 25]],   // top of the leap, front starting to reach
    ["gallop6b", 9, 1, [8, 8, 26, 25]],   // hind stretching back
    ["sit1",     3, 0, [7, 8, 26, 25]],
    ["sit2",     3, 1, [6, 8, 26, 25]],
    ["sit3",     3, 2, [5, 8, 26, 25]],
    ["sit4",     3, 3, [7, 8, 26, 28]],
    ["lay1",     4, 0, [9, 9, 26, 29]],
    ["lay2",     4, 1, [9, 10, 26, 29]],
    ["lay3",     5, 1, [9, 10, 26, 28]],
    ["lay4",     5, 3, [8, 10, 26, 29]],
    ["curl",     6, 0, [9, 11, 26, 27]],
    ["sleep1",   7, 0, [9, 11, 26, 27]],
    ["sleep2",   7, 1, [9, 11, 26, 28]],
    ["sleep3",   7, 2, [9, 11, 26, 29]],
  ]) {
    F[name] = { sx: c * CELL, sy: r * CELL, bb };
  }

  // Animation sequences reconstructed from the labelled
  // "Cat Sprites Animation Sequence" reference sheet.
  const ANIM = {
    // the original stock run cycle; the gallop frames below are kept in the sheet but unused
    run:      { frames: ["stand1", "stand3", "stand2", "crouch"], fps: 10 },
    duck:     { frames: ["duck1", "duck1", "duck2", "duck2"],     fps: 8  },
    sitIdle:  { frames: ["sit2", "sit3", "sit4", "sit3"],         fps: 3.5},
    standUp:  { frames: ["sit2", "sit1", "stand4", "stand1"],     fps: 12 },
    toSleep:  { frames: ["lay3", "curl", "sleep1"],               fps: 5  },
    sleep:    { frames: ["sleep1", "sleep2", "sleep3", "sleep2"], fps: 2.5},
  };

  function animFrame(anim, t) {
    const a = ANIM[anim];
    return F[a.frames[Math.floor(t * a.fps) % a.frames.length]];
  }
  function animFrameOnce(anim, t) {   // clamps at the last frame
    const a = ANIM[anim];
    return F[a.frames[Math.min(Math.floor(t * a.fps), a.frames.length - 1)]];
  }
  function animDone(anim, t) {
    const a = ANIM[anim];
    return t * a.fps >= a.frames.length;
  }

  // ---------- assets ----------
  const SHEETS = {
    orange:     "assets/Elmio Cat.png",
    black:      "assets/Black Cat.png",
    grey:       "assets/Grey Cat.png",
    white:      "assets/White Cat.png",
    calico:     "assets/Calico Cat.png",
    colorpoint: "assets/Colorpoint Cat.png",
  };
  const RACER_COLORS = ["black", "grey", "white", "calico", "colorpoint"];
  const img = {};
  let assetsReady = false;

  Promise.all(Object.entries(SHEETS).map(([key, src]) => new Promise(res => {
    const im = new Image();
    im.onload = () => { img[key] = im; res(); };
    im.onerror = () => { res(); };   // keep going; missing sheet just won't draw
    im.src = src;
  }))).then(() => { assetsReady = true; });

  // ---------- food obstacle sprites (procedural pixel art) ----------
  // The classic cat-food lineup: whole fish, fishbone, open pate can,
  // kibble pile, kibble bag, wet food pouch.
  const PAL = {
    O: "#2e1e12",               // outline, matches the cats' outline tone
    S: "#cfcfcf", s: "#9d9d9d", // tin silver
    R: "#c0504a", W: "#f3eee3", F: "#4a6a8a", // can label red / cream / fish print
    B: "#d99a4e", D: "#a86a2e", // kibble bag orange / fold
    T: "#5aa3a0", E: "#3f7d7b", // wet food pouch teal / seal
    k: "#8a5a2e", K: "#5f3c1c", // kibble pellet light / dark
    P: "#e8958c", p: "#d6786e", // pate pink / shade
    b: "#7fa8c9", d: "#5b83a6", // fish body / back
    w: "#f0f4f7", e: "#1e1e1e", // fish belly / eye
    N: "#e8e2d0",               // bone white
  };
  function makeSprite(rows) {
    const w = rows[0].length, h = rows.length;
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");
    rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const col = PAL[row[x]];
        if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
      }
    });
    return { cv, w, h };
  }
  const SPR = {
    fish: makeSprite([         // whole fish, facing the runner
      "......OOOOOO........",
      "....OOddddddOO..OO..",
      "..OOddddddddddOOdO..",
      ".ObbbbbbbbbbbbbddO..",
      "ObebbbbbbbbbbbbbdO..",
      "ObbbbbbbbbbbbbbbddO.",
      ".OwwwwwwwwwwwwbbddO.",
      "..OOwwwwwwwwOObbdO..",
      "....OOwwwwOO..OOO...",
      "......OOOO..........",
    ]),
    fishbone: makeSprite([     // chunky bone-white skeleton
      "........OOO..OOO.....",
      "........ONO..ONO.....",
      "...OO...ONO..ONO.....",
      "..ONNO..ONO..ONO..OO.",
      ".ONNNNOOOOOOOOOOOOOO.",
      "ONeNNNNNNNNNNNNNNNNO.",
      ".ONNNNOOOOOOOOOOOOOO.",
      "..ONNO..ONO..ONO..OO.",
      "...OO...ONO..ONO.....",
      "........ONO..ONO.....",
      "........OOO..OOO.....",
    ]),
    can: makeSprite([          // open tin, pate dome, fish label
      "....OOOOOO....",
      "..OOPPPPPPOO..",
      ".OPPPPPPPPPPO.",
      ".OpPPPPPPPPpO.",
      "OSSSSSSSSSSSSO",
      "OssssssssssssO",
      "ORRRRRRRRRRRRO",
      "ORWWWWWWWWWWRO",
      "ORWFFFFFFWWWRO",
      "ORWWFFFFWWWWRO",
      "ORWWWWWWWWWWRO",
      "ORRRRRRRRRRRRO",
      "OssssssssssssO",
      ".OOOOOOOOOOOO.",
    ]),
    kibble: makeSprite([       // pyramid of dry kibble pellets
      "...OOOO..OOOO...",
      "...OkKO..OkKO...",
      "...OKkO..OKkO...",
      "OOOOOOOOOOOOOOOO",
      "OkKOOkKOOkKOOkKO",
      "OKkOOKkOOKkOOKkO",
      "OOOOOOOOOOOOOOOO",
    ]),
    bag: makeSprite([          // dry kibble bag, big fish label
      "..OOOOOOOOOOOO..",
      ".ODDDDDDDDDDDDO.",
      ".ODDDDDDDDDDDDO.",
      ".OBBBBBBBBBBBBO.",
      ".OBBBBBBBBBBBBO.",
      "OBBBBBBBBBBBBBBO",
      "OBBWWWWWWWWWWBBO",
      "OBWWWWWWWWWWWWBO",
      "OBWWWFFFFWWWWWBO",
      "OBWWFFFFFFWFWWBO",
      "OBWFeFFFFFFFFWBO",
      "OBWWFFFFFFWFWWBO",
      "OBWWWFFFFWWWWWBO",
      "OBBWWWWWWWWWWBBO",
      "OBBBBBBBBBBBBBBO",
      "OBBBBBBBBBBBBBBO",
      "OBBkBBkBBkBBkBBO",
      "OBBBBBBBBBBBBBBO",
      "OBBBBBBBBBBBBBBO",
      "OBBBBBBBBBBBBBBO",
      ".OBBBBBBBBBBBBO.",
      "..OOOOOOOOOOOO..",
    ]),
    pouch: makeSprite([        // wet food pouch, fish label
      ".OOOOOOOOOOO.",
      "OEEEEEEEEEEEO",
      "OTTTTTTTTTTTO",
      "OTWWWWWWWWWTO",
      "OTWWWWWWWWWTO",
      "OTWWFFFWWWWTO",
      "OTWFFFFFWFWTO",
      "OTWeFFFFFFWTO",
      "OTWFFFFFWFWTO",
      "OTWWFFFWWWWTO",
      "OTWWWWWWWWWTO",
      "OTTTTTTTTTTTO",
      "OTTTTTTTTTTTO",
      "OTTTTTTTTTTTO",
      "OTTTTTTTTTTTO",
      ".OOOOOOOOOOO.",
    ]),
  };
  // ---------- drawing helpers ----------
  // Draws frame f with its content-left edge at x and content-bottom at yBottom.
  // s = pixel scale; the background racers use a smaller one than the player.
  function drawFrame(sheet, f, x, yBottom, flip, s = SCALE) {
    const im = img[sheet];
    if (!im) return;
    const dy = yBottom - f.bb[3] * s;
    if (!flip) {
      ctx.drawImage(im, f.sx, f.sy, CELL, CELL,
        x - f.bb[0] * s, dy, CELL * s, CELL * s);
    } else {
      const cellLeft = x - (CELL - f.bb[2]) * s;
      ctx.save();
      ctx.translate(cellLeft + CELL * s, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(im, f.sx, f.sy, CELL, CELL, 0, 0, CELL * s, CELL * s);
      ctx.restore();
    }
  }

  // Tight content box in world coords (same for flipped sprites).
  function frameBox(f, x, yBottom) {
    const w = (f.bb[2] - f.bb[0]) * SCALE;
    const h = (f.bb[3] - f.bb[1]) * SCALE;
    return { x, y: yBottom - h, w, h };
  }

  function inset(b, i, topExtra = 0) {
    return { x: b.x + i, y: b.y + i + topExtra, w: b.w - 2 * i, h: b.h - 2 * i - topExtra };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---------- audio (tiny procedural blips, no asset files) ----------
  let audioCtx = null;
  function beep(freq, dur, type = "square", vol = 0.03, delay = 0) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t0 = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch (_) { /* audio is optional */ }
  }

  // ---------- theme (day / night) ----------
  const DAY   = { bg: [247, 243, 234], fg: [74, 59, 42] };
  const NIGHT = { bg: [24, 23, 38],    fg: [232, 226, 208] };
  let nightTarget = 0;   // 0 = day, 1 = night
  let night = 0;         // animated value

  function lerp(a, b, t) { return a + (b - a) * t; }
  function themeColor(day, nite) {
    const c = day.map((v, i) => Math.round(lerp(v, nite[i], night)));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  const bgColor = () => themeColor(DAY.bg, NIGHT.bg);
  const fgColor = () => themeColor(DAY.fg, NIGHT.fg);

  // ---------- game state ----------
  const player = {
    y: GROUND, vy: 0, grounded: true,
    ducking: false, animT: 0, state: "title", // title | starting | run | over
    overT: 0,
  };
  let obstacles = [];   // {kind, spr, x, alt, animT, phase}
  let clouds = [];
  let speed = SPEED0;   // reference units/s; multiply by f for real movement
  let score = 0;
  let hi = Number(localStorage.getItem(HI_KEY) || 0);
  let worldX = 0;
  let nextSpawn = 0;    // reference units of scroll until `pending` is placed
  let pending = null;   // the group that will spawn next, chosen in advance
  let tailArrival = 0;  // timeNow at which the last group finishes passing the cat
  let spawnLog = [];    // recent {name, gap} spawns, for tuning (see elmio.spawns)
  let cloudTimer = 0;
  let flashT = 0;             // score milestone flash
  let lastMilestone = 0;
  let overAt = 0;             // timestamp of death, for restart lockout
  let timeNow = 0;
  let jumpBuffer = 0;         // pressed jump slightly before landing

  // Scenery is laid out in world units, so it is rebuilt whenever the
  // viewport changes (see buildScenery).
  let STARS = [];
  let SPECKLES = [];
  let SPECKLE_STRIP = 1800;   // width of the tiled ground-speckle strip

  // ---------- background racers ----------
  // The other cat colors run along in the distance, each at its own depth:
  // depth 0 = just far enough (bigger, bolder, wide fast drift),
  // depth 1 = far far away (small, faint, high on the horizon, barely drifts).
  // Drawn far-to-near so closer cats overlap distant ones.
  // Identity (color, depth, drift) is fixed for the session; the screen-space
  // fields are recomputed by layoutRacers() on every resize.
  const racers = (() => {
    const picked = RACER_COLORS
      .map(sheet => ({ sheet, r: Math.random() }))
      .sort((a, b) => a.r - b.r);
    // one horizontal slot per cat (shuffled) so start positions are spread
    // out with a guaranteed gap instead of randomly bunching up
    const slots = picked
      .map((_, i) => ({ i, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(s => s.i);
    return picked
      .map((c, i, arr) => {
        const depth = i / (arr.length - 1);
        return {
          sheet: c.sheet,
          depth,
          scale: depth < 0.5 ? 2 : 1,
          alpha: 0.45 - depth * 0.22,
          slot: slots[i],
          jitter: Math.random(),
          ph: Math.random() * 6.28,
          ampBase: (25 + Math.random() * 45) * (1 - 0.55 * depth),
          wfreq: (0.18 + Math.random() * 0.2) * (1 - 0.4 * depth),
          baseX: 0, yB: 0, amp: 0,
        };
      })
      .sort((a, b) => b.depth - a.depth);
  })();

  function layoutRacers() {
    const slotW = Math.max(40, (W - 300) / racers.length);
    for (const r of racers) {
      r.baseX = 130 * f + r.slot * slotW + r.jitter * Math.max(0, slotW - 60);
      r.yB = GROUND - 10 - r.depth * 20;
      r.amp = r.ampBase * f;
    }
  }

  function drawRacers() {
    const anim = player.state === "run" ? "run" : "sitIdle";
    for (const r of racers) {
      const x = r.baseX + Math.sin(timeNow * r.wfreq + r.ph) * r.amp;
      ctx.globalAlpha = r.alpha;
      drawFrame(r.sheet, animFrame(anim, timeNow + r.ph), x, r.yB, false, r.scale);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- layout ----------
  function buildScenery() {
    const rs = seeded(42);
    STARS = [];
    for (let i = 0; i < 22; i++)
      STARS.push({ x: rs() * W, y: GROUND * (0.05 + rs() * 0.45), p: rs() * 6 });

    const rk = seeded(7);
    SPECKLE_STRIP = Math.max(1200, W * 2);
    const band = Math.max(4, H - GROUND - 8);
    SPECKLES = [];
    for (let i = 0; i < 80; i++)
      SPECKLES.push({ x: rk() * SPECKLE_STRIP, y: rk() * band, w: 3 + rk() * 8 });

    layoutRacers();
  }

  // Fits the unit grid to whatever CSS box the stage ended up with, keeping
  // the aspect ratio exact so nothing is stretched.
  function layout() {
    const cssW = Math.max(1, stage.clientWidth);
    const cssH = Math.max(1, stage.clientHeight);
    const prevW = W, prevH = H, prevGround = GROUND;

    // Runway: phones get a tighter camera, tablets and up get the full 900.
    let w = clamp(cssW * 1.8, RUNWAY_MIN, RUNWAY_MAX);
    let h = w * cssH / cssW;
    if (h < WORLD_H_MIN) {                      // short viewport: zoom out
      w = WORLD_H_MIN * cssW / cssH;
    } else if (h > WORLD_H_MAX) {               // tall viewport: trim dead sky
      w = Math.max(RUNWAY_FLOOR, WORLD_H_MAX * cssW / cssH);
    }

    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    canvas.width  = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));

    W = w;
    ppu = canvas.width / W;
    H = canvas.height / ppu;                    // exact, no distortion
    GROUND = Math.round(H - clamp(H * 0.12, 24, 50));
    f = W / REF_W;
    U = W / cssW;

    // Carry a game in progress over to the new grid instead of restarting it.
    const k = W / prevW;
    for (const o of obstacles) o.x *= k;
    for (const c of clouds) { c.x *= k; c.y *= H / prevH; c.s *= k; }
    worldX *= k;
    player.vy *= k;
    player.y = player.grounded ? GROUND : player.y + (GROUND - prevGround);

    buildScenery();
  }

  function reset() {
    obstacles = [];
    speed = SPEED0;
    score = 0;
    worldX = 0;
    lastMilestone = 0;
    flashT = 0;
    jumpBuffer = 0;
    nightTarget = 0;
    player.y = GROUND; player.vy = 0; player.grounded = true;
    player.ducking = false; player.animT = 0;
    player.state = "run";
    spawnLog = [];
    tailArrival = timeNow + 1.6;   // a beat of empty road to get going
    scheduleNext();
  }

  // ---------- obstacles (cat food) ----------
  // Flying altitude = height of the food's bottom above the ground before the
  // ±4 bob (foodBottom adds 8 more). Tuned against the hitboxes so that:
  //   LOW  -> must be jumped
  //   MID  -> always hits an upright runner, always clears a ducking cat
  //           (its box bottom sits 33-41 units up, the duck box tops out at 28)
  //   HIGH -> sails overhead: do nothing (fake-out)
  const FLY_LOW = 2, FLY_MID = 25, FLY_HIGH = 44;
  const FLYER_SPEED = 1.6;       // flyers close in faster than the ground scrolls
  const PLAYER_W = 44;           // width of the player's hitbox
  const REACH = PLAYERX + 5 + PLAYER_W;   // x of its leading edge
  const spawnX = () => W + 40;

  function addFood(spr, x) {
    obstacles.push({ kind: "food", spr, x, yOff: 0, animT: 0, phase: 0 });
  }
  function addFlyer(spr, x, alt, phase) {
    obstacles.push({ kind: "fly", spr, x, alt, animT: 0, phase });
  }

  // A pattern lays its group out from x rightwards and returns the group width.
  const row = (spr, n, gap) => x => {
    const step = spr.w * SCALE + gap;
    for (let i = 0; i < n; i++) addFood(spr, x + i * step);
    return (n - 1) * step + spr.w * SCALE;
  };
  // spr = null glides as a plain fish; passing a sprite glides that instead.
  const flock = (alt, n, spr = null) => x => {
    const w = (spr || SPR.fish).w * SCALE, step = w + 8;
    const phase = Math.random() * 6.28;    // one shared bob, so a flock reads as a flock
    for (let i = 0; i < n; i++) addFlyer(spr, x + i * step, alt, phase);
    return (n - 1) * step + w;
  };

  // Weighted spawn table. `from` gates a pattern behind a score so the opening
  // is calm and the duck-heavy groups arrive as the cat warms up; `duck` marks
  // the ones that have to be slid under. A wide flock at head height cannot be
  // jumped (the arc can't span it while staying above it), so ducking is the
  // only answer to those.
  const PATTERNS = [
    // --- on the ground: jump over ---
    { name: "fish",      w: 9, make: row(SPR.fish, 1, 0) },
    { name: "fish2",     w: 7, make: row(SPR.fish, 2, 6) },
    // three only once the scroll is fast enough for a tapped (cut-short) jump
    // to still clear the whole school
    { name: "fish3",     w: 4, minSpeed: 480, make: row(SPR.fish, 3, 6) },
    { name: "can",       w: 6, make: row(SPR.can, 1, 0) },
    { name: "can2",      w: 4, make: row(SPR.can, 2, 8) },
    { name: "bag",       w: 6, make: row(SPR.bag, 1, 0) },
    { name: "pouch",     w: 5, make: row(SPR.pouch, 1, 0) },
    { name: "kibble",    w: 5, make: row(SPR.kibble, 1, 0) },
    { name: "bone",      w: 3, make: row(SPR.fishbone, 1, 0) },
    // --- airborne ---
    { name: "flyLow",    w: 10, air: 1, from: 50,  make: flock(FLY_LOW, 1) },
    { name: "flyMid",    w: 18, air: 1, from: 50,  duck: 1, make: flock(FLY_MID, 1) },
    { name: "flyBone",   w: 10, air: 1, from: 90,  duck: 1, make: flock(FLY_MID, 1, SPR.fishbone) },
    { name: "flyMid2",   w: 14, air: 1, from: 160, duck: 1, make: flock(FLY_MID, 2) },
    { name: "flyMid3",   w: 10, air: 1, from: 320, duck: 1, make: flock(FLY_MID, 3) },
    { name: "flyBone2",  w: 8, air: 1, from: 420, duck: 1, make: flock(FLY_MID, 2, SPR.fishbone) },
    { name: "flyHigh",   w: 8, air: 1, from: 110, make: flock(FLY_HIGH, 1) },
  ];

  function pickPattern() {
    let total = 0;
    for (const p of PATTERNS)
      if (score >= (p.from || 0) && speed >= (p.minSpeed || 0)) total += p.w;
    let r = Math.random() * total;
    let last = PATTERNS[0];
    for (const p of PATTERNS) {
      if (score < (p.from || 0) || speed < (p.minSpeed || 0)) continue;
      last = p;
      if ((r -= p.w) <= 0) return p;
    }
    return last;
  }

  // Breathing room between one group finishing its pass and the next one
  // arriving, in seconds. Three buckets rather than one flat range, so the
  // rhythm keeps shifting: back-to-back, cruising, then room to breathe.
  const MIN_WAIT = 0.18;         // s, keeps two groups from spawning on top of each other
  function gapSeconds() {
    const r = Math.random();
    if (r < 0.30) return 0.70 + Math.random() * 0.25;
    if (r < 0.82) return 1.05 + Math.random() * 0.60;
    return 1.90 + Math.random() * 1.00;
  }

  // The next group is chosen up front so the wait can be solved for the gap the
  // player actually feels. A plain distance timer gets this wrong twice over:
  // flyers close in 25% faster than the ground scrolls, and a wide group takes
  // much longer to finish passing than a single fish.
  function scheduleNext() {
    pending = pickPattern();
    const vx = speed * f * (pending.air ? FLYER_SPEED : 1);
    const noseTravel = (spawnX() - REACH) / vx;                       // s
    const gap = gapSeconds();
    const wait = Math.max(MIN_WAIT, tailArrival + gap - timeNow - noseTravel);
    nextSpawn = wait * speed;    // drained at the reference speed: same on every screen
    pending.gap = gap;
  }

  function spawnPending() {
    const p = pending || pickPattern();
    const vx = speed * f * (p.air ? FLYER_SPEED : 1);
    const x = spawnX();
    const width = p.make(x);
    const nose = timeNow + (x - REACH) / vx;
    tailArrival = nose + (width + PLAYER_W) / vx;
    spawnLog.push({ name: p.name, gap: +(p.gap || 0).toFixed(2), score: Math.floor(score) });
    if (spawnLog.length > 60) spawnLog.shift();
    scheduleNext();
  }

  function foodSprite(o) {
    if (o.kind === "fly" && !o.spr) return SPR.fish;
    return o.spr;
  }

  function foodBottom(o) {
    if (o.kind === "fly")
      return GROUND - o.alt - 8 + Math.sin(timeNow * 3 + o.phase) * 4;
    return GROUND - (o.yOff || 0);
  }

  function foodBox(o) {
    const spr = foodSprite(o);
    const yB = foodBottom(o);
    return { x: o.x + 4, y: yB - spr.h * SCALE + 4, w: spr.w * SCALE - 8, h: spr.h * SCALE - 8 };
  }

  // ---------- player boxes ----------
  function playerFrame() {
    if (player.state === "title")    return animFrame("sitIdle", player.animT);
    if (player.state === "starting") return animFrameOnce("standUp", player.animT);
    if (player.state === "over") {
      return animDone("toSleep", player.overT)
        ? animFrame("sleep", player.overT)
        : animFrameOnce("toSleep", player.overT);
    }
    if (!player.grounded) {
      if (player.vy < -140 * f) return F.crouch;
      if (player.vy > 140 * f)  return F.tuck;
      return F.stretch;
    }
    return player.ducking ? animFrame("duck", player.animT)
                          : animFrame("run", player.animT);
  }

  function playerHitbox(f) {
    const b = frameBox(f, PLAYERX, player.y);
    // Ducking: the crouch frames are shorter than a run frame; keep the box a
    // fixed 26 units tall (dino-style mercy: the ears can graze a flier).
    if (player.grounded && player.ducking) return inset(b, 5, Math.max(0, b.h - 36));
    return inset(b, 5);
  }

  // ---------- input ----------
  let touchMode = matchMedia("(hover: none) and (pointer: coarse)").matches ||
                  navigator.maxTouchPoints > 0;

  function haptic(ms) {
    if (touchMode && navigator.vibrate) { try { navigator.vibrate(ms); } catch (_) {} }
  }

  function doJump() {
    player.vy = JUMP_V * f;          // arc height stays put, air time scales 1/f
    player.grounded = false;
    player.ducking = false;
    jumpBuffer = 0;
    beep(560, 0.08);
    haptic(8);
  }

  function jumpAction() {
    if (!assetsReady) return;
    if (player.state === "title") {
      player.state = "starting";
      player.animT = 0;
      beep(700, 0.07);
      return;
    }
    if (player.state === "over") {
      if (performance.now() - overAt > 500) { reset(); beep(700, 0.07); }
      return;
    }
    if (player.state !== "run") return;
    if (player.grounded) doJump();
    else jumpBuffer = JUMP_BUFFER;   // land-and-go grace for laggy touchscreens
  }

  function jumpRelease() {
    if (!player.grounded && player.vy < JUMP_CUT * f) player.vy = JUMP_CUT * f;
  }

  function duckPress() {
    if (player.state !== "run") { jumpAction(); return; }   // start / restart
    player.ducking = true;
    haptic(6);
  }
  function duckRelease() { player.ducking = false; }

  window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") jumpAction();
    if (e.code === "ArrowDown" || e.code === "KeyS") duckPress();
  });
  window.addEventListener("keyup", e => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") jumpRelease();
    if (e.code === "ArrowDown" || e.code === "KeyS") duckRelease();
  });

  // Tapping/clicking anywhere in the play field jumps; ducking is the DUCK
  // pad or the down arrow, so there is no invisible half-screen to mis-hit.
  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    if (e.pointerType === "touch") { touchMode = true; document.body.classList.add("touch"); }
    jumpAction();
  });
  canvas.addEventListener("pointerup", jumpRelease);
  canvas.addEventListener("pointercancel", jumpRelease);
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  // Hold-style pads. Pointer capture keeps the hold alive even if the thumb
  // slides off the button, and guarantees we always see the release.
  function bindPad(el, onDown, onUp) {
    if (!el) return;
    const release = () => {
      if (!el.classList.contains("on")) return;
      el.classList.remove("on");
      onUp();
    };
    el.addEventListener("pointerdown", e => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.classList.add("on");
      onDown();
    });
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    el.addEventListener("contextmenu", e => e.preventDefault());
  }
  bindPad(document.getElementById("btn-jump"), jumpAction, jumpRelease);
  bindPad(document.getElementById("btn-duck"), duckPress, duckRelease);

  // ---------- update ----------
  function die() {
    player.state = "over";
    player.overT = 0;
    player.ducking = false;
    jumpBuffer = 0;
    overAt = performance.now();
    if (score > hi) {
      hi = Math.floor(score);
      localStorage.setItem(HI_KEY, hi);
    }
    beep(160, 0.3, "sawtooth", 0.05);
    haptic(35);
  }

  function update(dt) {
    timeNow += dt;
    // day/night crossfade
    night += Math.sign(nightTarget - night) * Math.min(dt / 1.2, Math.abs(nightTarget - night));

    player.animT += dt;

    if (player.state === "starting" && animDone("standUp", player.animT)) reset();

    if (player.state === "over") { player.overT += dt; return; }
    if (player.state !== "run") return;

    const vx = speed * f;        // real scroll speed in world units/s

    // physics
    if (jumpBuffer > 0) jumpBuffer -= dt;
    if (!player.grounded) {
      player.vy += (player.ducking ? FASTFALL : GRAVITY) * f * f * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND) {
        player.y = GROUND;
        player.vy = 0;
        player.grounded = true;
        if (jumpBuffer > 0) doJump();
      }
    }

    // world
    speed = Math.min(SPEEDMAX, speed + SPEEDUP * dt);
    worldX += vx * dt;
    score += speed * dt * 0.025;   // reference speed: scores compare across devices

    // milestone flash + jingle
    const ms = Math.floor(score / 100);
    if (ms > 0 && ms !== lastMilestone) {
      lastMilestone = ms;
      flashT = 1.2;
      beep(780, 0.08); beep(1040, 0.1, "square", 0.03, 0.1);
    }
    if (flashT > 0) flashT -= dt;

    // day/night flip
    nightTarget = Math.floor(score / NIGHT_EVERY) % 2;

    // obstacles
    nextSpawn -= speed * dt;
    if (nextSpawn <= 0) spawnPending();
    for (const o of obstacles) {
      o.animT += dt;
      o.x -= vx * dt * (o.kind === "fly" ? FLYER_SPEED : 1);
    }
    obstacles = obstacles.filter(o => o.x > -140);

    // clouds (day scenery)
    cloudTimer -= dt;
    if (cloudTimer <= 0) {
      clouds.push({ x: W + 60, y: GROUND * (0.08 + Math.random() * 0.38),
                    s: (0.55 + Math.random() * 0.7) * f });
      cloudTimer = 2.5 + Math.random() * 4;
    }
    for (const c of clouds) c.x -= vx * 0.15 * dt;
    clouds = clouds.filter(c => c.x > -160);

    // collision
    const pb = playerHitbox(playerFrame());
    for (const o of obstacles) {
      if (overlaps(pb, foodBox(o))) { die(); break; }
    }
  }

  // ---------- render ----------
  function drawGround() {
    ctx.fillStyle = fgColor();
    ctx.fillRect(0, GROUND + 2, W, 2);
    const off = worldX % SPECKLE_STRIP;
    ctx.globalAlpha = 0.5;
    for (const s of SPECKLES) {
      let x = s.x - off;
      if (x < -20) x += SPECKLE_STRIP;
      if (x > W + 20) continue;
      ctx.fillRect(x, GROUND + 5 + s.y, s.w, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawSky() {
    // clouds fade out at night, stars fade in
    if (night < 0.99) {
      ctx.fillStyle = fgColor();
      for (const c of clouds) {
        ctx.globalAlpha = 0.14 * (1 - night);
        const w = 70 * c.s, h = 16 * c.s;
        ctx.fillRect(c.x, c.y, w, h);
        ctx.fillRect(c.x + w * 0.2, c.y - h * 0.5, w * 0.5, h * 0.6);
      }
      ctx.globalAlpha = 1;
    }
    if (night > 0.01) {
      ctx.fillStyle = fgColor();
      for (const s of STARS) {
        ctx.globalAlpha = night * (0.4 + 0.6 * Math.abs(Math.sin(timeNow * 1.5 + s.p)));
        ctx.fillRect(s.x, s.y, 3, 3);
      }
      // crescent moon
      // low enough that it never sits behind the score on a narrow screen
      const mx = W - Math.min(120, W * 0.16), my = GROUND * 0.26, mr = 20 * f + 4;
      ctx.globalAlpha = night * 0.9;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = bgColor();
      ctx.beginPath();
      ctx.arc(mx + mr * 0.45, my - mr * 0.32, mr * 0.86, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // UI text is sized in CSS pixels (via U) so it stays legible on a phone
  // even though the world around it is measured in units.
  function uiFont(cssPx, weight = "") {
    ctx.font = `${weight} ${Math.max(9, cssPx * U)}px 'Courier New', monospace`.trim();
  }

  function drawHUD() {
    ctx.fillStyle = fgColor();
    uiFont(14);
    ctx.textAlign = "right";
    const margin = 14 * U;
    const baseline = 12 * U + 14 * U;
    const s = String(Math.floor(score)).padStart(5, "0");
    const showScore = flashT <= 0 || Math.floor(flashT * 6) % 2 === 0;
    if (showScore) ctx.fillText(s, W - margin, baseline);
    if (hi > 0) {
      ctx.globalAlpha = 0.55;
      ctx.fillText("HI " + String(hi).padStart(5, "0"),
        W - margin - ctx.measureText(s).width - 12 * U, baseline);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }

  function drawCenterText(title, sub) {
    ctx.fillStyle = fgColor();
    ctx.textAlign = "center";
    const maxW = W * 0.9;
    const y = Math.round(H * 0.34);

    uiFont(23, "bold");
    let tw = ctx.measureText(title).width;
    if (tw > maxW) uiFont(23 * maxW / tw, "bold");
    ctx.fillText(title, W / 2, y);

    if (sub) {
      uiFont(13);
      let sw = ctx.measureText(sub).width;
      if (sw > maxW) uiFont(13 * maxW / sw);
      ctx.globalAlpha = 0.75;
      ctx.fillText(sub, W / 2, y + 26 * U);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }

  function render() {
    ctx.setTransform(ppu, 0, 0, ppu, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = bgColor();
    ctx.fillRect(0, 0, W, H);

    drawSky();
    drawGround();

    if (!assetsReady) {
      drawCenterText("LOADING…");
      return;
    }

    drawRacers();

    // obstacles
    for (const o of obstacles) {
      const spr = foodSprite(o);
      const yB = foodBottom(o);
      ctx.drawImage(spr.cv, o.x, yB - spr.h * SCALE, spr.w * SCALE, spr.h * SCALE);
    }

    drawFrame("orange", playerFrame(), PLAYERX, player.y, false);

    drawHUD();

    if (player.state === "title") {
      drawCenterText("E L M I O   R U N",
        touchMode ? "tap to start" : "press SPACE to start");
    } else if (player.state === "over") {
      drawCenterText("G A M E   O V E R",
        touchMode ? "tap to try again" : "press SPACE to try again");
    }
  }

  // ---------- viewport plumbing ----------
  let layoutQueued = 0;
  function scheduleLayout() {
    if (layoutQueued) return;
    layoutQueued = requestAnimationFrame(() => { layoutQueued = 0; layout(); });
  }
  window.addEventListener("resize", scheduleLayout);
  window.addEventListener("orientationchange", scheduleLayout);
  document.addEventListener("fullscreenchange", scheduleLayout);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", scheduleLayout);
  if (window.ResizeObserver) new ResizeObserver(scheduleLayout).observe(stage);

  // Mobile browser chrome eats a lot of a landscape screen; offer a way out.
  // Desktop has F11, so the button is a touch-only affordance.
  const fsBtn = document.getElementById("fullscreen");
  const canFullscreen = !!document.documentElement.requestFullscreen;

  function enterTouchMode() {
    touchMode = true;
    document.body.classList.add("touch");
    if (fsBtn && canFullscreen) fsBtn.hidden = false;
  }
  if (touchMode) enterTouchMode();
  window.addEventListener("touchstart", enterTouchMode, { once: true, passive: true });

  if (fsBtn && canFullscreen) {
    fsBtn.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      fsBtn.blur();
    });
  }

  // ---------- main loop ----------
  let lastT = null;
  function loop(t) {
    if (lastT === null) lastT = t;
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", () => { lastT = null; });

  layout();
  requestAnimationFrame(loop);

  // dev hook: e.g. `elmio.score = 495` in the console to preview night mode
  window.elmio = {
    get score()  { return score; },
    set score(v) { score = v; },
    get state()  { return player.state; },
    get speed()  { return speed; },
    get ducking(){ return player.ducking; },
    get world()  { return { W, H, GROUND, f, U, ppu, css: [stage.clientWidth, stage.clientHeight] }; },
    duck(on)     { player.ducking = !!on; },
    jump()       { jumpAction(); },
    relayout()   { layout(); },
    tick(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); },
    get spawns() { return spawnLog.slice(); },
    get patterns() {
      return PATTERNS.map(p => ({ name: p.name, weight: p.w, from: p.from || 0,
                                  duck: !!p.duck, air: !!p.air }));
    },
    get debug() {
      return {
        player: playerHitbox(playerFrame()), y: player.y, grounded: player.grounded,
        obstacles: obstacles.map(o => ({ kind: o.kind, x: Math.round(o.x), box: foodBox(o) })),
      };
    },
  };
})();
