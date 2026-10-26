(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  root.classList.add('js');
  if (reduce) root.classList.add('reduce');
  const $ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const safe = fn => { try { fn(); } catch (e) { console.warn('animation skipped:', e); } };
  const wrap = document.body.firstElementChild;
  const nav = wrap && wrap.firstElementChild;
  const h1 = document.querySelector('h1');
  const hasIO = typeof IntersectionObserver !== 'undefined';
  let introDelay = 0;

  /* 1. intro curtain (once per visit) */
  safe(() => {
    if (reduce) return;
    let seen = false;
    try { seen = sessionStorage.getItem('intro') === '1'; sessionStorage.setItem('intro', '1'); } catch (e) {}
    if (seen) return;
    const c = document.createElement('div');
    c.className = 'curtain';
    c.innerHTML = '<b>AS</b>';
    document.body.appendChild(c);
    introDelay = 900;
    requestAnimationFrame(() => c.classList.add('in'));
    setTimeout(() => c.classList.add('go'), 650);
    setTimeout(() => c.remove(), 1700);
  });

  /* 2. nav, progress bar, scroll-linked photo */
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
  const heroImg = document.querySelector('img[alt*="Sedik"]');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
      if (nav && !reduce) nav.classList.toggle('hide', y > lastY && y > 120);
      if (heroImg && !reduce) {
        const r = heroImg.parentElement.getBoundingClientRect();
        const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
        heroImg.style.transform = 'translate3d(0,' + ((p - 0.5) * -40) + 'px,0) scale(1.12)';
      }
      lastY = y; ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  document.addEventListener('touchstart', function () {}, { passive: true });

  const io = hasIO ? new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, wait = el.hasAttribute('data-hero') ? introDelay : 0;
      io.unobserve(el);
      setTimeout(() => {
        el.classList.add('is-in');
        if (el.hasAttribute('data-reveal')) {
          const d = parseFloat(el.style.getPropertyValue('--d')) || 0;
          setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, 1500 + d);
        }
      }, wait);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }) : null;

  /* 3. split text: letters in the name, words in headings */
  const split = (el, chars) => {
    if (el.children.length || !el.textContent.trim()) return false;
    const txt = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', txt);
    el.textContent = '';
    el.classList.add('split');
    let i = 0;
    txt.split(' ').forEach((word, k, all) => {
      const wd = document.createElement('span');
      wd.className = 'word'; wd.setAttribute('aria-hidden', 'true');
      (chars ? Array.from(word) : [word]).forEach(unit => {
        const w = document.createElement('span'), s = document.createElement('span');
        w.className = 'w'; s.textContent = unit; s.style.setProperty('--i', i++);
        w.appendChild(s); wd.appendChild(w);
      });
      el.appendChild(wd);
      if (k < all.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return true;
  };
  safe(() => {
    if (reduce || !io) return;
    const done = new Set();
    if (h1 && split(h1, true)) { h1.setAttribute('data-hero', ''); io.observe(h1); done.add(h1); }
    const cands = h1 && h1.parentElement ? Array.from(h1.parentElement.children).filter(c => c !== h1 && c.tagName === 'DIV' && c.children.length === 0 && c.textContent.trim().length > 20 && c.textContent.trim().length < 140) : [];
    const headline = cands.sort((a, b) => b.textContent.length - a.textContent.length)[0];
    if (headline && split(headline, false)) { headline.style.setProperty('--base', '350ms'); headline.setAttribute('data-hero', ''); io.observe(headline); done.add(headline); }
    $('h2,h3').forEach(h => {
      if (nav && nav.contains(h)) return;
      if (split(h, false)) {
        io.observe(h); done.add(h);
        if (h.tagName === 'H2') { h.classList.add('ul'); }
      }
    });
  });

  /* 4. cards and blocks rise, tilt and settle; section chips pop */
  safe(() => {
    if (!io) return;
    const targets = new Set();
    $('[style*="grid-template-columns"]').forEach(g => {
      Array.from(g.children).forEach((c, i) => {
        if (h1 && c.contains(h1)) return;
        c.style.setProperty('--d', Math.min(i, 8) * 90 + 'ms');
        c.style.setProperty('--rot', (i % 2 ? -1.4 : 1.4) + 'deg');
        targets.add(c);
      });
    });
    if (h1) Array.from(h1.parentElement.children).forEach((c, i) => {
      if (c === h1 || c.classList.contains('split')) return;
      c.style.setProperty('--d', 500 + i * 90 + 'ms'); c.setAttribute('data-hero', ''); targets.add(c);
    });
    targets.forEach(e => { if (!(nav && nav.contains(e))) { e.setAttribute('data-reveal', ''); io.observe(e); } });
    if (!reduce) $('div').filter(d => d.children.length === 0 && /^\d\d$/.test(d.textContent.trim()) && (d.getAttribute('style') || '').includes('font-size:22px')).forEach(c => { c.classList.add('chip'); io.observe(c); });
  });

  /* 5. odometer numbers */
  safe(() => {
    if (reduce || !hasIO) return;
    const nums = $('[style*="font-size:56px"]').filter(e => e.children.length === 0 && /^(\+?\d+%?|\d+→\d+)$/.test(e.textContent.trim()));
    const nio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      nio.unobserve(e.target);
      $('.strip', e.target).forEach(s => { s.style.transform = 'translateY(' + (-(10 + Number(s.dataset.d))) + 'em)'; });
    }), { threshold: 0.6 });
    nums.forEach(el => {
      const txt = el.textContent.trim(); let k = 0;
      el.setAttribute('aria-label', txt); el.textContent = '';
      Array.from(txt).forEach(ch => {
        if (/\d/.test(ch)) {
          const col = document.createElement('span'), strip = document.createElement('span');
          col.className = 'roll'; col.setAttribute('aria-hidden', 'true');
          strip.className = 'strip'; strip.dataset.d = ch; strip.style.setProperty('--k', k++);
          for (let n = 0; n < 20; n++) { const s = document.createElement('span'); s.textContent = n % 10; strip.appendChild(s); }
          col.appendChild(strip); el.appendChild(col);
        } else { const s = document.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); }
      });
      nio.observe(el);
    });
  });

  /* 6. keyword strip: speeds up and reverses with scrolling */
  safe(() => {
    const ticker = $('div').find(d => d.querySelectorAll(':scope > span').length >= 5 && d.textContent.includes('★'));
    if (!ticker) return;
    const html = ticker.innerHTML;
    ticker.classList.add('ticker');
    ticker.innerHTML = '<div class="track"><div class="seg">' + html + '</div><div class="seg" aria-hidden="true">' + html + '</div></div>';
    if (reduce) return;
    const track = ticker.firstElementChild, seg = track.firstElementChild;
    let pos = 0, dir = 1, vel = 0, last = performance.now(), ly = scrollY, vis = true;
    if (hasIO) new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(ticker);
    const loop = t => {
      const dt = Math.min(64, t - last); last = t;
      if (vis) {
        const dy = scrollY - ly; ly = scrollY;
        vel += (Math.abs(dy) - vel) * 0.1;
        if (dy !== 0) dir = dy > 0 ? 1 : -1;
        const w = seg.offsetWidth || 1;
        pos = (((pos + dir * (0.05 + vel * 0.012) * dt) % w) + w) % w;
        track.style.transform = 'translate3d(' + (-pos) + 'px,0,0)';
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  /* 7. buttons and cards: hover, press, tap ripple, tilt */
  safe(() => {
    const shadowSize = el => parseInt((el.style.boxShadow || '').trim()) || 6;
    const fx = new Set();
    $('a[style*="box-shadow"]').forEach(a => fx.add(a));
    $('a').filter(a => /View case study/.test(a.textContent)).forEach(a => {
      const card = a.closest('div[style*="box-shadow"]');
      if (card) { card.setAttribute('data-card', ''); fx.add(card); }
    });
    fx.forEach(el => { el.classList.add('fx'); el.style.setProperty('--s', shadowSize(el) + 'px'); });
    if (!reduce) $('a.fx').forEach(a => {
      a.classList.add('rip-host');
      a.addEventListener('pointerdown', e => {
        const r = a.getBoundingClientRect(), d = document.createElement('span');
        d.className = 'ripple';
        d.style.left = e.clientX - r.left + 'px'; d.style.top = e.clientY - r.top + 'px';
        d.style.setProperty('--sc', Math.max(r.width, r.height) * 0.27);
        a.appendChild(d); setTimeout(() => d.remove(), 700);
      });
    });
    if (fine && !reduce) $('[data-card]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 8 + 'deg');
        card.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 8 + 'deg');
      });
      card.addEventListener('mouseleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  });

  /* 8. desktop mouse effects: cursor, drift, magnetic buttons */
  safe(() => {
    if (!fine || reduce) return;
    const c = document.createElement('div');
    c.className = 'cursor';
    c.innerHTML = '<i><span>View</span></i>';
    document.body.appendChild(c);
    const photo = heroImg && heroImg.parentElement;
    const magnets = $('a').filter(a => /^(Contact me|Email me)$/.test(a.textContent.trim()));
    let mx = -100, my = -100, cx = -100, cy = -100, nx = 0, ny = 0, px = 0, py = 0, raf = 0;
    const tick = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      px += (nx - px) * 0.08; py += (ny - py) * 0.08;
      c.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      if (photo) photo.style.transform = 'translate3d(' + px * 12 + 'px,' + py * 12 + 'px,0)';
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
  });
})();
