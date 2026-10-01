/* ═══════════════════════════════════════════════════════════
   Ardesku — ardesku.com
   Cada bloque va aislado en safe(): si uno falla, el resto de la página sigue viva.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const deskMQ = matchMedia('(min-width: 900px)');
  const reduce = () => reduceMQ.matches;
  const safe = (name, fn) => { try { return fn(); } catch (err) { console.error('[ardesku] ' + name, err); } };
  /* Escenas de «Servicios» y del panel del cliente: NO son vídeos. Las dibuja en vivo assets/escenas.js encima de la imagen fija
     de cada marco (misma escena, pero nítida y al ritmo de la pantalla, también con el iPhone en ahorro de batería).
     El script se pide solo cuando hace falta; si no llega, se queda la imagen fija. */
  const ASSET_VER = (() => { const s = document.currentScript; const q = s && s.src ? s.src.split('?')[1] : ''; return q ? '?' + q : ''; })();
  const PLAY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  let scenesP = null;
  const loadScenes = () => scenesP || (scenesP = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = '/assets/escenas.js' + ASSET_VER;
    sc.onload = () => (window.ArdeskuEscenas ? res(window.ArdeskuEscenas) : rej(new Error('escenas')));
    sc.onerror = () => { scenesP = null; rej(new Error('escenas')); };
    document.head.appendChild(sc);
  }));
  const liveScenes = new Map();   // marco → escena montada
  /* Con «reducir movimiento» la escena no arranca sola: botón «Reproducir» sobre la imagen fija */
  function tapToPlay(box, show) {
    if (!box.querySelector('.vplay')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vplay';
      b.setAttribute('aria-label', 'Reproducir la animación');
      b.innerHTML = '<span>' + PLAY_ICON + 'Reproducir</span>';
      b.addEventListener('click', () => { box.dataset.manual = '1'; playScene(box, true); });
      box.appendChild(b);
    }
    box.classList.toggle('needs-tap', show);
  }
  function playScene(box, restart) {
    if (!box) return;
    box.dataset.want = '1';
    if (reduce() && box.dataset.manual !== '1') { tapToPlay(box, true); return; }
    loadScenes().then((api) => {
      if (box.dataset.want !== '1') return;
      let sc = liveScenes.get(box);
      if (!sc) { sc = api.mount(box, box.dataset.scene); if (!sc) return; liveScenes.set(box, sc); }
      box.classList.remove('needs-tap');
      box.dataset.live = '1';
      sc.play(restart);
    }).catch(() => {});
  }
  function stopScene(box, unmount) {
    if (!box) return;
    box.dataset.want = '0';
    box.dataset.live = '0';
    const sc = liveScenes.get(box);
    if (!sc) return;
    sc.pause();
    if (unmount) { sc.destroy(); liveScenes.delete(box); }   // desmontar libera sus capas; al volver empieza de cero
  }

  /* ── Menú a pantalla completa ── */
  const overlay = $('#nav-fullscreen');
  const menuBtn = $('#menu-btn');
  const setNav = (open) => {
    overlay.classList.toggle('open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  safe('menu', () => {
    menuBtn.addEventListener('click', () => setNav(!overlay.classList.contains('open')));
    $$('[data-close]').forEach((a) => a.addEventListener('click', () => setNav(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
  });

  /* ── Revelado al hacer scroll ── */
  safe('reveal', () => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: 0.1 });
    $$('.reveal').forEach((el) => io.observe(el));
  });

  /* ── Elementos de scroll ── */
  const navbar = $('#navbar');
  const hero = $('#hero');
  const navSections = [['hero', true, true], ['nosotros', false], ['servicios', false], ['beneficios', true], ['casos', false], ['contacto', true]]
    .map(([id, dark, isHero]) => ({ el: document.getElementById(id), dark, isHero: !!isHero })).filter((s) => s.el);

  function updateNav() {
    let cur = navSections[0];
    for (let i = navSections.length - 1; i >= 0; i--) {
      if (navSections[i].el.getBoundingClientRect().top <= 50) { cur = navSections[i]; break; }
    }
    navbar.classList.toggle('on-hero', cur.isHero);
    navbar.classList.toggle('on-dark', !cur.isHero && cur.dark);
  }

  const npItems = $$('.np-item');
  const npFill = $('#np-fill');
  const npSecs = npItems.map((b) => document.getElementById(b.dataset.target));
  safe('progreso-click', () => npItems.forEach((b) => b.addEventListener('click', () => {
    const t = document.getElementById(b.dataset.target);
    if (t) t.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' });
  })));
  function updateProgress() {
    const mid = innerHeight * 0.45;
    let a = 0;
    npSecs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= mid) a = i; });
    npItems.forEach((it, i) => it.classList.toggle('active', i === a));
    npFill.style.height = (a / (npItems.length - 1)) * 100 + '%';
  }

  const wa = $('#wa-float');
  function updateWA() { if (hero.getBoundingClientRect().bottom < innerHeight * 0.6) wa.classList.add('visible'); }
  setTimeout(() => wa.classList.add('visible'), 3000);

  /* ── Servicios: escenas en scroll fijo (escritorio) o apiladas (móvil) ── */
  const svcWrap = $('#svc-wrap');
  const svcs = $$('.svc');
  const dots = $$('.svc-dot');
  const svcFrames = svcs.map((s) => $('.svc-frame', s));
  let svcActive = -1;
  let svcVisible = false;
  let svcGc = 0;

  function setSvc(i) {
    if (i === svcActive) return;
    svcActive = i;
    svcs.forEach((s, k) => s.classList.toggle('is-active', k === i));
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    svcFrames.forEach((b, k) => { if (k === i && svcVisible) playScene(b, true); else stopScene(b); });
    // las que ya no se ven se desmontan cuando acaba el fundido
    clearTimeout(svcGc);
    svcGc = setTimeout(() => { if (deskMQ.matches) svcFrames.forEach((b, k) => { if (k !== svcActive) stopScene(b, true); }); }, 900);
  }
  function updateSvc() {
    if (!deskMQ.matches) return;
    const r = svcWrap.getBoundingClientRect();
    const total = svcWrap.offsetHeight - innerHeight;
    setSvc(Math.floor(clamp(-r.top / total, 0, 0.9999) * svcs.length));
  }
  safe('servicios', () => {
    // el script de las escenas se pide un poco antes de llegar a la sección
    const pre = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      pre.disconnect();
      if (!reduce()) loadScenes().catch(() => {});
    }, { rootMargin: '700px 0px' });
    pre.observe(svcWrap);

    new IntersectionObserver((es) => es.forEach((e) => {
      svcVisible = e.isIntersecting;
      if (deskMQ.matches) svcFrames.forEach((b, k) => { if (svcVisible && k === svcActive) playScene(b); else stopScene(b, !svcVisible); });
    })).observe(svcWrap);

    // móvil: cada escena corre solo mientras se ve, y se desmonta cuando queda lejos
    const mobileIO = new IntersectionObserver((es) => es.forEach((e) => {
      if (deskMQ.matches) return;
      if (e.isIntersecting) playScene(e.target); else stopScene(e.target);
    }), { threshold: 0.35 });
    const farIO = new IntersectionObserver((es) => es.forEach((e) => {
      if (!deskMQ.matches && !e.isIntersecting) stopScene(e.target, true);
    }), { rootMargin: '120% 0px' });
    svcFrames.forEach((f) => { mobileIO.observe(f); farIO.observe(f); });

    dots.forEach((d, i) => d.addEventListener('click', () => {
      const total = svcWrap.offsetHeight - innerHeight;
      const top = svcWrap.getBoundingClientRect().top + scrollY + ((i + 0.5) / svcs.length) * total;
      scrollTo({ top, behavior: reduce() ? 'auto' : 'smooth' });
    }));
    deskMQ.addEventListener('change', () => {
      svcActive = -1;
      svcFrames.forEach((b) => { stopScene(b, true); mobileIO.unobserve(b); mobileIO.observe(b); });
      updateSvc();
    });
  });

  /* ── Cumplimiento: el recorrido de una llamada (vive en la página adicional «Infraestructura y cumplimiento») ── */
  const cmp = $('#cumplimiento');
  const cmpIsOpen = () => !!(cmp && cmp.open);
  const jr = $('#journey');
  const jrFill = $('#jr-fill');
  const jrToken = $('#jr-token');
  const jrSteps = $$('.jr-step', jr);
  const jrPhases = $$('.jr-pill.phase', jr);
  const jrEnd = $('.jr-end', jr);
  const jrLine = $('.jr-line', jr);
  const jrEndPill = $('.jr-pill', jrEnd);
  const jrPanel = $('#jr-panel');
  function updateJourney() {
    if (!cmpIsOpen()) return;
    const r = jr.getBoundingClientRect();
    const maxY = jrEnd.offsetTop + jrEndPill.offsetTop + jrEndPill.offsetHeight / 2;   // la línea acaba en "Registro en el panel"
    jrLine.style.bottom = 'auto';
    jrLine.style.height = maxY + 'px';
    const yRaw = innerHeight * 0.55 - r.top;          // posición real de la mirada, sin limitar
    const y = clamp(yRaw, 0, maxY);
    jrFill.style.height = y + 'px';
    jrToken.style.top = y + 'px';
    jrSteps.forEach((s) => s.classList.toggle('on', s.offsetTop + 34 <= y));
    jrPhases.forEach((p) => p.classList.toggle('on', p.offsetTop + 12 <= y));
    jrPanel.classList.toggle('on', jrEnd.offsetTop + 70 <= yRaw);
  }
  safe('panel-escena', () => {
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) playScene(jrPanel); else stopScene(jrPanel); }), { threshold: 0.3 }).observe(jrPanel);
  });

  /* ── Un único manejador de scroll (con rAF) ── */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      safe('nav', updateNav); safe('progreso', updateProgress); safe('wa', updateWA); safe('svc', updateSvc); safe('journey', updateJourney);
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ── Infraestructura y cumplimiento: página adicional que solo se abre al pulsar el botón de «Llamadas Automatizadas» ── */
  function cmpOpen(fromHistory) {
    if (!cmp || cmpIsOpen()) return;
    if (typeof cmp.showModal === 'function') cmp.showModal(); else cmp.setAttribute('open', '');
    document.body.classList.add('cmp-open');
    cmp.scrollTop = 0;
    if (!fromHistory) history.pushState({ cmp: 1 }, '', '#cumplimiento');
    requestAnimationFrame(() => safe('journey', updateJourney));
  }
  function cmpHide() {
    if (!cmpIsOpen()) return;
    if (typeof cmp.close === 'function') cmp.close(); else cmp.removeAttribute('open');
    document.body.classList.remove('cmp-open');
    stopScene(jrPanel, true);
    if (location.hash === '#cumplimiento') history.replaceState(null, '', location.pathname + location.search);
  }
  function cmpClose() {
    if (!cmpIsOpen()) return;
    if (history.state && history.state.cmp) history.back(); else cmpHide();   // si la abrimos nosotros, «atrás» la cierra (popstate)
  }
  safe('cumplimiento', () => {
    if (!cmp) return;
    $$('a[href="#cumplimiento"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); cmpOpen(); }));
    $$('[data-cmp-close]', cmp).forEach((b) => b.addEventListener('click', cmpClose));
    cmp.addEventListener('cancel', (e) => { e.preventDefault(); cmpClose(); });          // tecla Escape
    cmp.addEventListener('close', () => document.body.classList.remove('cmp-open'));
    cmp.addEventListener('scroll', onScroll, { passive: true });
    addEventListener('popstate', () => {
      const want = !!(history.state && history.state.cmp) || location.hash === '#cumplimiento';
      if (want && !cmpIsOpen()) cmpOpen(true); else if (!want && cmpIsOpen()) cmpHide();
    });
    if (location.hash === '#cumplimiento') cmpOpen(true);
  });

  /* ── Relojes de cada país (horario legal por país) ── */
  safe('relojes', () => {
    const els = $$('[data-tz]');
    const fmts = {};
    const tick = () => {
      const now = new Date();
      els.forEach((el) => {
        const tz = el.dataset.tz;
        if (!fmts[tz]) fmts[tz] = new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
        el.textContent = fmts[tz].format(now);
      });
    };
    tick();
    setInterval(tick, 20000);
  });

  /* ── Foco de luz que sigue al puntero en el hero ── */
  safe('foco', () => {
    if (!matchMedia('(hover: hover)').matches || reduce()) return;
    const spot = $('.hero-spot');
    let raf = 0;
    hero.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = hero.getBoundingClientRect();
        spot.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        spot.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  });

  /* ── Llamada de demostración del hero: María (español) o Anna (italiano). Se ve una cada vez; el selector cambia entre ellas ── */
  safe('llamada', () => {
    const lc = $('#lc');
    const agents = JSON.parse($('#demo-data').textContent).agents;
    const chat = $('#lc-chat'), wave = $('#lc-wave'), pill = $('#lc-pill'), pillT = $('#lc-pill-t'), res = $('#lc-res');
    const btn = $('#lc-play'), btnT = $('#lc-btn-t'), btnS = $('#lc-btn-s'), ring = $('#lc-ring'), icPlay = $('#lc-ic-play'), icStop = $('#lc-ic-stop'), audio = $('#lc-audio');
    const sw = $('#lc-sw'), swBtns = $$('.lc-sw-b', sw);

    const N = 36;
    const bars = [];
    for (let i = 0; i < N; i++) { const b = document.createElement('i'); wave.appendChild(b); bars.push(b); }

    // Línea de tiempo de cada agente: cada palabra con su instante exacto
    agents.forEach((ag) => {
      const ev = [];
      ag.lines.forEach((m) => ev.push({ who: 'ag', t: m.t, d: m.d, words: m.words.map((w) => ({ w: w.w, at: m.t + w.s })) }));
      ag.cliente.forEach((c) => {
        const ws = c.text.split(' ');
        const per = c.d / ws.length;
        ev.push({ who: 'cli', t: c.t, d: c.d, words: ws.map((w, i) => ({ w, at: c.t + i * per })) });
      });
      ag.ev = ev.sort((x, y) => x.t - y.t);
      ag.connect = ag.lines[0].t - 0.05;
      ag.loopEnd = ag.total + 4;
    });

    let A = agents[0];                // agente que se está mostrando
    let mode = 'silent';              // 'silent' = bucle ambiental · 'audio' = sincronizado con la voz
    let base = performance.now();
    let pausedAt = performance.now();
    let raf = 0;
    let shownPill = '';
    const clock = () => (mode === 'audio' ? audio.currentTime : (performance.now() - base) / 1000);

    function setState(s, txt) {
      const label = txt || (s === 'dial' ? 'Llamando…' : s === 'done' ? 'Completada' : '<span class="pl">En llamada · </span>00:00');
      if (shownPill === s + label) return;
      shownPill = s + label;
      pill.dataset.s = s;
      pillT.innerHTML = label;   // solo cadenas propias y un número: sin datos externos
      lc.classList.toggle('is-dialing', s === 'dial');
    }
    function reset() {
      chat.textContent = '';
      chat.classList.remove('scrolled');
      res.classList.remove('on');
      A.ev.forEach((e) => { e.el = null; e.n = 0; e.spans = null; });
      wave.dataset.who = '';
      lc.classList.remove('speak-ag');
      shownPill = '';
      setState('dial');
      bars.forEach((b) => { b.style.transform = 'scaleY(.08)'; });
    }
    function mkMsg(e) {
      const row = document.createElement('div');
      row.className = 'msg ' + e.who;
      const wrap = document.createElement('div');
      const b = document.createElement('div');
      b.className = 'b';
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = e.who === 'ag' ? A.name : 'Cliente';
      const t = document.createElement('div');
      t.className = 't';
      e.spans = e.words.map((x, i) => {
        const sp = document.createElement('span');
        sp.textContent = x.w + (i < e.words.length - 1 ? ' ' : '');
        t.appendChild(sp);
        return sp;
      });
      b.append(who, t);
      wrap.appendChild(b);
      row.appendChild(wrap);
      chat.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add('on')));
      e.el = row;
      followChat();
    }
    function followChat() {
      const go = () => {
        const over = chat.scrollHeight > chat.clientHeight + 2;
        chat.classList.toggle('scrolled', over && chat.scrollTop > 2);
        if (over) { chat.scrollTop = chat.scrollHeight; chat.classList.add('scrolled'); }
      };
      [80, 320, 620].forEach((ms) => setTimeout(go, ms));
    }
    function staticFinal() {
      reset();
      A.ev.forEach((e) => { mkMsg(e); e.spans.forEach((sp) => sp.classList.add('on')); e.n = e.words.length; });
      res.classList.add('on');
      setState('done');
      bars.forEach((b) => { b.style.transform = 'scaleY(.1)'; });
      chat.style.scrollBehavior = 'auto';
      setTimeout(() => { chat.scrollTop = chat.scrollHeight; chat.classList.toggle('scrolled', chat.scrollTop > 2); }, 120);
    }

    function frame() {
      raf = 0;
      if (mode === 'silent' && clock() >= A.loopEnd) { reset(); base = performance.now(); }
      const t = clock();
      if (mode === 'audio') {      // anillo de progreso y tiempo en el botón
        const dur = audio.duration > 0 ? audio.duration : A.total;
        ring.style.strokeDashoffset = String(100 - 100 * Math.min(1, t / dur));
        setSub('Reproduciendo · ' + fmt(t) + ' / ' + fmt(dur));
      }
      let speaker = null;
      for (const e of A.ev) {
        if (t >= e.t - 0.04 && !e.el) mkMsg(e);
        if (e.el) { while (e.n < e.words.length && t >= e.words[e.n].at) { e.spans[e.n].classList.add('on'); e.n++; } }
        if (t >= e.t && t < e.t + e.d + 0.08) speaker = e.who;
      }
      if (t >= A.result) res.classList.add('on');
      if (t < A.connect) setState('dial');
      else if (t >= A.result) setState('done');
      else setState('live', '<span class="pl">En llamada · </span>00:' + String(Math.floor(t - A.connect)).padStart(2, '0'));

      wave.dataset.who = speaker || '';
      lc.classList.toggle('speak-ag', speaker === 'ag');
      for (let i = 0; i < N; i++) {
        const edge = Math.sin((Math.PI * (i + 0.5)) / N);
        let v;
        if (speaker) {
          const wob = Math.abs(Math.sin(t * 9.2 + i * 0.7) * Math.sin(t * 5.1 + i * 1.31));
          v = (0.18 + 0.82 * wob) * (0.35 + 0.65 * edge) * (speaker === 'ag' ? 1 : 0.55);
        } else v = t < A.connect ? 0.07 + 0.05 * Math.sin(t * 3 + i) : 0.07;
        bars[i].style.transform = 'scaleY(' + Math.max(0.08, v).toFixed(3) + ')';
      }
      raf = requestAnimationFrame(frame);
    }
    const startLoop = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const stopLoop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    // Botón de audio: solo existe si el navegador puede reproducir el mp3
    const canPlay = !!(audio.canPlayType && audio.canPlayType('audio/mpeg'));
    const fmt = (sec) => Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
    let shownSub = '';
    const setSub = (txt) => { if (txt !== shownSub) { shownSub = txt; btnS.textContent = txt; } };
    const setBtn = (on) => {
      btn.setAttribute('aria-pressed', String(on));
      btnT.textContent = on ? 'Detener' : 'Escuchar a ' + A.name;
      icPlay.toggleAttribute('hidden', on); icStop.toggleAttribute('hidden', !on);   // son SVG: no tienen la propiedad .hidden
      if (!on) { setSub(A.sub); ring.style.strokeDashoffset = '100'; }
    };
    const rewind = () => { try { audio.currentTime = 0; } catch (err) { /* Safari antiguo: aún no hay metadatos, ya está en 0 */ } };
    function stopAudio() { audio.pause(); rewind(); mode = 'silent'; setBtn(false); reset(); base = performance.now(); if (reduce()) staticFinal(); }
    async function startAudio() {
      reset();
      mode = 'audio';
      rewind();
      try { await audio.play(); } catch (err) { mode = 'silent'; base = performance.now(); if (audio.error) btn.hidden = true; if (reduce()) staticFinal(); return; }
      setBtn(true);
      startLoop();
    }
    if (canPlay) btn.hidden = false;
    // Empieza a descargar el audio (300 KB) solo cuando el usuario se acerca al botón: el clic responde al instante
    const warm = () => { if (audio.preload !== 'auto') { audio.preload = 'auto'; audio.load(); } };
    btn.addEventListener('pointerenter', warm, { once: true });
    btn.addEventListener('focus', warm, { once: true });
    btn.addEventListener('touchstart', warm, { once: true, passive: true });
    btn.addEventListener('click', () => { if (mode === 'audio' && !audio.paused) stopAudio(); else startAudio(); });
    audio.addEventListener('ended', () => {
      setBtn(false);
      if (reduce()) { mode = 'silent'; stopLoop(); staticFinal(); return; }
      mode = 'silent';
      base = performance.now() - A.total * 1000;   // se queda en el resultado y vuelve a empezar
    });

    // Selector: cambia de agente. Si se estaba escuchando a una, pasa a sonar la otra
    function setAgent(id) {
      const next = agents.find((x) => x.id === id);
      if (!next || next === A) return;
      const wasPlaying = mode === 'audio' && !audio.paused;
      audio.pause();
      mode = 'silent';
      A = next;
      sw.dataset.on = A.id;
      swBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.agent === A.id)));
      lc.dataset.agent = A.id;
      $('#lc-ini').textContent = A.ini; $('#lc-name').textContent = A.name; $('#lc-role').textContent = A.role;
      $('#lc-res-t').textContent = A.resT; $('#lc-res-s').textContent = A.resS;
      audio.src = A.audio;
      if (canPlay) btn.hidden = false;
      setBtn(false);
      reset();
      base = performance.now();
      lc.classList.remove('swap'); void lc.offsetWidth; lc.classList.add('swap');
      if (wasPlaying) startAudio(); else if (reduce()) staticFinal();
    }
    swBtns.forEach((b) => b.addEventListener('click', () => setAgent(b.dataset.agent)));

    // Solo anima mientras el hero se ve
    new IntersectionObserver((es) => {
      const vis = es[0].isIntersecting;
      if (vis) {
        if (mode === 'silent') base += performance.now() - pausedAt;
        if (!reduce()) startLoop();
      } else {
        pausedAt = performance.now();
        stopLoop();
        if (mode === 'audio') stopAudio();
      }
    }, { threshold: 0.05 }).observe(hero);

    reset();
    if (reduce()) staticFinal();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pausedAt = performance.now(); stopLoop(); } else if (!reduce()) { if (mode === 'silent') base += performance.now() - pausedAt; startLoop(); } });
  });

  /* ── Formulario de contacto ── */
  const ENDPOINT_CONTACTO = 'https://agende-llamadas-callcenter-n8n.ztbayf.easypanel.host/webhook/web-contacto-ardesku';
  safe('formulario', () => {
    const form = $('#cform');
    const btn = $('#form2-btn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;          // validación nativa: nombre, email y consentimiento
      const original = btn.textContent;
      const datos = Object.fromEntries(new FormData(form).entries());
      datos.consentimiento = form.consentimiento.checked;
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      btn.style.background = '';
      btn.style.color = '';
      try {
        const r = await fetch(ENDPOINT_CONTACTO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if (!r.ok) throw new Error('rechazado');
        btn.textContent = '¡Enviado! Te contactamos pronto';
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        form.reset();
        setTimeout(() => { btn.disabled = false; btn.textContent = original; btn.style.background = ''; btn.style.color = ''; }, 8000);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'No se pudo enviar — escríbenos por WhatsApp';
        btn.style.background = '#ef4444';
        btn.style.color = '#fff';
        setTimeout(() => { btn.textContent = original; btn.style.background = ''; btn.style.color = ''; }, 6000);
      }
    });
  });
})();
