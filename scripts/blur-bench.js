/* ============================================================================
   BottomBlur A/B bench — does the four-layer ramp actually cost frames?

   Paste into the console on the homepage, in a NORMAL foreground tab.
   A background tab is presented no frames at all and every number comes back
   a lie, so the bench refuses to run in one.

   It drives an identical scripted wheel-scroll under four conditions and
   reports the frame intervals that were actually presented:

     4 layers   what ships today: 0.4 / 0.8 / 1.6 / 3.2px, chained
     2 layers   the outer pair only
     1 layer    the widest blur alone
     0 layers   geometry and fill kept, backdrop-filter off

   Only `backdrop-filter` is touched. Boxes, masks and the 1% white fill stay,
   so the difference between conditions is the blur work and nothing else.
   Everything is restored when it finishes, including after an error.
   ========================================================================== */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  if (document.visibilityState !== "visible") {
    console.error("[bench] Tab is not visible — focus this tab and re-run.");
    return;
  }

  const ramp = document.querySelector('[class*="BottomBlur"]');
  if (!ramp) {
    console.error("[bench] No BottomBlur ramp on this page.");
    return;
  }
  const layers = [...ramp.children];
  const original = layers.map((el) => el.style.backdropFilter);
  const restore = () =>
    layers.forEach((el, i) => {
      el.style.backdropFilter = original[i];
    });

  /* Which layers keep their blur under each condition. Indices are bottom-up
     in DOM order: 0 is the 0.4px layer, 3 is the 3.2px one. */
  const CONDITIONS = [
    ["4 layers (shipping)", [0, 1, 2, 3]],
    ["2 layers", [0, 3]],
    ["1 layer", [3]],
    ["0 layers (blur off)", []],
  ];

  const apply = (keep) =>
    layers.forEach((el, i) => {
      el.style.backdropFilter = keep.includes(i) ? original[i] || "" : "none";
    });

  /* The display's own cadence, measured while nothing is moving. Everything
     below is expressed against this rather than an assumed 60Hz — on a 120Hz
     panel a "16ms frame" is already two frames late. */
  async function baseline() {
    const d = [];
    let last = await new Promise(requestAnimationFrame);
    const t0 = last;
    while (last - t0 < 700) {
      const t = await new Promise(requestAnimationFrame);
      d.push(t - last);
      last = t;
    }
    d.sort((a, b) => a - b);
    return d[Math.floor(d.length / 2)];
  }

  /* One run: scroll to the top, settle, then dispatch a wheel tick every 50ms
     for `ms` while recording what the compositor actually presented.

     Synthetic wheel events rather than scrollTo: this has to go through the
     same path a real wheel does — Lenis's listener, its easing, and the
     per-frame re-blur underneath — and a scripted scrollTo would skip most
     of it.

     The direction reverses near either end. The homepage is only about twice
     the viewport tall, so a one-way scroll parks against the bottom stop in
     well under a second and spends the rest of the run with a motionless
     backdrop — which is exactly the condition under which a backdrop-filter
     costs nothing, and would price the ramp at free. */
  async function run(ms = 2200) {
    window.scrollTo(0, 0);
    await sleep(700);

    const deltas = [];
    let last = await new Promise(requestAnimationFrame);
    let dir = 1;
    const wheel = setInterval(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      if (dir > 0 && y > max - 120) dir = -1;
      else if (dir < 0 && y < 120) dir = 1;
      window.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 60 * dir,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, 50);

    const t0 = last;
    while (last - t0 < ms) {
      const t = await new Promise(requestAnimationFrame);
      deltas.push(t - last);
      last = t;
    }
    clearInterval(wheel);
    await sleep(500);
    return deltas;
  }

  const stats = (d, base) => {
    const s = [...d].sort((a, b) => a - b);
    const at = (q) => s[Math.min(s.length - 1, Math.floor(s.length * q))];
    /* "Late" = took more than 1.5 display frames, i.e. at least one frame
       was missed. The honest headline number. */
    const late = d.filter((x) => x > base * 1.5).length;
    return {
      frames: d.length,
      p50: +at(0.5).toFixed(1),
      p95: +at(0.95).toFixed(1),
      worst: +Math.max(...d).toFixed(1),
      lateFrames: late,
      latePct: +((late / d.length) * 100).toFixed(1),
    };
  };

  try {
    const base = await baseline();
    console.log(
      `[bench] display cadence ≈ ${base.toFixed(1)}ms (${Math.round(1000 / base)}Hz). ` +
        `Do not touch the page while this runs — about 15s.`,
    );

    const rows = {};
    for (const [label, keep] of CONDITIONS) {
      apply(keep);
      await sleep(400);
      rows[label] = stats(await run(), base);
    }

    console.table(rows);

    const four = rows["4 layers (shipping)"];
    const zero = rows["0 layers (blur off)"];
    const dP95 = +(four.p95 - zero.p95).toFixed(1);
    const dLate = +(four.latePct - zero.latePct).toFixed(1);
    console.log(
      `[bench] blur on vs off — p95 ${dP95 > 0 ? "+" : ""}${dP95}ms, ` +
        `late frames ${dLate > 0 ? "+" : ""}${dLate} percentage points.`,
    );
    console.log(
      Math.abs(dP95) < base * 0.25 && Math.abs(dLate) < 3
        ? "[bench] VERDICT: the ramp is not the bottleneck. Look elsewhere."
        : "[bench] VERDICT: the ramp is costing real frames — compare the 2 and 1 layer rows for how much is worth buying back.",
    );
  } finally {
    restore();
    window.scrollTo(0, 0);
    console.log("[bench] restored.");
  }
})();
