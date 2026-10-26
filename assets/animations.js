(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  root.classList.add('js');
  if (reduce) root.classList.add('reduce');
  const $ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = document.body.firstElementChild;
  const nav = wrap && wrap.firstElementChild;

  /* makes tap/press effects work on iPhone */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* nav: sticky, hides on scroll down, shows on scroll up; progress bar */
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);
  if (nav) {
    nav.classList.add('site-nav');
    $('a', nav).forEach(a => {
      const st = a.getAttribute('style') || '';
      if (st.includes('background:#151515') || st.includes('padding:6px 12px')) a.classList.add('btn');
    });
  }
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
      if (nav && !reduce) nav.classList.toggle('hide', y > lastY && y > 120);
      lastY = y; ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* scroll reveals */
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  if (io) {
    const h1 = document.querySelector('h1');
    const targets = new Set();
    $('h1,h2').forEach(e => targets.add(e));
    $('[style*="grid-template-columns"]').forEach(g => {
      Array.from(g.children).forEach((c, i) => {
        if (h1 && c.contains(h1)) return;
        c.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms');
        targets.add(c);
      });
    });
    if (h1) Array.from(h1.parentElement.children).forEach((c, i) => {
      c.style.setProperty('--d', i * 80 + 'ms'); targets.add(c);
    });
    targets.forEach(e => { if (!(nav && nav.contains(e))) { e.setAttribute('data-reveal', ''); io.observe(e); } });
  }

  /* count-up numbers */
  const counters = $('[style*="font-size:56px"]').filter(e => /^(\+?\d+%?|\d+→\d+)$/.test(e.textContent.trim()));
  if (!reduce && io && counters.length) {
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, txt = el.dataset.final, nums = (txt.match(/\d+/g) || []).map(Number), t0 = performance.now();
      const step = t => {
        const p = clamp((t - t0) / 1200, 0, 1), k = 1 - Math.pow(1 - p, 3);
        let i = 0;
        el.textContent = txt.replace(/\d+/g, () => Math.round(nums[i++] * k));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    counters.forEach(el => { el.dataset.final = el.textContent.trim(); el.textContent = el.dataset.final.replace(/\d+/g, '0'); cio.observe(el); });
  }

  /* keyword marquee */
  const ticker = $('div').find(d => d.querySelectorAll(':scope > span').length >= 5 && d.textContent.includes('★'));
  if (ticker) {
    const html = ticker.innerHTML;
    ticker.classList.add('ticker');
    ticker.innerHTML = '<div class="track"><div class="seg">' + html + '</div><div class="seg" aria-hidden="true">' + html + '</div></div>';
  }

  /* hover / press effects, cards, tilt */
  const shadowSize = el => parseInt((el.style.boxShadow || '').trim()) || 6;
  const fx = new Set();
  $('a[style*="box-shadow"]').forEach(a => fx.add(a));
  $('a').filter(a => /View case study/.test(a.textContent)).forEach(a => {
    const card = a.closest('div[style*="box-shadow"]');
    if (card) { card.setAttribute('data-card', ''); fx.add(card); }
  });
  fx.forEach(el => { el.classList.add('fx'); el.style.setProperty('--s', shadowSize(el) + 'px'); });
  if (fine && !reduce) {
    $('[data-card]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 8 + 'deg');
        card.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 8 + 'deg');
      });
      card.addEventListener('mouseleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  /* chart and diagram drawing */
  if (!reduce && io) {
    $('svg[aria-label]').forEach(svg => {
      const label = svg.getAttribute('aria-label').toLowerCase(), vb = svg.viewBox && svg.viewBox.baseVal;
      const parts = $('rect,text,path', svg).filter(el => !(el.tagName === 'rect' && vb && +el.getAttribute('width') >= vb.width - 10));
      parts.forEach((el, i) => { el.classList.add('sv'); el.style.setProperty('--i', Math.min(i, 40)); });
      svg.setAttribute('data-mode', label.includes('schedule') ? 'x' : label.includes('weekly output') ? 'y' : 'fade');
      io.observe(svg);
    });
  }

  /* mouse effects: custom cursor, parallax, magnetic buttons (desktop only) */
  if (fine && !reduce) {
    const c = document.createElement('div');
    c.className = 'cursor';
    c.innerHTML = '<i><span>View</span></i>';
    document.body.appendChild(c);
    const photo = (document.querySelector('img[alt*="Sedik"]') || {}).parentElement;
    const heroTitle = document.querySelector('h1');
    const magnets = $('a').filter(a => /^(Contact me|Email me)$/.test(a.textContent.trim()));
    let mx = -100, my = -100, cx = -100, cy = -100, nx = 0, ny = 0, px = 0, py = 0, raf = 0;
    const tick = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      px += (nx - px) * 0.08; py += (ny - py) * 0.08;
      c.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      if (photo) photo.style.transform = 'translate3d(' + px * 12 + 'px,' + py * 12 + 'px,0)';
      if (heroTitle) heroTitle.style.transform = 'translate3d(' + px * -6 + 'px,' + py * -4 + 'px,0)';
      const more = Math.abs(mx - cx) > 0.3 || Math.abs(my - cy) > 0.3 || Math.abs(nx - px) > 0.002 || Math.abs(ny - py) > 0.002;
      raf = more ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      nx = (e.clientX / innerWidth - 0.5) * 2; ny = (e.clientY / innerHeight - 0.5) * 2;
      c.style.opacity = 1;
      const t = e.target;
      const input = t.closest && t.closest('input,textarea,select');
      const link = t.closest && t.closest('a,button');
      const card = t.closest && t.closest('[data-card]');
      c.classList.toggle('hide', !!input);
      c.classList.toggle('link', !!link);
      c.classList.toggle('view', !!card && !link);
      magnets.forEach(b => {
        const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2;
        const near = e.clientX > r.left - 80 && e.clientX < r.right + 80 && e.clientY > r.top - 80 && e.clientY < r.bottom + 80;
        b.style.setProperty('--mx', near ? clamp((e.clientX - bx) * 0.25, -8, 8) + 'px' : '0px');
        b.style.setProperty('--my', near ? clamp((e.clientY - by) * 0.25, -8, 8) + 'px' : '0px');
      });
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('mouseleave', () => { c.style.opacity = 0; });
  }
})();
