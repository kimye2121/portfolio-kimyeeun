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

    const layout = () => {
      const p = hs.map(h => [h.offsetLeft, h.offsetTop]);
      main.setAttribute('d', 'M' + p.map(q => q.join(',')).join(' L'));
      const b = p[p.length - 1];
      // gray diagonal = the same line as the steps, extended to the hero's top and bottom edges
      const ox = steps.offsetParent.offsetLeft + steps.offsetLeft, oy = steps.offsetParent.offsetTop + steps.offsetTop;
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
      [400, 1700, 3000].forEach((t, i) => setTimeout(() => light(i), t)); // matches the CSS draw timing (.hero-line)
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

  /* ---------- 3. Projects ease in as the hero scrolls away ---------- */
  const heroEl = document.querySelector('.hero'), mainEl = document.querySelector('main');
  const lift = () => { if (heroEl) mainEl.style.setProperty('--reveal', Math.min(1, scrollY / (heroEl.offsetHeight * 0.7))); };

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
    const r = proj.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    setActive(Math.min(cards.length - 1, Math.floor(p * cards.length)));
  }
  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((c, k) => c.classList.toggle('active', k === i));
    projSteps.forEach((s, k) => { s.classList.toggle('on', k <= i); s.classList.toggle('current', k === i); s.firstChild.classList.toggle('on', k <= i); s.firstChild.classList.toggle('current', k === i); });
    proj.querySelector('.steps').style.setProperty('--fill', ((i + 0.5) / cards.length * 100) + '%');
  }
  // one gesture = one project: inside the pinned range, wheel/keys/swipe step exactly one card
  const stepTop = k => proj.offsetTop + mainEl.offsetTop + (k + 0.5) / cards.length * (proj.offsetHeight - innerHeight);
  const goTo = k => { busyUntil = performance.now() + 750; setActive(k); scrollTo({ top: stepTop(k), behavior: reduce ? 'auto' : 'smooth' }); };
  projSteps.forEach((s, k) => s.addEventListener('click', () => goTo(k)));
  let lastInput = 0, held = false;
  function step(dir, e) {
    if (!proj || !pinned.matches) return;
    const top = proj.offsetTop + mainEl.offsetTop, y = scrollY;
    if (y < top - 2 || y > top + proj.offsetHeight - innerHeight + 2) return; // not pinned right now
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
  let morph = null, mg = null;
  if (hstepEls.length === 3 && bar && !reduce) {
    morph = document.createElement('div');
    morph.className = 'morph'; morph.setAttribute('aria-hidden', 'true');
    morph.innerHTML = '<div class="m-line"><i></i></div><span class="node"></span><span class="node"></span><span class="node"></span>';
    document.body.append(morph);
    const mLine = morph.firstChild, mFill = mLine.firstChild, mNodes = [...morph.querySelectorAll('.node')];
    const btns = [...bar.querySelectorAll('.step')];
    function morphLayout() {
      if (!pinned.matches) { mg = null; return; }
      const sw = steps.offsetParent, wrap = bar.offsetParent;
      const S = hstepEls.map(h => [sw.offsetLeft + steps.offsetLeft + h.offsetLeft, sw.offsetTop + steps.offsetTop + h.offsetTop]);
      const top = proj.offsetTop + mainEl.offsetTop, by = wrap.offsetTop + bar.offsetTop + 1;  // bar's y at the moment it pins
      const bx0 = wrap.offsetLeft + bar.offsetLeft, bw = bar.offsetWidth;
      mg = { S, top, start: { x: S[0][0], y: S[0][1], ang: Math.atan2(S[2][1] - S[0][1], S[2][0] - S[0][0]), len: Math.hypot(S[2][0] - S[0][0], S[2][1] - S[0][1]) },
             end: { x: bx0, y: by, ang: 0, len: bw }, f0: [0, .5, 1], f1: btns.map(b => (b.offsetLeft + b.offsetWidth / 2) / bw) };
    }
    const mix = (a, b, k) => a + (b - a) * k;
    function morphUpdate() {
      const on = mg && scrollY > 0 && scrollY < mg.top;
      document.documentElement.classList.toggle('morphing', !!on);
      if (!on) { morph.style.display = 'none'; heroEl.style.setProperty('--hlbl', scrollY > 0 && mg ? 0 : 1); return; }
      const r = scrollY / mg.top, k = r * r * (3 - 2 * r);                 // smoothstep
      // the start point rides up with the hero a little, then settles where the bar will pin
      const x = mix(mg.start.x, mg.end.x, k), y = mix(mg.start.y - scrollY * (1 - k), mg.end.y, k);
      const ang = mix(mg.start.ang, mg.end.ang, k), len = mix(mg.start.len, mg.end.len, k);
      const fs = mg.f0.map((f, i) => mix(f, mg.f1[i], k));
      morph.style.display = 'block';
      mLine.style.cssText = `left:${x}px;top:${y}px;width:${len}px;transform:rotate(${ang}rad)`;
      mFill.style.width = mix(100, mg.f1[0] * 100, k) + '%';                // blue: whole hero line → up to project 01
      const c = Math.cos(ang), s = Math.sin(ang), size = mix(28, 18, k);
      mNodes.forEach((n, i) => {
        n.style.cssText = `left:${x + c * len * fs[i]}px;top:${y + s * len * fs[i]}px;width:${size}px;height:${size}px`;
        const cur = k < .5 ? i === 2 : i === 0;                            // Validate is current → then project 01
        n.classList.toggle('current', cur); n.classList.toggle('on', k < .5 || i === 0);
      });
      heroEl.style.setProperty('--hlbl', Math.max(0, 1 - r * 5));          // Why/Decide/Validate labels fade quickly
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
