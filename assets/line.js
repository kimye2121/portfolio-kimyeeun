/* The line: Why → Decide → Validate in the hero, then a rail per section.
   Lines live only in the empty left gutter (or the hero's open space) and never
   cross content; between sections they fade out instead of cutting across. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width:760px)');
  let heroIntro = null;                              // set by the hero below: { play } replays the intro

  // a reload always starts from the top (links with #section still jump there)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);

  /* ---------- 1. Hero: Why → Decide → Validate, drawn once on load ---------- */
  const steps = document.querySelector('.hero-steps');
  if (steps) {
    const hs = [...steps.querySelectorAll('.hstep')];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hero-line');
    svg.setAttribute('aria-hidden', 'true');
    const trail = document.documentElement.classList.contains('trail');   // TRIAL fading trail (see style.css)
    svg.innerHTML = (trail ? '<defs><linearGradient id="hl-trail" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#376BFF" stop-opacity=".3"/><stop offset="1" stop-color="#376BFF"/></linearGradient></defs>' : '')
      + '<path class="main" pathLength="1"' + (trail ? ' style="stroke:url(#hl-trail)"' : '') + '/>';
    steps.prepend(svg);
    const main = svg.querySelector('.main');
    const nodes = hs.map(h => h.querySelector('.node'));
    const hero = steps.closest('.hero');

    const wide = matchMedia('(min-width:900px) and (min-height:560px)');
    const DRAW = 1.7;                               // seconds to draw Why → Validate (was 2.6; also in style.css .hero-line .main)
    let lead = 0;                                   // seconds spent drawing the part that comes in from off-screen
    const layout = () => {
      const p = hs.map(h => [h.offsetLeft, h.offsetTop]);
      const b = p[p.length - 1];
      const ox = steps.offsetParent.offsetLeft + steps.offsetLeft, oy = steps.offsetParent.offsetTop + steps.offsetTop;
      // on wide screens the line starts off-screen above Why (it later turns into the project bar,
      // which also runs in from off-screen); on phones it would cut through the title, so it starts at Why
      let pts = p;
      if (wide.matches) {
        const [a, c] = [p[0], p[1]], k = (a[1] + oy + 40) / (c[1] - a[1]);   // back along Why←Decide to 40px above the screen
        pts = [[a[0] - (c[0] - a[0]) * k, a[1] - (c[1] - a[1]) * k], ...p];
      }
      main.setAttribute('d', 'M' + pts.map(q => q.join(',')).join(' L'));
      const g = svg.querySelector('#hl-trail');                                  // trail: faint where the line comes in, full at Validate
      if (g) [['x1', pts[0][0]], ['y1', pts[0][1]], ['x2', b[0]], ['y2', b[1]]].forEach(([k, v]) => g.setAttribute(k, v));
      const seg = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) * 2, pre = Math.hypot(pts[0][0] - p[0][0], pts[0][1] - p[0][1]);
      lead = pts.length > p.length ? DRAW * pre / seg : 0;
      main.style.transitionDuration = (DRAW + lead) + 's';                      // same speed, just a longer run-up
      // gray diagonal = the same line as the steps, extended to the hero's top and bottom edges
      const A = [ox + p[0][0], oy + p[0][1]], B = [ox + b[0], oy + b[1]], m = (B[0] - A[0]) / (B[1] - A[1]);
      hero.style.setProperty('--x0', (A[0] - m * A[1]) + 'px');
      hero.style.setProperty('--x1', (A[0] + m * (hero.offsetHeight - A[1])) + 'px');
    };
    layout();
    addEventListener('resize', layout);
    if (document.fonts) document.fonts.ready.then(layout);

    const light = i => { nodes.forEach((n, j) => { n.classList.toggle('on', j <= i); n.classList.toggle('current', j === i); }); };
    let timers = [], playing = false;
    // the intro: line draws, circles light one by one (times match the draw, see .hero-line)
    const play = () => {
      timers.forEach(clearTimeout);
      playing = true; light(-1);
      main.style.transition = 'none'; svg.classList.remove('drawn');              // snap back to "not drawn" (no backwards animation), then draw again
      void main.getBoundingClientRect(); main.style.transition = ''; main.style.transitionDuration = (DRAW + lead) + 's';
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('drawn')));
      timers = [250, 250 + DRAW * 500, 250 + DRAW * 1000].map((t, i) => setTimeout(() => light(i), t + lead * 1000));
      timers.push(setTimeout(() => { playing = false; }, 2600 + lead * 1000));
    };
    // jump straight to the finished state (reduced motion, or the page was scrolled before/while it played):
    // otherwise the turning overlay shows the finished line + circles while only the words step through their colours
    const finish = () => {
      timers.forEach(clearTimeout); timers = []; playing = false;
      main.style.transition = 'none'; svg.classList.add('drawn'); light(2);
      void main.getBoundingClientRect(); main.style.transition = ''; main.style.transitionDuration = (DRAW + lead) + 's';
    };
    heroIntro = { play };
    if (reduce || scrollY > 0) finish(); else play();
    addEventListener('scroll', () => { if (playing && scrollY > 0) finish(); }, { passive: true });
  }

  /* ---------- 2. Section rails: grow with scroll, fade at the end ---------- */
  const rails = [...document.querySelectorAll('.sec-head > .node')].map(node => {
    const head = node.parentElement, wrap = head.parentElement;
    const rail = document.createElement('span');
    rail.className = 'rail'; rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<i></i>';
    wrap.prepend(rail);
    return { node, head, rail };
  });
  const ends = [...document.querySelectorAll('.node.lg')];
  const endLines = [...document.querySelectorAll('.end-line')];

  function place() {
    rails.forEach(r => { r.rail.style.top = (r.head.offsetTop + r.node.offsetTop) + 'px'; });
    // each shown rail runs on until it reaches the next section's circle (e.g. Archive → About), so the line never breaks
    const nodes = [...document.querySelectorAll('.sec-head > .node')].filter(n => n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden');
    const pageY = el => { const b = el.getBoundingClientRect(); return b.top + b.height / 2 + scrollY; };
    rails.forEach(r => {
      r.rail.style.height = ''; r.rail.style.bottom = ''; r.rail.classList.remove('joined');
      if (!r.rail.getClientRects().length) return;                       // hidden rail (pinned projects, About)
      const next = nodes.find(n => n !== r.node && pageY(n) > pageY(r.node) + 1 && !r.head.parentElement.contains(n));
      if (!next) return;
      const top = r.rail.getBoundingClientRect().top + scrollY;
      r.rail.style.bottom = 'auto'; r.rail.style.height = (pageY(next) - top) + 'px'; r.rail.classList.add('joined');
    });
    update();
  }

  function update() {
    const anchor = innerHeight * 0.62;
    const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
    const flow = [];
    // section rails: the blue tip sits where a section's circle rests when its start is in place (just under the header),
    // so a section begins with its line empty and the line fills as you read down, reaching the next circle as it arrives
    const HEAD_Y = 116;
    const rb = rails.map(r => r.rail.getBoundingClientRect()), eb = ends.map(n => n.getBoundingClientRect().top),
          lb = endLines.map(l => l.nextElementSibling.getBoundingClientRect());   // all reads first, then writes: no forced layout per element
    rails.forEach((r, i) => {
      const b = rb[i];
      const p = atBottom ? 1 : Math.min(1, Math.max(0, (HEAD_Y - b.top) / b.height));
      r.rail.style.setProperty('--p', p);
      flow.push([r.node, atBottom || b.top <= HEAD_Y]);
    });
    ends.forEach((n, i) => flow.push([n, atBottom || eb[i] <= anchor]));
    // the last line: in from off-screen left, reaching the final circle just as it lights up
    endLines.forEach((l, i) => {
      const r = lb[i], y = r.top + r.height / 2, from = innerHeight * 0.95;
      const p = atBottom ? 1 : Math.min(1, Math.max(0, (from - y) / (from - anchor)));
      l.style.setProperty('--p', p);
      // one line: only once it has reached the circle does it carry on past it, out to the right edge,
      // finishing as the circle settles at the top (its resting place, 96 + half the 56px circle)
      const out = l.parentElement.querySelector('.end-out'), rest = 130;
      // phone: the page often ends before the circle reaches its resting place, so the right half grows with the left (no half-drawn line)
      const q = atBottom ? 1 : phone.matches ? p : Math.min(1, Math.max(0, (anchor - y) / (anchor - rest)));
      if (out) out.style.setProperty('--p', q);
      l.style.setProperty('--tip', 1 - 0.35 * q);   // 0.65 at rest = halfway between 0.3 and 1, so both halves fade at the same rate   // trail: as the line runs on past the circle, the left half behind it lightens
    });
    let cur = null;
    flow.forEach(([n, hit]) => { n.classList.toggle('on', hit); if (hit) cur = n; });
    flow.forEach(([n]) => n.classList.toggle('current', n === cur));
  }

  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });
  addEventListener('resize', place);
  addEventListener('load', place);
  if (document.fonts) document.fonts.ready.then(place);
  place();
  addEventListener('load', place);                                     // images change heights

  let mg = null;   // morph geometry (section 5); null when the morph is off
  // with the morph on, the projects section pins first and spends this much scroll (in screen heights)
  // finishing the turn of the line (TURN), then sliding the projects in from the right along it (SLIDE)
  const TURN = 1.5, SLIDE = 1.0;   // keep in step with .has-morph .proj height in style.css
  const intro = () => (mg ? innerHeight * (TURN + SLIDE) : 0);
  /* ---------- 3. Projects content comes in ---------- */
  const heroEl = document.querySelector('.hero'), mainEl = document.querySelector('main');
  const lift = () => {
    if (!heroEl) return;
    if (mg) { mainEl.style.setProperty('--reveal', 1); return; }   // the morph brings the projects in itself
    mainEl.style.setProperty('--reveal', Math.min(1, Math.max(0, scrollY / (heroEl.offsetHeight * 0.7))));
  };

  /* ---------- 4. Projects: a horizontal line; scrolling moves it and opens one project at a time ---------- */
  const proj = document.querySelector('.proj');
  const projSteps = proj ? [...proj.querySelectorAll('.step')] : [];
  const cards = proj ? [...proj.querySelectorAll('.card')] : [];
  const pinned = matchMedia('(min-width:900px) and (min-height:560px)');
  let active = -2;   // -2: nothing applied yet · -1: arriving (first project shown, closed)
  let busyUntil = 0;
  function projUpdate() {
    if (!proj) return;
    if (!pinned.matches) { cards.forEach(c => c.classList.remove('active', 'shown', 'past')); active = -2; return; }
    if (performance.now() < busyUntil) return;           // a step is animating; it already chose the card
    if (mg && scrollY < stepStart() - 2) { setActive(-1); return; }   // still arriving: nothing open yet
    const p = Math.min(1, Math.max(0, (scrollY - stepStart()) / stepSpan()));
    setActive(Math.min(stops() - 1, Math.floor(p * stops())));
  }
  function setActive(i) {
    if (i === active) return;
    active = i;
    const all = i === cards.length;                      // last stop: the line runs off to the right, all projects side by side
    const shown = all ? -1 : Math.max(0, i);              // before arrival the first project is already in view (and open, see below)
    cards[0].parentElement.classList.toggle('overview', all);
    cards.forEach((c, k) => { c.classList.toggle('active', k === Math.max(0, i));   // while arriving (i = -1) the first card comes in already open: its words used to pop in after it landed
       c.classList.toggle('shown', k === shown); c.classList.toggle('past', !all && k < shown); });
    proj.querySelector('.steps').style.setProperty('--fill', all ? 'calc(100% + 50vw)' : (shown + 0.5) / cards.length * 100 + '%');   // blue up to the current circle
    const j = Math.max(0, i);                            // arriving: the first circle comes in already filled, so it doesn't flash white → blue on landing
    projSteps.forEach((s, k) => { const on = all || k <= j, cur = all || k === j; s.classList.toggle('on', on); s.classList.toggle('current', cur); s.firstChild.classList.toggle('on', on); s.firstChild.classList.toggle('current', cur); });

  }
  // one gesture = one project: inside the pinned range, wheel/keys/swipe step exactly one card
  const stepStart = () => proj.offsetTop + mainEl.offsetTop + intro();          // stepping begins after the intro
  const stepSpan = () => proj.offsetHeight - innerHeight - intro();
  const stops = () => cards.length + 1;                                         // three projects + the overview
  const stepTop = k => stepStart() + (k + 0.5) / stops() * stepSpan();
  const goTo = k => { busyUntil = performance.now() + 750; setActive(k); scrollTo({ top: stepTop(k), behavior: reduce ? 'auto' : 'smooth' }); };
  projSteps.forEach((s, k) => s.addEventListener('click', () => goTo(k)));
  let held = false;
  // from the cover, one gesture (or a click) winds the whole turn by itself, quickly, to the first project;
  // one gesture back up from the first project winds back to the cover
  let glideUntil = 0;
  // ease 'inout': gentle start and stop (cover → projects); 'out': picks up the hand's motion and settles (section snaps)
  const EASE = { inout: v => -(Math.cos(Math.PI * v) - 1) / 2, out: v => 1 - Math.pow(1 - v, 3) };
  function glide(to, dur, kind = 'inout') {
    const html = document.documentElement, from = scrollY, t0 = performance.now();
    if (dur === undefined) dur = Math.min(2800, Math.max(1800, Math.abs(to - from) / innerHeight * 800));   // longer way = longer ride, never a jump
    if (reduce) dur = 0;
    glideUntil = t0 + dur + 150;
    html.style.scrollBehavior = 'auto';
    const ease = EASE[kind];
    const tick = now => {
      const v = dur ? Math.min(1, (now - t0) / dur) : 1;
      scrollTo(0, from + (to - from) * ease(v));
      if (v < 1) requestAnimationFrame(tick); else html.style.scrollBehavior = '';
    };
    requestAnimationFrame(tick);
  }
  if (heroEl) heroEl.addEventListener('click', e => { if (mg && !e.target.closest('a')) glide(stepTop(0)); });

  function step(dir, e, fresh) {
    if (!proj || !pinned.matches) return;
    const y = scrollY, intro = mg && y < stepStart() - 2;
    if (!intro && (y < stepStart() - 2 || y > stepStart() + stepSpan() + 2)) return; // outside: scroll freely
    if (intro && dir < 0 && y <= 1) return;               // already at the very top
    const now = performance.now();
    if (fresh) held = false;                              // a new gesture (see wheelFresh) frees the next step
    if (held || now < busyUntil || now < glideUntil) { e.preventDefault(); return; } // same gesture / still moving: swallow
    if (intro) { e.preventDefault(); held = true; glide(dir > 0 ? stepTop(0) : 0); return; }
    const next = active + dir;
    if (next < 0 && mg) { e.preventDefault(); held = true; glide(0); return; }   // back up to the cover
    if (next < 0 || next >= stops()) return;             // overview: a new gesture scrolls on
    e.preventDefault();
    held = true;
    goTo(next);
  }

  // below the projects: one gesture lands on the start of the next (or previous) section.
  // A section taller than the screen still scrolls normally until its end is near, so long text stays readable.
  const SNAP_GAP = 96;                                   // heading sits this far below the top (header 64 + a little air)
  const pageTop = el => el.getBoundingClientRect().top + scrollY;
  // each stop: where to park, and where that stop's own block begins (the previous block's text ends just above it)
  let snapMemo = null, snapAt = 0;                       // a trackpad fires ~60 wheel events/s: measure the page at most every 400ms
  const snapStops = () => {
    const nowT = performance.now();
    if (snapMemo && nowT - snapAt < 400) return snapMemo;
    snapAt = nowT;
    const t = [];
    if (proj && pinned.matches) t.push({ y: stepTop(stops() - 1), block: pageTop(proj) + proj.offsetHeight });  // the projects overview
    else t.push({ y: 0, block: 0 });                                                                            // case-study pages: the cover
    document.querySelectorAll('main > .sec:not(.proj) .sec-head, main > .cs-sec .sec-head, .end .node-wrap, .next .node-wrap')
      .forEach(h => t.push({ y: pageTop(h) - SNAP_GAP, block: pageTop(h.closest('section,.next') || h) }));
    return snapMemo = t.map(o => ({ y: Math.round(o.y), block: o.block })).sort((a, b) => a.y - b.y);
  };
  let snapHeld = false;
  function snap(dir, e, fresh) {
    if (!pinned.matches || e.defaultPrevented) return;   // phones and small windows: plain scrolling
    const y = scrollY, now = performance.now();
    if (fresh) snapHeld = false;
    if (snapHeld || now < glideUntil) { e.preventDefault(); return; }               // rest of the same gesture: one swipe = one move
    const st = snapStops(), tops = st.map(o => o.y);
    if (tops.length && y < tops[0] - 4) return;                                     // above: the projects handle it
    const k = dir > 0 ? tops.findIndex(t => t > y + 4) : tops.findLastIndex(t => t < y - 4);
    if (k < 0) return;
    const to = tops[k];
    const pinTail = proj && pinned.matches && (to === tops[0] || y <= stepStart() + stepSpan() + 4);   // overview ↔ Archive: only the pinned tail lies between
    const d = Math.abs(to - y), onStop = tops.some(t => Math.abs(t - y) < 12);
    // the block between the two stops fits on one screen when parked at the upper stop → nothing is skipped by jumping
    const upper = dir > 0 ? y : to, lower = dir > 0 ? st[k] : st[k + 1];
    const fits = lower && lower.block - 40 <= upper + innerHeight * 1.1;
    // from a section start: one gesture goes to the next start when nothing would be skipped.
    // mid-way through a long section: scroll on normally, and only ease the last half screen in
    if (!pinTail && (onStop ? !(fits || d <= innerHeight * 1.05) : d > innerHeight * 0.5)) return;
    e.preventDefault(); snapHeld = true; glide(to, Math.min(1100, 500 + d / innerHeight * 500), 'out');
  }

  // Is this wheel event the start of a new gesture? A trackpad keeps sending fading "momentum" events for a second or
  // more after the fingers lift, so waiting for a pause made a second swipe look like the same gesture (it was swallowed
  // until the hand stopped). A new swipe is: a pause, a change of direction, or the delta suddenly growing again.
  // Momentum deltas are irregular (e.g. 30, 14, 27, 11…), so comparing one event with the one before mistook that
  // wobble for new swipes: the page kept re-snapping and shook. Now the last 3 events must clearly outweigh the
  // ones before them (a real new push), so one long swipe counts once; keep swiping and each new push moves on.
  let wLast = 0, wDir = 0, wStart = 0;
  let pushN = 0;
  const wHist = [];
  function wheelFresh(e) {
    const now = performance.now(), m = Math.abs(e.deltaY), d = Math.sign(e.deltaY);
    let fresh = now - wLast > 160 || d !== wDir;
    wLast = now; wDir = d;
    if (fresh) { wHist.length = 0; wHist.push(m); wStart = now; return true; }
    wHist.push(m); if (wHist.length > 10) wHist.shift();
    if (wHist.length < 6 || now - wStart < 300) return false;   // a swipe's own wind-up is not a new push
    const recent = (wHist.at(-1) + wHist.at(-2) + wHist.at(-3)) / 3, prev = wHist.slice(0, -3);
    const base = prev.reduce((a, b) => a + b, 0) / prev.length, low = Math.min(...prev);
    fresh = recent > base * 1.8 && recent - base > 8 && wHist.at(-1) > low * 2.5;
    if (fresh) { wHist.length = 0; wHist.push(m); wStart = now; }
    return fresh;
  }
  addEventListener('wheel', e => {
    if (document.querySelector('dialog.zoom[open]')) return;
    let fresh = wheelFresh(e);
    // parked after a move, swipe still going: carry on to the next section only if the hand keeps pushing (2 events in a row above 30; a fading momentum tail is below)
    // ponytail: tune 30 / 2 if too eager / too stiff
    if ((held || snapHeld) && performance.now() >= glideUntil) {
      pushN = Math.abs(e.deltaY) > 30 ? pushN + 1 : 0;
      if (pushN >= 2) { fresh = true; pushN = 0; }
    }
    if (Math.abs(e.deltaY) > 2) { step(Math.sign(e.deltaY), e, fresh); snap(Math.sign(e.deltaY), e, fresh); }
  }, { passive: false });
  addEventListener('keydown', e => {
    const d = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (d && !e.target.closest('input,textarea') && !document.querySelector('dialog.zoom[open]')) { const k = e.shiftKey && e.key === ' ' ? -1 : d; step(k, e, !e.repeat); snap(k, e, !e.repeat); }
  });
  let ty = null;
  addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => {
    if (ty === null) return;
    const dy = ty - e.touches[0].clientY;
    if (Math.abs(dy) > 30) { step(Math.sign(dy), e, true); if (e.defaultPrevented) ty = null; }
  }, { passive: false });

  /* ---------- 5. Morph: the hero's Why–Decide–Validate line turns, straightens and stretches
     into the project line as you scroll; its three nodes become the three projects ---------- */
  const hstepEls = [...document.querySelectorAll('.hstep')];
  const bar = proj && proj.querySelector('.steps');
  let morph = null;
  if (hstepEls.length === 3 && bar && !reduce) {
    morph = document.createElement('div');
    morph.className = 'morph'; morph.setAttribute('aria-hidden', 'true');
    morph.innerHTML = '<div class="m-line"></div><span class="node"></span><span class="node"></span><span class="node"></span>';
    const bg = document.createElement('div');                              // the hero's gray half, turning with the line
    bg.className = 'm-bg'; bg.setAttribute('aria-hidden', 'true'); bg.innerHTML = '<i></i>';
    document.body.append(bg, morph);
    document.documentElement.classList.add('has-morph');
    const mLine = morph.firstChild, mNodes = [...morph.querySelectorAll('.node')], bgHalf = bg.firstChild;
    function morphLayout() {
      if (!pinned.matches) { mg = null; return; }
      const sw = steps.offsetParent, wrap = bar.offsetParent;
      const S = hstepEls.map(h => [sw.offsetLeft + steps.offsetLeft + h.offsetLeft, sw.offsetTop + steps.offsetTop + h.offsetTop]);
      const pin = proj.querySelector('.proj-pin') || proj;
      // the project line's centre on screen while pinned (the pinned box sits at the top): .steps::before is 2px tall at top:-2px,
      // so its centre is the bar's top − 1, measured exactly (fractions included) so the turning line lands on it without a jump
      const top = proj.offsetTop + mainEl.offsetTop, by = bar.getBoundingClientRect().top - pin.getBoundingClientRect().top - 1;
      const bx0 = wrap.offsetLeft + bar.offsetLeft, bw = bar.offsetWidth;
      bar.style.setProperty('--below', (innerHeight - by) + 'px');            // gray under the bar fills the pinned screen, no further
      // the blue tip (Validate) travels to project 01's circle while the line turns flat;
      // the other end always runs off-screen, so the line reads as one line swinging into place
      const first = bar.querySelector('.step');
      const n1 = [bx0 + first.offsetLeft + first.offsetWidth / 2, by];
      mg = { top, S, V: S[2], T1: n1, a0: Math.atan2(S[2][1] - S[0][1], S[2][0] - S[0][0]) };
    }
    const mix = (a, b, k) => a + (b - a) * k, clamp = v => Math.min(1, Math.max(0, v));
    // timeline (scroll): [0, a1] the words fade and the circles go; line + gray half stay put
    // · [a1, a2] line and gray half turn together, the line straightens out, the gray goes
    // · [a2, a3] the projects slide in from the right along the line · then the first one opens
    function morphUpdate() {
      const H = heroEl.offsetHeight, s = scrollY;
      const a1 = H * 0.8, a2 = mg ? mg.top + innerHeight * TURN : 0, a3 = a2 + innerHeight * SLIDE;
      const on = mg && s > 0 && s < a3;
      document.documentElement.classList.toggle('morphing', !!on);
      heroEl.style.setProperty('--hfade', mg ? clamp(1 - s / a1) : 1);
      heroEl.style.setProperty('--hlbl', mg ? clamp(1 - s / (H * 0.2)) : 1);
      mainEl.style.setProperty('--slide', mg ? 1 - Math.pow(1 - clamp((s - a2) / (a3 - a2)), 3) : 1); // ease-out arrival
      if (!on) { morph.style.display = bg.style.display = 'none'; return; }
      const r = clamp((s - a1) / (a2 - a1));
      const ease = v => (v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);  // sets off gently, lands gently
      const k = ease(r);
      const ang = mix(mg.a0, 0, k), c = Math.cos(ang), sn = Math.sin(ang);
      const T = [mix(mg.V[0], mg.T1[0], k), mix(mg.V[1], mg.T1[1], k)];     // the tip
      const L = sn > 1e-3 ? Math.min((T[1] + 40) / sn, (T[0] + 40) / c) : T[0] + 40;   // back to just off-screen
      morph.style.display = bg.style.display = 'block';
      mLine.style.cssText = `left:${T[0] - c * L}px;top:${T[1] - sn * L}px;width:${L}px;transform:rotate(${ang}rad)`;
      bgHalf.style.cssText = `left:${T[0]}px;top:${T[1]}px;transform:rotate(${ang}rad) translateX(-3000px)`;   // stays: it becomes the gray under the project bar
      const nodeA = clamp(1 - s / (a1 * 0.5));                               // the circles go first; only the line carries on
      mNodes.forEach((n, i) => {
        n.style.cssText = `left:${mg.S[i][0]}px;top:${mg.S[i][1]}px;opacity:${nodeA};display:${nodeA ? 'block' : 'none'}`;
        n.classList.toggle('current', i === 2); n.classList.toggle('on', true);
      });
    }
    morphLayout();
    addEventListener('resize', morphLayout);
    addEventListener('load', morphLayout);
    if (document.fonts) document.fonts.ready.then(morphLayout);
  }

  // the name in the header = start over: back to the top and the intro plays again (case-study pages: it stays a plain link to the main page)
  document.querySelectorAll('.brand').forEach(a => a.addEventListener('click', e => {
    if (!heroIntro || !(a.getAttribute('href') || '').startsWith('#')) return;
    e.preventDefault();
    if (scrollY > 2) { glide(0, 700, 'out'); setTimeout(heroIntro.play, 780); } else heroIntro.play();
    history.replaceState(null, '', location.pathname + location.search);
  }));
  // "Projects" links land on the projects view itself (heading + first project), not on the empty turning stage
  const toProjects = smooth => { if (!mg) return; if (smooth) glide(stepTop(0)); else scrollTo({ top: stepTop(0), behavior: 'auto' }); };
  document.querySelectorAll('a[href="#projects"]').forEach(a => a.addEventListener('click', e => { if (mg) { e.preventDefault(); toProjects(true); history.replaceState(null, '', '#projects'); } }));
  if (location.hash === '#projects') addEventListener('load', () => toProjects(false));

  const frame = () => { lift(); projUpdate(); if (morph) morphUpdate(); };
  addEventListener('scroll', frame, { passive: true });
  addEventListener('resize', () => { active = -2; frame(); });
  frame();

  /* ---------- header state + nav highlight + reveal ---------- */
  const top = document.querySelector('.top');
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const secs = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  let navRaf = 0;
  addEventListener('scroll', () => {
    if (navRaf) return;
    navRaf = requestAnimationFrame(() => {
      navRaf = 0;
      top && top.classList.toggle('scrolled', scrollY > 24);
      const y = scrollY + innerHeight * 0.4;
      let act = null; secs.forEach(s => { if (s.offsetTop <= y) act = s.id; });
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + act));
    });
  }, { passive: true });

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  /* ---------- 8. Plain pictures (.fig, covers) open large on click; click / Esc closes (native <dialog>) ---------- */
  let zoom = null;
  const openZoom = img => {
    if (!zoom) {
      zoom = document.createElement('dialog'); zoom.className = 'zoom';
      zoom.innerHTML = '<img alt=""><button type="button" class="zoom-x" aria-label="닫기">×</button>';
      zoom.addEventListener('click', () => zoom.close());
      document.body.appendChild(zoom);
    }
    const big = zoom.firstChild; big.src = img.currentSrc || img.src; big.alt = img.alt;
    zoom.showModal();
  };
  document.querySelectorAll('.fig img, .cs-cover img').forEach(img => {
    img.tabIndex = 0; img.setAttribute('role', 'button'); img.setAttribute('aria-label', (img.alt || '이미지') + ' — 크게 보기');
    img.addEventListener('click', () => openZoom(img));
    img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(img); } });
  });

  /* ---------- 7. Email / phone: a click copies instead of opening a mail app or dialer ---------- */
  let toast = null, toastT = 0;
  const say = msg => {
    if (!toast) { toast = document.createElement('div'); toast.className = 'copied'; toast.setAttribute('role', 'status'); document.body.appendChild(toast); }
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 1800);
  };
  const copy = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    const ta = document.createElement('textarea');                       // fallback where the clipboard API is blocked
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); return ok;
  };
  document.querySelectorAll('[data-copy]').forEach(a => a.addEventListener('click', async e => {
    e.preventDefault();
    const label = a.dataset.copyLabel || '';
    say(await copy(a.dataset.copy) ? `${label}를 복사했어요` : `${a.dataset.copy} · 복사하지 못했어요`);
  }));
  /* phone: project cards fold out with "자세히 보기" (the toggle is hidden above 760px by CSS); the rest of the card stays a link */
  document.querySelectorAll('#projects .card').forEach(card => {
    const body = card.querySelector('.body'), detail = card.querySelector('.detail');
    if (!body || !detail) return;
    const t = document.createElement('span');
    t.className = 'peek'; t.setAttribute('role', 'button'); t.tabIndex = 0;
    const set = open => { card.classList.toggle('open', open); t.textContent = open ? '접기' : '자세히 보기'; t.setAttribute('aria-expanded', open); };
    set(false);
    const flip = e => { e.preventDefault(); e.stopPropagation(); set(!card.classList.contains('open')); };
    t.addEventListener('click', flip);
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') flip(e); });
    body.appendChild(t);
  });
  /* phone: Archive rows swipe right → left. The picture slides in from the right, see-through, the row's full height.
     Swipe far (past ~45% of the row) and let go → the document opens; let go before that → the row springs back as it was. */
  const phoneW = matchMedia('(max-width:760px)');
  document.querySelectorAll('.arc').forEach(a => {
    let x0 = 0, y0 = 0, id = null, axis = null, dx = 0;
    const far = () => dx > a.offsetWidth * 0.45;
    const set = v => { dx = v; a.style.setProperty('--sw', v + 'px'); a.classList.toggle('go', far()); };
    a.addEventListener('pointerdown', e => {
      if (!phoneW.matches || e.button > 0) return;
      x0 = e.clientX; y0 = e.clientY; id = e.pointerId; axis = null; dx = 0;
    });
    a.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (!axis) {
        if (Math.hypot(mx, my) < 8) return;
        axis = Math.abs(mx) > Math.abs(my) && mx < 0 ? 'x' : 'y';    // only a leftward sideways move is a swipe
        if (axis === 'y') { id = null; return; }                         // up/down: plain scrolling
        try { a.setPointerCapture(id); } catch (err) {}
        a.classList.add('swiping');
      }
      set(Math.max(0, -mx));
    });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      if (axis !== 'x') return;
      a.classList.remove('swiping');
      a.dataset.swiped = '1'; setTimeout(() => delete a.dataset.swiped, 400);   // the tap that ends a swipe is not a click
      if (e.type === 'pointerup' && far()) {
        const w = window.open(a.href, a.target || '_self', 'noopener');
        if (!w && a.target === '_blank') location.href = a.href;
      }
      set(0);                                                             // back to how it was (also after opening)
    };
    a.addEventListener('pointerup', end);
    a.addEventListener('pointercancel', end);
    a.addEventListener('click', e => { if (a.dataset.swiped) { e.preventDefault(); e.stopPropagation(); } }, true);
    a.addEventListener('dragstart', e => { if (phoneW.matches) e.preventDefault(); });
  });
})();
