/* The line: Why → Decide → Validate in the hero, then a rail per section.
   Lines live only in the empty left gutter (or the hero's open space) and never
   cross content; between sections they fade out instead of cutting across. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Hero: drawn once on load, then extends past Validate ---------- */
  const steps = document.querySelector('.hero-steps');
  if (steps) {
    const hs = [...steps.querySelectorAll('.hstep')];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hero-line');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<defs><linearGradient id="fade" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#376BFF"/><stop offset="1" stop-color="#376BFF" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="main" pathLength="1"/><path class="ext" pathLength="1" stroke="url(#fade)"/>';
    steps.prepend(svg);
    const [main, ext] = svg.querySelectorAll('path');
    const grad = svg.querySelector('linearGradient');
    const nodes = hs.map(h => h.querySelector('.node'));
    const hero = steps.closest('.hero');

    const layout = () => {
      const p = hs.map(h => [h.offsetLeft, h.offsetTop]);
      main.setAttribute('d', 'M' + p.map(q => q.join(',')).join(' L'));
      // keep going on the Decide→Validate slope; short on mobile so it never reaches the contact line
      const [a, b] = p.slice(-2), dx = b[0] - a[0], dy = b[1] - a[1];
      const len = innerWidth > 760 ? 420 : 90, k = len / Math.hypot(dx, dy);
      const e = [b[0] + dx * k, b[1] + dy * k];
      ext.setAttribute('d', `M${b} L${e}`);
      grad.setAttribute('x1', b[0]); grad.setAttribute('y1', b[1]);
      grad.setAttribute('x2', e[0]); grad.setAttribute('y2', e[1]);
      // gray diagonal = the same line as the steps, extended to the hero's top and bottom edges
      const hr = hero.getBoundingClientRect();
      const c = n => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2 - hr.left, r.top + r.height / 2 - hr.top]; };
      const A = c(nodes[0]), B = c(nodes[nodes.length - 1]), m = (B[0] - A[0]) / (B[1] - A[1]);
      hero.style.setProperty('--x0', (A[0] - m * A[1]) + 'px');
      hero.style.setProperty('--x1', (A[0] + m * (hr.height - A[1])) + 'px');
    };
    layout();
    addEventListener('resize', layout);
    if (document.fonts) document.fonts.ready.then(layout);

    const light = i => { nodes.forEach((n, j) => { n.classList.toggle('on', j <= i); n.classList.toggle('current', j === i); }); };
    if (reduce) { svg.classList.add('drawn'); light(2); }
    else {
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('drawn')));
      [150, 900, 1650].forEach((t, i) => setTimeout(() => light(i), t)); // matches the CSS draw timing
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
