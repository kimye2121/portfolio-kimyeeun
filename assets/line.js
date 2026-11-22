/* One continuous line from the first node to the last.
   Every element with [data-flow] is a stop. The line is drawn
   as you scroll; nodes it has passed light up, the latest one is filled. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'flow');
  svg.setAttribute('aria-hidden', 'true');
  const base = document.createElementNS(NS, 'path');
  const prog = document.createElementNS(NS, 'path');
  base.setAttribute('class', 'base');
  prog.setAttribute('class', 'prog');
  svg.append(base, prog);
  document.body.prepend(svg);

  let nodeLen = [];
  let nodes = [], pts = [], total = 0, table = [], introLen = 0, introDone = reduce, introStart = 0;

  function center(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY, straight: el.hasAttribute('data-straight') };
  }

  function build() {
    svg.style.height = '0px';
    const W = document.documentElement.clientWidth;
    const H = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.style.width = W + 'px'; svg.style.height = H + 'px';

    nodes = [...document.querySelectorAll('[data-flow]')].filter(n => n.offsetParent !== null);
    pts = nodes.map(center);
    if (pts.length < 2) return;

    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (a.straight && b.straight) { d += ` L${b.x},${b.y}`; continue; }
      const dy = Math.max(60, (b.y - a.y) * 0.5);
      d += ` C${a.x},${a.y + dy} ${b.x},${b.y - dy} ${b.x},${b.y}`;
    }
    base.setAttribute('d', d); prog.setAttribute('d', d);
    total = prog.getTotalLength();
    prog.style.strokeDasharray = total;

    // length → y lookup (y is monotonic along the path)
    table = [];
    const N = Math.min(1600, Math.max(300, Math.round(total / 6)));
    let maxY = -Infinity;
    for (let i = 0; i <= N; i++) {
      const l = (total * i) / N;
      maxY = Math.max(maxY, prog.getPointAtLength(l).y);
      table.push([l, maxY]);
    }
    // length up to the last "straight" (hero) node, for the intro draw
    const lastStraight = pts.map(p => p.straight).lastIndexOf(true);
    nodeLen = pts.map((p, i) => i === 0 ? 0 : (i === pts.length - 1 ? total : lenAtY(p.y)));
    introLen = lastStraight > 0 ? nodeLen[lastStraight] : 0;
    update();
  }

  function lenAtY(y) {
    let lo = 0, hi = table.length - 1;
    if (y <= table[0][1]) return 0;
    if (y >= table[hi][1]) return total;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; table[m][1] <= y ? lo = m : hi = m; }
    return table[lo][0];
  }

  function update() {
    if (!table.length) return;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    const target = atBottom ? Infinity : window.scrollY + window.innerHeight * 0.62;
    let len = lenAtY(target);
    if (introLen) {
      const t = introDone ? 1 : Math.min(1, (performance.now() - introStart) / 1600);
      const e = 1 - Math.pow(1 - t, 3);
      len = Math.max(len, introLen * e);
      if (!introDone && t < 1) requestAnimationFrame(update); else introDone = true;
    }
    prog.style.strokeDashoffset = total - len;

    let current = -1;
    pts.forEach((p, i) => {
      const reached = len >= nodeLen[i] - 2;
      nodes[i].classList.toggle('on', reached);
      if (reached) current = i;
    });
    nodes.forEach((n, i) => n.classList.toggle('current', i === current));
  }

  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  window.addEventListener('scroll', onScroll, { passive: true });
  let rt; const rebuild = () => { clearTimeout(rt); rt = setTimeout(build, 80); };
  window.addEventListener('resize', rebuild);
  new ResizeObserver(rebuild).observe(document.querySelector('main') || document.body);
  window.addEventListener('load', build);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  introStart = performance.now();
  build();

  /* header state + reveal */
  const top = document.querySelector('.top');
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const secs = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  window.addEventListener('scroll', () => {
    top && top.classList.toggle('scrolled', window.scrollY > 24);
    const y = window.scrollY + window.innerHeight * 0.4;
    let act = null; secs.forEach(s => { if (s.offsetTop <= y) act = s.id; });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + act));
  }, { passive: true });

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
})();
