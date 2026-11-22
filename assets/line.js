/* The line: Why → Decide → Validate in the hero, then a rail per section.
   Lines live only in the empty left gutter (or the hero's open space) and never
   cross content; between sections they fade out instead of cutting across. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    svg.innerHTML = '<path class="main" pathLength="1"/>';
    steps.prepend(svg);
    const main = svg.querySelector('.main');
    const nodes = hs.map(h => h.querySelector('.node'));
    const hero = steps.closest('.hero');

    const wide = matchMedia('(min-width:900px) and (min-height:640px)');
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
      const seg = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) * 2, pre = Math.hypot(pts[0][0] - p[0][0], pts[0][1] - p[0][1]);
      lead = pts.length > p.length ? 2.6 * pre / seg : 0;
      main.style.transitionDuration = (2.6 + lead) + 's';                      // same speed, just a longer run-up
      // gray diagonal = the same line as the steps, extended to the hero's top and bottom edges
      const A = [ox + p[0][0], oy + p[0][1]], B = [ox + b[0], oy + b[1]], m = (B[0] - A[0]) / (B[1] - A[1]);
      hero.style.setProperty('--x0', (A[0] - m * A[1]) + 'px');
      hero.style.setProperty('--x1', (A[0] + m * (hero.offsetHeight - A[1])) + 'px');
    };
    layout();
    addEventListener('resize', layout);
    if (document.fonts) document.fonts.ready.then(layout);

    const light = i => { nodes.forEach((n, j) => { n.classList.toggle('on', j <= i); n.classList.toggle('current', j === i); }); };
    if (reduce) { svg.classList.add('drawn'); light(2); }
    else {
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('drawn')));
      [400, 1700, 3000].forEach((t, i) => setTimeout(() => light(i), t + lead * 1000)); // matches the draw (.hero-line)
    }
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

  function place() {
    rails.forEach(r => { r.rail.style.top = (r.head.offsetTop + r.node.offsetTop) + 'px'; });
    update();
  }

  function update() {
    const anchor = innerHeight * 0.62;
    const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
    const flow = [];
    rails.forEach(r => {
      const b = r.rail.getBoundingClientRect();
      const p = atBottom ? 1 : Math.min(1, Math.max(0, (anchor - b.top) / b.height));
      r.rail.style.setProperty('--p', p);
      flow.push([r.node, atBottom || b.top <= anchor]);
    });
    ends.forEach(n => flow.push([n, atBottom || n.getBoundingClientRect().top <= anchor]));
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

  let mg = null;   // morph geometry (section 5); null when the morph is off
  // with the morph on, the projects section pins first and spends this much scroll (in screen heights)
  // finishing the turn of the line (TURN), then sliding the projects in from the right along it (SLIDE)
  const TURN = 1.8, SLIDE = 1.0;   // keep in step with .has-morph .proj height in style.css
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
  const pinned = matchMedia('(min-width:900px) and (min-height:640px)');
  let active = -1;
  let busyUntil = 0;
  function projUpdate() {
    if (!proj) return;
    if (!pinned.matches) { cards.forEach(c => c.classList.remove('active')); active = -1; return; }
    if (performance.now() < busyUntil) return;           // a step is animating; it already chose the card
    if (mg && scrollY < stepStart() - 2) { setActive(-1); return; }   // still arriving: nothing open yet
    const p = Math.min(1, Math.max(0, (scrollY - stepStart()) / stepSpan()));
    setActive(Math.min(cards.length - 1, Math.floor(p * cards.length)));
  }
  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((c, k) => c.classList.toggle('active', k === i));
    projSteps.forEach((s, k) => { s.classList.toggle('on', k <= i); s.classList.toggle('current', k === i); s.firstChild.classList.toggle('on', k <= i); s.firstChild.classList.toggle('current', k === i); });
    proj.querySelector('.steps').style.setProperty('--fill', (Math.max(0, i) + 0.5) / cards.length * 100 + '%');  // before arrival: waiting at 01
  }
  // one gesture = one project: inside the pinned range, wheel/keys/swipe step exactly one card
  const stepStart = () => proj.offsetTop + mainEl.offsetTop + intro();          // stepping begins after the intro
  const stepSpan = () => proj.offsetHeight - innerHeight - intro();
  const stepTop = k => stepStart() + (k + 0.5) / cards.length * stepSpan();
  const goTo = k => { busyUntil = performance.now() + 750; setActive(k); scrollTo({ top: stepTop(k), behavior: reduce ? 'auto' : 'smooth' }); };
  projSteps.forEach((s, k) => s.addEventListener('click', () => goTo(k)));
  let lastInput = 0, held = false;
  function step(dir, e) {
    if (!proj || !pinned.matches) return;
    const y = scrollY;
    if (y < stepStart() - 2 || y > stepStart() + stepSpan() + 2) return; // not in the stepping range (intro scrolls freely)
    const now = performance.now(), quiet = now - lastInput > 220;
    lastInput = now;
    if (quiet) held = false;                              // a pause between gestures frees the next step
    if (held || now < busyUntil) { e.preventDefault(); return; } // same gesture (trackpad momentum, key repeat): swallow
    const next = active + dir;
    if (next < 0 || next >= cards.length) return;        // first/last project: a new gesture scrolls on
    e.preventDefault();
    held = true;
    goTo(next);
  }
  addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 2) step(Math.sign(e.deltaY), e); }, { passive: false });
  addEventListener('keydown', e => {
    const d = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (d && !e.target.closest('input,textarea')) step(e.shiftKey && e.key === ' ' ? -1 : d, e);
  });
  let ty = null;
  addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => {
    if (ty === null) return;
    const dy = ty - e.touches[0].clientY;
    if (Math.abs(dy) > 30) { step(Math.sign(dy), e); if (e.defaultPrevented) ty = null; }
  }, { passive: false });

  /* ---------- 5. Morph: the hero's Why–Decide–Validate line turns, straightens and stretches
     into the project line as you scroll; its three nodes become the three projects ---------- */
  const hstepEls = [...document.querySelectorAll('.hstep')];
  const bar = proj && proj.querySelector('.steps');
  let morph = null;
  if (hstepEls.length === 3 && bar && !reduce) {
    morph = document.createElement('div');
    morph.className = 'morph'; morph.setAttribute('aria-hidden', 'true');
    morph.innerHTML = '<div class="m-line"><i></i><b></b></div><span class="node"></span><span class="node"></span><span class="node"></span>';
    const bg = document.createElement('div');                              // the hero's gray half, turning with the line
    bg.className = 'm-bg'; bg.setAttribute('aria-hidden', 'true'); bg.innerHTML = '<i></i>';
    document.body.append(bg, morph);
    document.documentElement.classList.add('has-morph');
    const mLine = morph.firstChild, mFill = mLine.firstChild, mExtra = mLine.lastChild, mNodes = [...morph.querySelectorAll('.node')], bgHalf = bg.firstChild;
    const btns = [...bar.querySelectorAll('.step')];
    function morphLayout() {
      if (!pinned.matches) { mg = null; return; }
      const sw = steps.offsetParent, wrap = bar.offsetParent;
      const S = hstepEls.map(h => [sw.offsetLeft + steps.offsetLeft + h.offsetLeft, sw.offsetTop + steps.offsetTop + h.offsetTop]);
      const top = proj.offsetTop + mainEl.offsetTop, by = bar.offsetTop + 1;  // bar's y on screen while pinned (the pinned box sits at the top)
      const bx0 = wrap.offsetLeft + bar.offsetLeft, bw = bar.offsetWidth;
      bar.style.setProperty('--below', (innerHeight - by) + 'px');            // gray under the bar fills the pinned screen, no further
      // pivot = where the hero line crosses the project bar's line: it never moves, the line turns on it and grows
      const dx = S[2][0] - S[0][0], dy = S[2][1] - S[0][1], P = [S[0][0] + (by - S[0][1]) * dx / dy, by];
      const sgn = by >= S[0][1] ? 1 : -1;
      const L0 = sgn * Math.hypot(P[0] - S[0][0], P[1] - S[0][1]), R0 = Math.hypot(S[2][0] - P[0], S[2][1] - P[1]);
      const L1 = P[0] - bx0, R1 = bx0 + bw - P[0];                       // ends exactly where the project bar ends
      const n1 = wrap.offsetLeft + bar.offsetLeft + btns[0].offsetLeft + btns[0].offsetWidth / 2 - P[0];   // project 01's node, along the line from the pivot
      mg = { top, S, P, a0: Math.atan2(dy, dx), L0, R0, L1, R1, n1 };
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
      const L = (sn > 1e-3 ? Math.min((mg.P[1] + 40) / sn, (mg.P[0] + 40) / c) : mg.P[0] + 40); // back end: always off-screen
      const R = mix(mg.R0, mg.R1, k);                                         // front end settles on the bar's end
      const x = mg.P[0] - c * L, y = mg.P[1] - sn * L;                        // the line's back end, seen from the fixed pivot
      morph.style.display = bg.style.display = 'block';
      mLine.style.cssText = `left:${x}px;top:${y}px;width:${L + R}px;transform:rotate(${ang}rad)`;
      // blue stays up to where project 01's node will land; the rest of the old blue line turns into the plain bar
      mFill.style.width = clamp((L + mg.n1) / (L + R)) * 100 + '%';
      mExtra.style.opacity = clamp(1 - (k - .55) / .45);
      bgHalf.style.cssText = `left:${mg.P[0]}px;top:${mg.P[1]}px;transform:rotate(${ang}rad) translateX(-3000px)`;   // stays: it becomes the gray under the project bar
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

  const frame = () => { lift(); projUpdate(); if (morph) morphUpdate(); };
  addEventListener('scroll', frame, { passive: true });
  addEventListener('resize', () => { active = -1; frame(); });
  frame();

  /* ---------- header state + nav highlight + reveal ---------- */
  const top = document.querySelector('.top');
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const secs = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  addEventListener('scroll', () => {
    top && top.classList.toggle('scrolled', scrollY > 24);
    const y = scrollY + innerHeight * 0.4;
    let act = null; secs.forEach(s => { if (s.offsetTop <= y) act = s.id; });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + act));
  }, { passive: true });

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
})();
