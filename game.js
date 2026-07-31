/* ============================================================
   ELMIO RUN — a Chrome-dino-style endless runner
   starring the orange cat from the Cat Sprites animation set.

   All drawn imagery comes from the 6 cat sprite sheets in
   /assets (player = orange cat, obstacles = the other cats).
   Ground, clouds, stars and text are procedural canvas shapes.
   ============================================================ */

(() => {
  "use strict";

  // ---------- canvas ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;   // 900
  const H = canvas.height;  // 260
  ctx.imageSmoothingEnabled = false;

  // ---------- constants ----------
  const SCALE   = 3;          // sprite px -> canvas px
  const GROUND  = 225;        // y of the ground line (feet baseline)
  const PLAYERX = 70;         // player content-left x
  const GRAVITY = 1900;       // px/s^2
  const FASTFALL= 3900;       // gravity while holding duck in the air
  const JUMP_V  = -660;       // jump impulse px/s
  const JUMP_CUT= -260;       // vy clamp when jump released early
  const SPEED0  = 340;        // starting scroll speed px/s
  const SPEEDMAX= 820;
  const SPEEDUP = 5.2;        // px/s gained per second
  const NIGHT_EVERY = 500;    // score interval for day/night flip
  const HI_KEY  = "elmio-run.hi";

  // ---------- sprite sheet metadata ----------
  // Every sheet is a 128x256 PNG on a 4x8 grid of 32x32 cells.
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
    run:      { frames: ["stand1", "stand3", "stand2", "crouch"], fps: 10 },
    duck:     { frames: ["lay3", "lay2", "lay4", "lay2"],         fps: 8  },
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
    orange:     "assets/Orange Cat.png",
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
  function rot90(spr) {
    const cv = document.createElement("canvas");
    cv.width = spr.h; cv.height = spr.w;
    const c = cv.getContext("2d");
    c.translate(spr.h, 0); c.rotate(Math.PI / 2);
    c.drawImage(spr.cv, 0, 0);
    return { cv, w: spr.h, h: spr.w };
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
  SPR.fishSpin = [SPR.fish];
  for (let i = 0; i < 3; i++) SPR.fishSpin.push(rot90(SPR.fishSpin[i]));

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

  // Duck pose: the laying frames keep the cat's head raised, so drawn as-is
  // they are as tall as the run pose. Slice at the neck (all three duck
  // frames share identical head/body pixels): head stays 1:1, only the
  // body is squashed flat. The sheet has no true crouch-run frame.
  const DUCK_NECK = 18;      // cell row where the raised head meets the body
  const DUCK_BODY_SQ = 0.55; // vertical squash applied to the body slice
  function drawDuck(f, x, yBottom) {
    const im = img.orange;
    if (!im) return;
    const S = SCALE;
    const bodyRows = f.bb[3] - DUCK_NECK;
    const headRows = DUCK_NECK - f.bb[1];
    const bodyH = bodyRows * S * DUCK_BODY_SQ;
    ctx.drawImage(im, f.sx, f.sy + DUCK_NECK, CELL, bodyRows,
      x - f.bb[0] * S, yBottom - bodyH, CELL * S, bodyH);
    ctx.drawImage(im, f.sx, f.sy + f.bb[1], CELL, headRows,
      x - f.bb[0] * S, yBottom - bodyH - headRows * S, CELL * S, headRows * S);
  }

  // Tight content box in canvas coords (same for flipped sprites).
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

  // Stars: fixed, pseudo-random positions (seeded so they don't jitter).
  const STARS = [];
  { let s = 42;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 20; i++) STARS.push({ x: rnd() * W, y: 15 + rnd() * 110, p: rnd() * 6 });
  }

  // ---------- game state ----------
  const player = {
    y: GROUND, vy: 0, grounded: true,
    ducking: false, animT: 0, state: "title", // title | starting | run | over
    overT: 0,
  };
  let obstacles = [];   // {kind, sheet, x, alt, animT, phase}
  let clouds = [];
  let speed = SPEED0;
  let score = 0;
  let hi = Number(localStorage.getItem(HI_KEY) || 0);
  let worldX = 0;
  let nextSpawn = 600;
  let cloudTimer = 0;
  let flashT = 0;             // score milestone flash
  let lastMilestone = 0;
  let overAt = 0;             // timestamp of death, for restart lockout
  let timeNow = 0;

  // Ground speckles: one seeded strip, tiled.
  const SPECKLES = [];
  { let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++)
      SPECKLES.push({ x: rnd() * 1800, y: 8 + rnd() * 22, w: 3 + rnd() * 8 });
  }

  function reset() {
    obstacles = [];
    speed = SPEED0;
    score = 0;
    worldX = 0;
    nextSpawn = 600;
    lastMilestone = 0;
    flashT = 0;
    nightTarget = 0;
    player.y = GROUND; player.vy = 0; player.grounded = true;
    player.ducking = false; player.animT = 0;
    player.state = "run";
  }

  // ---------- obstacles (cat food) ----------
  // Flying-fish altitude = base height of the fish's bottom above the ground
  // (foodBottom adds 8 and a ±4 bob). Tuned against the hitboxes so that:
  //   2  -> must jump over
  //   25 -> always hits an upright runner, always clears a ducking cat
  //   44 -> sails overhead: do nothing (fake-out)
  const FLYER_ALTS = [2, 25, 44];

  function spawnObstacle() {
    const r = Math.random();
    if (score > 120 && r < 0.28) {
      const altR = Math.random();
      const alt = FLYER_ALTS[altR < 0.4 ? 0 : altR < 0.8 ? 1 : 2];
      obstacles.push({ kind: "flyFish", x: W + 40, alt,
                       animT: 0, phase: Math.random() * 6.28 });
    } else {
      const at = (spr, dx) =>
        obstacles.push({ kind: "food", spr, x: W + 40 + dx, yOff: 0, animT: 0, phase: 0 });
      const fishStep = SPR.fish.w * SCALE + 6;
      const g = Math.random();
      if (g < 0.22)      at(SPR.fish, 0);
      else if (g < 0.34) { at(SPR.fish, 0); at(SPR.fish, fishStep); }
      else if (g < 0.42 && speed > 450) { for (let i = 0; i < 3; i++) at(SPR.fish, i * fishStep); }
      else if (g < 0.52) at(SPR.can, 0);
      else if (g < 0.62) { at(SPR.can, 0); at(SPR.can, SPR.can.w * SCALE + 8); }
      else if (g < 0.74) at(SPR.bag, 0);
      else if (g < 0.84) at(SPR.pouch, 0);
      else if (g < 0.93) at(SPR.kibble, 0);
      else               at(SPR.fishbone, 0);
    }
    nextSpawn = (0.75 + Math.random() * 0.75) * speed + 200;
  }

  function foodSprite(o) {
    return o.kind === "flyFish" ? SPR.fishSpin[Math.floor(o.animT * 8) % 4] : o.spr;
  }

  function foodBottom(o) {
    if (o.kind === "flyFish")
      return GROUND - o.alt - 8 + Math.sin(timeNow * 3 + o.phase) * 4;
    return GROUND - (o.yOff || 0);
  }

  function foodBox(o) {
    const spr = foodSprite(o);
    const yB = foodBottom(o);
    return { x: o.x + 4, y: yB - spr.h * SCALE + 4, w: spr.w * SCALE - 8, h: spr.h * SCALE - 8 };
  }

  // ---------- background racers ----------
  // The other cat colors run along in the distance, each at its own depth:
  // depth 0 = just far enough (bigger, bolder, wide fast drift),
  // depth 1 = far far away (small, faint, high on the horizon, barely drifts).
  // Drawn far-to-near so closer cats overlap distant ones.
  const racers = (() => {
    const picked = RACER_COLORS
      .map(sheet => ({ sheet, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, 5);
    // one horizontal slot per cat (shuffled) so start positions are spread
    // out with a guaranteed gap instead of randomly bunching up
    const slots = picked
      .map((_, i) => ({ i, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(s => s.i);
    const slotW = (W - 300) / picked.length;
    return picked
      .map((c, i, arr) => {
        const depth = i / (arr.length - 1);
        return {
          sheet: c.sheet,
          depth,
          scale: depth < 0.5 ? 2 : 1,
          yB: GROUND - 10 - depth * 20,
          alpha: 0.45 - depth * 0.22,
          baseX: 130 + slots[i] * slotW + Math.random() * (slotW - 60),
          ph: Math.random() * 6.28,
          amp: (25 + Math.random() * 45) * (1 - 0.55 * depth),
          wfreq: (0.18 + Math.random() * 0.2) * (1 - 0.4 * depth),
        };
      })
      .sort((a, b) => b.depth - a.depth);
  })();

  function drawRacers() {
    const anim = player.state === "run" ? "run" : "sitIdle";
    for (const r of racers) {
      const x = r.baseX + Math.sin(timeNow * r.wfreq + r.ph) * r.amp;
      ctx.globalAlpha = r.alpha;
      drawFrame(r.sheet, animFrame(anim, timeNow + r.ph), x, r.yB, false, r.scale);
    }
    ctx.globalAlpha = 1;
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
      if (player.vy < -140) return F.crouch;
      if (player.vy > 140)  return F.tuck;
      return F.stretch;
    }
    return player.ducking ? animFrame("duck", player.animT)
                          : animFrame("run", player.animT);
  }

  function playerHitbox(f) {
    const b = frameBox(f, PLAYERX, player.y);
    // Ducking: ignore the raised head/ears — body-only box (dino-style mercy).
    if (player.grounded && player.ducking) return inset(b, 5, 21);
    return inset(b, 5);
  }

  // ---------- input ----------
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
    if (player.state === "run" && player.grounded && !player.ducking) {
      player.vy = JUMP_V;
      player.grounded = false;
      beep(560, 0.08);
    }
  }
  function jumpRelease() {
    if (!player.grounded && player.vy < JUMP_CUT) player.vy = JUMP_CUT;
  }

  window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") jumpAction();
    if (e.code === "ArrowDown" || e.code === "KeyS") player.ducking = true;
  });
  window.addEventListener("keyup", e => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") jumpRelease();
    if (e.code === "ArrowDown" || e.code === "KeyS") player.ducking = false;
  });

  // Touch: bottom 40% of the canvas = hold to duck, elsewhere = jump.
  let duckTouchId = null;
  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const y = (t.clientY - rect.top) / rect.height;
      if (y > 0.6 && player.state === "run") {
        player.ducking = true;
        duckTouchId = t.identifier;
      } else {
        jumpAction();
      }
    }
  }, { passive: false });
  canvas.addEventListener("touchend", e => {
    for (const t of e.changedTouches) {
      if (t.identifier === duckTouchId) { player.ducking = false; duckTouchId = null; }
      else jumpRelease();
    }
  });
  canvas.addEventListener("mousedown", () => jumpAction());
  window.addEventListener("mouseup", () => jumpRelease());

  // ---------- update ----------
  function die() {
    player.state = "over";
    player.overT = 0;
    player.ducking = false;
    overAt = performance.now();
    if (score > hi) {
      hi = Math.floor(score);
      localStorage.setItem(HI_KEY, hi);
    }
    beep(160, 0.3, "sawtooth", 0.05);
  }

  function update(dt) {
    timeNow += dt;
    // day/night crossfade
    night += Math.sign(nightTarget - night) * Math.min(dt / 1.2, Math.abs(nightTarget - night));

    player.animT += dt;

    if (player.state === "starting" && animDone("standUp", player.animT)) reset();

    if (player.state === "over") { player.overT += dt; return; }
    if (player.state !== "run") return;

    // physics
    if (!player.grounded) {
      player.vy += (player.ducking ? FASTFALL : GRAVITY) * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND) {
        player.y = GROUND;
        player.vy = 0;
        player.grounded = true;
      }
    }

    // world
    speed = Math.min(SPEEDMAX, speed + SPEEDUP * dt);
    worldX += speed * dt;
    score += speed * dt * 0.025;

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
    if (nextSpawn <= 0) spawnObstacle();
    for (const o of obstacles) {
      o.animT += dt;
      o.x -= speed * dt * (o.kind === "flyFish" ? 1.25 : 1);
    }
    obstacles = obstacles.filter(o => o.x > -120);

    // clouds (day scenery)
    cloudTimer -= dt;
    if (cloudTimer <= 0) {
      clouds.push({ x: W + 60, y: 25 + Math.random() * 80, s: 0.55 + Math.random() * 0.7 });
      cloudTimer = 2.5 + Math.random() * 4;
    }
    for (const c of clouds) c.x -= speed * 0.15 * dt;
    clouds = clouds.filter(c => c.x > -140);

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
    const off = worldX % 1800;
    for (const s of SPECKLES) {
      let x = s.x - off;
      if (x < -20) x += 1800;
      if (x > W + 20) continue;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, GROUND + 4 + s.y * 0.6, s.w, 2);
      ctx.globalAlpha = 1;
    }
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
      ctx.globalAlpha = night * 0.9;
      ctx.beginPath();
      ctx.arc(W - 120, 55, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = bgColor();
      ctx.beginPath();
      ctx.arc(W - 110, 48, 19, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    ctx.fillStyle = fgColor();
    ctx.font = "16px 'Courier New', monospace";
    ctx.textAlign = "right";
    const s = String(Math.floor(score)).padStart(5, "0");
    const showScore = flashT <= 0 || Math.floor(flashT * 6) % 2 === 0;
    if (showScore) ctx.fillText(s, W - 20, 30);
    if (hi > 0) {
      ctx.globalAlpha = 0.55;
      ctx.fillText("HI " + String(hi).padStart(5, "0"), W - 110, 30);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }

  function drawCenterText(lines) {
    ctx.fillStyle = fgColor();
    ctx.textAlign = "center";
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillText(lines[0], W / 2, 95);
    if (lines[1]) {
      ctx.font = "14px 'Courier New', monospace";
      ctx.globalAlpha = 0.75;
      ctx.fillText(lines[1], W / 2, 122);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }

  function render() {
    ctx.fillStyle = bgColor();
    ctx.fillRect(0, 0, W, H);

    drawSky();
    drawGround();

    if (!assetsReady) {
      drawCenterText(["LOADING…"]);
      return;
    }

    drawRacers();

    // obstacles
    for (const o of obstacles) {
      const spr = foodSprite(o);
      const yB = foodBottom(o);
      ctx.drawImage(spr.cv, o.x, yB - spr.h * SCALE, spr.w * SCALE, spr.h * SCALE);
    }

    // player (ducking flattens the body but keeps the head at full size)
    const ducked = player.state === "run" && player.grounded && player.ducking;
    if (ducked) drawDuck(playerFrame(), PLAYERX, player.y);
    else drawFrame("orange", playerFrame(), PLAYERX, player.y, false);

    drawHUD();

    if (player.state === "title") {
      drawCenterText(["E L M I O   R U N", "press SPACE or tap to start"]);
    } else if (player.state === "over") {
      drawCenterText(["G A M E   O V E R", "press SPACE or tap to try again"]);
    }
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
  requestAnimationFrame(loop);

  // dev hook: e.g. `elmio.score = 495` in the console to preview night mode
  window.elmio = {
    get score()  { return score; },
    set score(v) { score = v; },
    get state()  { return player.state; },
    get speed()  { return speed; },
    duck(on)     { player.ducking = !!on; },
    jump()       { jumpAction(); },
    tick(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); },
    get debug() {
      return {
        player: playerHitbox(playerFrame()), y: player.y, grounded: player.grounded,
        obstacles: obstacles.map(o => ({ kind: o.kind, x: Math.round(o.x), box: foodBox(o) })),
      };
    },
  };
})();
