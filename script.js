/* =====================================================================
   DESPACHO LEGAL · «El Expediente Vivo»
   JS vanilla · un solo bucle rAF compartido · sin librerías externas
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Configuración única ---------- */
  const WHATSAPP_NUMERO = '528441063317';   // vacío = se ocultan botón flotante, CTA de WhatsApp y envío
  const NOMBRE_DESPACHO = 'Despacho Legal';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const html = document.documentElement;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(pointer: fine)').matches;
  const HAS_IO = 'IntersectionObserver' in window;
  let listo = false;
  let vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY;

  /* ---------- Nombre y WhatsApp ---------- */
  $$('[data-nombre]').forEach(el => { el.textContent = NOMBRE_DESPACHO; });

  function waURL(texto) {
    return 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(texto);
  }
  function aplicaWA(a) {
    if (!WHATSAPP_NUMERO) return;
    a.href = waURL(a.dataset.wa || '');
    a.target = '_blank';
    a.rel = 'noopener';
  }
  if (WHATSAPP_NUMERO) {
    $$('[data-wa]').forEach(aplicaWA);
  } else {
    $$('[data-wa], [data-wa-info]').forEach(el => { el.hidden = true; });
    const f = $('#form');
    if (f) f.classList.add('is-sin-wa');
  }

  /* ---------- Cargador: apertura de expediente (≤ 2.3 s) ---------- */
  const car = $('#cargador');
  const carNum = $('#carNum');
  function terminaCarga() {
    if (listo) return;
    listo = true;
    html.classList.add('listo');
    html.classList.remove('cargando');
    if (car && car.parentNode) car.parentNode.removeChild(car);
    revelaPendientes();
  }
  if (car) {
    if (RM) {
      setTimeout(terminaCarga, 600);
    } else {
      const t0 = performance.now();
      (function cuenta(now) {
        const p = clamp((now - t0) / 1300);
        if (carNum) carNum.textContent = String(Math.round(p * 100)).padStart(3, '0');
        if (p < 1) requestAnimationFrame(cuenta);
      })(t0);
      setTimeout(() => car.classList.add('abre'), 1450);
      setTimeout(terminaCarga, 2200);
    }
  } else {
    listo = true;
  }
  setTimeout(terminaCarga, 2400); // seguro

  /* ---------- Titulares partidos en palabras ---------- */
  function partePalabras(el) {
    let idx = 0;
    (function recorre(nodo) {
      Array.from(nodo.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const partes = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          partes.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const s = document.createElement('span');
            s.textContent = p;
            s.style.setProperty('--i', idx++);
            w.appendChild(s);
            frag.appendChild(w);
          });
          nodo.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          recorre(n);
        }
      });
    })(el);
  }
  $$('.split').forEach(partePalabras);

  /* ---------- Sistema de revelado + respaldo por geometría ---------- */
  const objetivos = $$('.rv, .split');
  function revela(el) {
    if (el.classList.contains('is-in')) return;
    if (el.dataset.espera && !listo) return;
    el.classList.add('is-in');
    if (io) io.unobserve(el);
  }
  const io = HAS_IO ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) revela(e.target); });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }) : null;
  if (io) objetivos.forEach(o => io.observe(o));

  function revelaGeo() {
    objetivos.forEach(o => {
      if (o.classList.contains('is-in')) return;
      const r = o.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0) revela(o);
    });
  }
  function revelaPendientes() { revelaGeo(); }
  setTimeout(revelaGeo, 2000);
  setTimeout(() => { objetivos.forEach(o => { if (!o.dataset.espera || listo) revela(o); }); }, 5000);
  if (!HAS_IO) objetivos.forEach(revela);

  /* ---------- Estado de scroll compartido ---------- */
  let sucio = true;
  let ticking = false;
  function marcaSucio() {
    sucio = true;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { ticking = false; revelaGeo(); });
    }
  }
  window.addEventListener('scroll', marcaSucio, { passive: true });
  window.addEventListener('resize', () => { vw = window.innerWidth; vh = window.innerHeight; configuraPin(); marcaSucio(); });
  window.addEventListener('load', () => { marcaSucio(); configuraPin(); });

  /* ---------- Visibilidad: pausa lo que no se ve ---------- */
  const vis = { hero: true, portal: false, banda: false };
  if (HAS_IO) {
    const vio = new IntersectionObserver(es => {
      es.forEach(e => {
        const el = e.target;
        el.classList.toggle('pausa', !e.isIntersecting);
        if (el.dataset.vis) vis[el.dataset.vis] = e.isIntersecting;
      });
    }, { rootMargin: '100px 0px 100px 0px' });
    $$('.vivo').forEach(el => vio.observe(el));
    const bandaEl = $('.banda');
    if (bandaEl) new IntersectionObserver(es => { vis.banda = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(bandaEl);
  } else { vis.portal = vis.banda = true; }
  document.addEventListener('visibilitychange', () => { html.classList.toggle('oculto', document.hidden); });

  /* ---------- Header, menú, progreso, folio ---------- */
  const hdr = $('#hdr');
  const menu = $('#menu');
  const menuTg = $('#menuTg');
  function alternaMenu(abrir) {
    const on = abrir === undefined ? !menu.classList.contains('is-open') : abrir;
    menu.classList.toggle('is-open', on);
    menu.setAttribute('aria-hidden', String(!on));
    menuTg.setAttribute('aria-expanded', String(on));
    menuTg.setAttribute('aria-label', on ? 'Cerrar menú' : 'Abrir menú');
    hdr.classList.toggle('is-menu', on);
    html.classList.toggle('menu-abierto', on);
  }
  if (menuTg && menu) {
    menuTg.addEventListener('click', () => alternaMenu());
    $$('a', menu).forEach(a => a.addEventListener('click', () => alternaMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') alternaMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 900) alternaMenu(false); });
  }

  const progreso = $('.progreso');
  const cssTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');
  const usaProgresoJS = !cssTimeline || RM;

  const seccTema = $$('[data-tema]');
  const seccFolio = $$('section[data-folio]');
  const folioTxt = $('#folioTxt');
  let folioActual = -1;

  /* ---------- Medición de progresos de scroll ---------- */
  const el = {
    hero: $('#inicio'), heroTxt: $('#heroTxt'), sello: $('#sello'), selloEsc: $('#selloEsc'),
    maniPista: $('.mani__pista'), maniTags: $('#maniTags'),
    portalPista: $('.portal__pista'), portalFrame: $('#portalFrame'), portalCentro: $('#portalCentro'), tambor: $('#tambor'),
    areas: $('#areas'), areasTrack: $('#areasTrack'), areasBar: $('#areasBar'),
    sucWrap: $('#sucWrap'), escritura: $('#escritura'), sucBarra: $('#sucBarra'),
    procLista: $('#procLista'), procTrazo: $('#procTrazo'), procLuz: $('#procLuz'),
    cierre: $('#cierre'), cierreTxt: $('#cierreTxt')
  };
  const P = { hero: 0, mani: 0, portal: 0, areas: 0, suc: 0, proc: 0, cierre: 0 };
  const S = { hero: 0, mani: 0, portal: 0, areas: 0, suc: 0, proc: 0, cierre: 0 };
  let tema = { h: 'oscuro', f: 'oscuro' };
  const pista = e => { if (!e) return 0; const r = e.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - vh)); };

  function medir() {
    vw = window.innerWidth; vh = window.innerHeight; sy = window.scrollY;
    let th = 'oscuro', tf = 'oscuro';
    seccTema.forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top <= 36 && r.bottom > 36) th = s.dataset.tema;
      if (r.top <= vh - 40 && r.bottom > vh - 40) tf = s.dataset.tema;
    });
    tema = { h: th, f: tf };
    let idx = 0;
    seccFolio.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top <= vh * 0.5 && r.bottom > vh * 0.5) idx = i;
    });
    if (idx !== folioActual && folioTxt) {
      folioActual = idx;
      const n = String(idx + 1).padStart(2, '0');
      folioTxt.style.opacity = 0;
      setTimeout(() => {
        folioTxt.textContent = 'FOLIO ' + n + ' / ' + String(seccFolio.length).padStart(2, '0') + ' · ' + seccFolio[idx].dataset.folio.toUpperCase();
        folioTxt.style.opacity = 1;
      }, 150);
    }
    P.hero = clamp(sy / vh);
    P.mani = pista(el.maniPista);
    P.portal = pista(el.portalPista);
    if (el.areas && pinActivo) P.areas = pista(el.areas);
    if (el.sucWrap) {
      const r = el.sucWrap.getBoundingClientRect();
      P.suc = clamp((vh * 0.5 - r.top) / Math.max(1, r.height - vh * 0.3));
    }
    if (el.procLista) {
      const r = el.procLista.getBoundingClientRect();
      P.proc = clamp((vh * 0.6 - r.top) / Math.max(1, r.height));
    }
    if (el.cierre) {
      const r = el.cierre.getBoundingClientRect();
      P.cierre = clamp((vh - r.top) / (vh * 0.9));
    }
  }

  /* ---------- Manifiesto: lectura palabra por palabra ---------- */
  const maniTxt = $('#maniTxt');
  let maniPal = [];
  if (maniTxt) {
    const palabras = maniTxt.textContent.trim().split(/\s+/);
    maniTxt.textContent = '';
    palabras.forEach((p, i) => {
      const s = document.createElement('span');
      s.className = 'mw';
      s.textContent = p;
      maniTxt.appendChild(s);
      if (i < palabras.length - 1) maniTxt.appendChild(document.createTextNode(' '));
      maniPal.push(s);
    });
    if (RM) maniPal.forEach(s => { s.style.opacity = 1; });
    else maniPal.forEach(s => { s.style.opacity = 0.14; });
  }
  let maniAct = -1;
  function pintaManifiesto(p) {
    const n = maniPal.length;
    const t = p * 1.12 * n;
    let act = -1;
    maniPal.forEach((s, i) => {
      const o = clamp(t - i, 0, 1);
      s.style.opacity = (0.14 + 0.86 * o).toFixed(3);
      if (o > 0.5) act = i;
    });
    if (act !== maniAct) {
      maniPal.forEach((s, i) => s.classList.toggle('is-act', i === act && act < n - 1 || (p > 0.97 && i === act)));
      maniAct = act;
    }
    if (el.maniTags) el.maniTags.style.opacity = clamp((p - 0.82) / 0.15).toFixed(3);
  }
  if (el.maniTags && !RM) el.maniTags.style.opacity = 0;

  /* ---------- Portal: marco que se abre + tambor de folios ---------- */
  let giroTambor = 0;
  function pintaPortal(dt) {
    const p = S.portal;
    const e0 = clamp(p / 0.45);
    const e = 1 - Math.pow(1 - e0, 3);
    if (el.portalFrame) {
      el.portalFrame.style.setProperty('--ins', (14 * (1 - e)).toFixed(2) + 'vh ' + (8 * (1 - e)).toFixed(2) + 'vw');
      el.portalFrame.style.setProperty('--rad', (36 * (1 - e)).toFixed(1) + 'px');
    }
    if (el.portalCentro) el.portalCentro.style.opacity = clamp(0.35 + e * 0.9).toFixed(3);
    if (vis.portal && el.tambor) {
      giroTambor += dt * 0.006; // 6°/s
      el.tambor.style.transform = 'rotateY(' + (giroTambor + p * 160).toFixed(2) + 'deg)';
    }
  }

  /* ---------- Áreas: pin horizontal (≥1024 px) o pila de tomos ---------- */
  const tomos = $$('.tomo');
  const marcas = $$('#areasMarks span');
  let pinActivo = false;
  function configuraPin() {
    if (!el.areas) return;
    const quiere = !RM && window.innerWidth >= 1024;
    if (quiere !== pinActivo) {
      pinActivo = quiere;
      el.areas.classList.toggle('pin-ok', quiere);
      if (!quiere && el.areasTrack) el.areasTrack.style.transform = '';
      tomos.forEach(t => { t.style.removeProperty('--sc'); t.style.removeProperty('--dk'); });
    }
  }
  function pintaAreas() {
    if (!el.areasTrack) return;
    if (pinActivo) {
      const max = Math.max(0, el.areasTrack.scrollWidth - vw);
      const x = S.areas * max;
      el.areasTrack.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
      let act = 0;
      tomos.forEach((t, i) => { if (t.offsetLeft - x < vw * 0.55) act = i + 1; });
      marcas.forEach((m, i) => m.classList.toggle('is-on', i < act));
      if (el.areasBar) el.areasBar.style.transform = 'scaleX(' + S.areas.toFixed(4) + ')';
    } else {
      // tomos apilados: el anterior se reduce y oscurece al llegar el siguiente
      tomos.forEach((t, i) => {
        const sig = tomos[i + 1];
        if (!sig) return;
        const r = sig.getBoundingClientRect();
        const tope = (window.innerWidth < 640 ? 72 : 72) + (i + 1) * 12;
        const p = clamp(1 - (r.top - tope) / (vh * 0.6));
        t.style.setProperty('--sc', (1 - 0.04 * p).toFixed(4));
        t.style.setProperty('--dk', (p * 0.5).toFixed(3));
      });
    }
  }

  /* ---------- Diagnóstico ---------- */
  const DIAG = [
    { area: 'Electoral', tit: 'Es materia electoral.', txt: 'Los juicios para proteger derechos político-electorales tienen plazos breves. Cuéntanos qué ocurrió y revisamos la vía idónea.', wa: 'siento que violaron mis derechos político-electorales' },
    { area: 'Electoral', tit: 'Es materia electoral.', txt: 'Armamos tu defensa dentro del procedimiento: analizamos la queja, las pruebas y los tiempos.', wa: 'me abrieron un procedimiento sancionador electoral' },
    { area: 'Sucesorio', tit: 'Es un juicio sucesorio intestamentario.', txt: 'Ordenamos la sucesión para que el patrimonio de tu familia quede en regla y a nombre de quien corresponde.', wa: 'un familiar falleció sin testamento y dejó una propiedad' },
    { area: 'Sucesorio', tit: 'Es un juicio sucesorio express.', txt: 'Tramitamos el juicio con agilidad para dar certeza jurídica a la operación.', wa: 'quiero vender o comprar una propiedad intestada' },
    { area: 'Penal', tit: 'Es defensa penal.', txt: 'Analizamos tu carpeta o proceso y definimos la estrategia de defensa desde el primer día.', wa: 'tengo un asunto penal, del fuero común o federal' },
    { area: 'Penal', tit: 'Puede proceder una indemnización.', txt: 'Revisamos la actuación de la autoridad y valoramos la vía para obtener el pago de la indemnización.', wa: 'un ministerio público actuó indebidamente y me causó un daño' }
  ];
  const ops = $$('.diag__op');
  const diagInd = $('#diagInd');
  const diagPanel = $('#diagPanel');
  const diagCont = $('#diagCont');
  let diagActual = 0, diagTimer = null;
  function posicionaInd() {
    const b = ops[diagActual];
    if (!b || !diagInd) return;
    diagInd.style.setProperty('--y', b.offsetTop + 'px');
    diagInd.style.setProperty('--h', b.offsetHeight + 'px');
  }
  function rellenaDiag(i) {
    const d = DIAG[i];
    $('#dArea').textContent = 'Área · ' + d.area;
    $('#dTit').textContent = d.tit;
    $('#dTxt').textContent = d.txt;
    const cta = $('#dCta');
    cta.dataset.wa = 'Hola, me gustaría orientación. Mi situación: ' + d.wa + '.';
    aplicaWA(cta);
  }
  function selDiag(i, foco) {
    if (i === diagActual && foco === undefined) return;
    diagActual = i;
    ops.forEach((b, k) => {
      const on = k === i;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (foco) ops[i].focus();
    posicionaInd();
    clearTimeout(diagTimer);
    diagCont.classList.remove('entra');
    diagCont.classList.add('sale');
    diagPanel.classList.remove('cambia');
    void diagPanel.offsetWidth;
    diagPanel.classList.add('cambia');
    diagTimer = setTimeout(() => {
      rellenaDiag(i);
      diagCont.classList.remove('sale');
      diagCont.classList.add('entra');
      setTimeout(() => diagCont.classList.remove('entra'), 480);
    }, 200);
  }
  ops.forEach((b, i) => {
    b.addEventListener('click', () => selDiag(i));
    b.addEventListener('keydown', e => {
      let n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % ops.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + ops.length) % ops.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = ops.length - 1;
      if (n !== null) { e.preventDefault(); selDiag(n, true); }
    });
  });
  posicionaInd();
  window.addEventListener('resize', posicionaInd);
  window.addEventListener('load', posicionaInd);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { posicionaInd(); marcaSucio(); });

  /* ---------- Sucesorio: pasos y escritura 3D ---------- */
  const pasos = $$('.paso');
  const escEstado = $('#escEstado');
  function activaPaso(p) {
    pasos.forEach(x => x.classList.toggle('is-on', x === p));
    if (el.escritura) el.escritura.dataset.e = p.dataset.e;
    if (escEstado) escEstado.textContent = p.dataset.estado;
  }
  if (pasos.length) {
    activaPaso(pasos[0]);
    if (HAS_IO) {
      let pio = null;
      const creaPIO = () => {
        if (pio) pio.disconnect();
        const movil = window.innerWidth < 900;
        pio = new IntersectionObserver(es => {
          es.forEach(e => { if (e.isIntersecting) activaPaso(e.target); });
        }, { rootMargin: movil ? '-62% 0px -28% 0px' : '-45% 0px -45% 0px' });
        pasos.forEach(p => pio.observe(p));
      };
      creaPIO();
      let lastMov = window.innerWidth < 900;
      window.addEventListener('resize', () => { const m = window.innerWidth < 900; if (m !== lastMov) { lastMov = m; creaPIO(); } });
    } else {
      pasos.forEach(p => p.classList.add('is-on'));
    }
  }
  function pintaSuc() {
    if (el.escritura && !RM) {
      const p = S.suc;
      el.escritura.style.transform = 'rotateY(' + (-12 * (1 - p)).toFixed(2) + 'deg) rotateX(' + (6 * (1 - p)).toFixed(2) + 'deg)';
    }
    if (el.sucBarra) el.sucBarra.style.transform = 'scaleY(' + S.suc.toFixed(4) + ')';
  }

  /* ---------- Banda de valores ---------- */
  const filas = $$('.banda__tr').map(tr => ({ tr, dir: parseFloat(tr.dataset.dir) || -1, x: 0, w: 0 }));
  let velScroll = 0, ultSy = window.scrollY;
  function pintaBanda(dt) {
    if (!vis.banda || RM) return;
    const dy = Math.abs(sy - ultSy);
    ultSy = sy;
    velScroll = lerp(velScroll, clamp(dy, 0, 90), 0.12);
    filas.forEach(f => {
      if (!f.w) f.w = f.tr.scrollWidth / 2;
      if (!f.w) return;
      f.x += (0.06 + velScroll * 0.05) * dt;
      f.x = f.x % f.w;
      const px = f.dir < 0 ? -f.x : f.x - f.w;
      f.tr.style.transform = 'translate3d(' + px.toFixed(1) + 'px,0,0)';
    });
  }
  window.addEventListener('resize', () => filas.forEach(f => { f.w = 0; }));

  /* ---------- Proceso: línea que se dibuja ---------- */
  const pps = $$('.pp');
  function pintaProceso() {
    const p = S.proc;
    if (el.procTrazo) el.procTrazo.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    if (el.procLista && el.procLuz) {
      const h = el.procLista.offsetHeight;
      el.procLuz.style.transform = 'translateY(' + (p * h).toFixed(1) + 'px)';
      pps.forEach(pp => pp.classList.toggle('is-on', p * h >= pp.offsetTop + 36));
    }
  }

  /* ---------- Preguntas frecuentes ---------- */
  const detalles = $$('.faq details');
  detalles.forEach(d => {
    const sum = d.querySelector('summary');
    sum.addEventListener('click', e => {
      e.preventDefault();
      if (d.open && !d.classList.contains('cierra')) {
        d.classList.add('cierra');
        d.classList.remove('abre');
        setTimeout(() => { if (d.classList.contains('cierra')) { d.open = false; d.classList.remove('cierra'); } }, RM ? 0 : 480);
      } else {
        d.classList.remove('cierra');
        d.open = true;
        void d.offsetHeight;
        requestAnimationFrame(() => d.classList.add('abre'));
      }
    });
  });
  if (detalles[0]) { detalles[0].open = true; detalles[0].classList.add('abre'); }

  /* ---------- Formulario → WhatsApp ---------- */
  const form = $('#form');
  if (form) {
    const fNombre = $('#fNombre'), fArea = $('#fArea'), fCaso = $('#fCaso');
    const btn = $('#fBtn'), msg = $('#formMsg');
    const marcaErr = (campo, errEl, texto) => {
      campo.closest('.campo').classList.toggle('is-err', !!texto);
      errEl.textContent = texto || '';
      campo.setAttribute('aria-invalid', texto ? 'true' : 'false');
    };
    const valida = () => {
      let ok = true;
      if (fNombre.value.trim().length < 2) { marcaErr(fNombre, $('#eNombre'), 'Escribe tu nombre para saber cómo dirigirnos a ti.'); ok = false; } else marcaErr(fNombre, $('#eNombre'), '');
      if (fCaso.value.trim().length < 10) { marcaErr(fCaso, $('#eCaso'), 'Cuéntanos brevemente tu caso (mínimo 10 caracteres).'); ok = false; } else marcaErr(fCaso, $('#eCaso'), '');
      return ok;
    };
    fNombre.addEventListener('blur', valida);
    fCaso.addEventListener('blur', () => { if (fCaso.value) valida(); });
    fNombre.addEventListener('input', () => { if (fNombre.closest('.is-err')) valida(); });
    fCaso.addEventListener('input', () => { if (fCaso.closest('.is-err')) valida(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!WHATSAPP_NUMERO) { msg.textContent = 'Escríbenos por WhatsApp próximamente.'; return; }
      if (!valida()) { (fNombre.value.trim().length < 2 ? fNombre : fCaso).focus(); return; }
      const nombre = fNombre.value.trim();
      const area = fArea.value;
      const caso = fCaso.value.trim();
      let areaTxt = 'un asunto legal';
      if (area === 'No estoy seguro') areaTxt = 'un asunto legal (aún no sé en qué área cae)';
      else if (area) areaTxt = area.toLowerCase();
      const texto = 'Hola, soy ' + nombre + '. Me interesa orientación en ' + areaTxt + '. ' + caso;
      const url = waURL(texto);
      btn.classList.add('is-cargando');
      msg.textContent = '';
      setTimeout(() => {
        btn.classList.remove('is-cargando');
        const w = window.open(url, '_blank', 'noopener');
        msg.textContent = '';
        msg.appendChild(document.createTextNode('Abrimos WhatsApp con tu mensaje listo. '));
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = w ? 'Si no se abrió, toca aquí.' : 'Tu navegador bloqueó la ventana: toca aquí para abrirlo.';
        msg.appendChild(a);
      }, 700);
    });
  }

  /* ---------- Botón flotante: burbuja ---------- */
  const burbuja = $('#waBurbuja');
  if (burbuja && WHATSAPP_NUMERO) {
    setTimeout(() => {
      burbuja.classList.add('is-on');
      setTimeout(() => burbuja.classList.remove('is-on'), 5000);
    }, 6000);
  }

  /* ---------- Spotlight en tarjetas ---------- */
  $$('.acard, .bt').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    });
  });

  /* ---------- Cursor y botones magnéticos ---------- */
  const cursor = $('#cursor');
  const ptr = { x: vw / 2, y: vh / 2, nx: 0, ny: 0, activo: false };
  let cx = ptr.x, cy = ptr.y;
  window.addEventListener('pointermove', e => {
    ptr.x = e.clientX; ptr.y = e.clientY;
    ptr.nx = (e.clientX / vw - 0.5) * 2;
    ptr.ny = (e.clientY / vh - 0.5) * 2;
    ptr.activo = e.pointerType === 'mouse' || e.pointerType === 'pen';
    if (FINE && cursor && !cursor.classList.contains('is-on')) cursor.classList.add('is-on');
  }, { passive: true });
  document.addEventListener('pointerover', e => {
    if (!cursor) return;
    cursor.classList.toggle('is-hov', !!e.target.closest('a, button, summary, [role="radio"], input, select, textarea'));
  });
  document.addEventListener('mouseleave', () => { if (cursor) cursor.classList.remove('is-on'); });
  if (FINE) {
    $$('.btn--lacre').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        b.style.transform = 'translate(' + (clamp(dx, -1, 1) * 6).toFixed(1) + 'px,' + (clamp(dy, -1, 1) * 6).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }
  // giroscopio (si el dispositivo lo entrega sin permiso)
  window.addEventListener('deviceorientation', e => {
    if (e.gamma == null || ptr.activo) return;
    ptr.nx = clamp(e.gamma / 35, -1, 1);
    ptr.ny = clamp(((e.beta || 45) - 45) / 35, -1, 1);
  }, { passive: true });

  /* ---------- Hero: rotador ---------- */
  const rotItems = $$('.rot__it');
  if (rotItems.length > 1 && !RM) {
    let ri = 0;
    setInterval(() => {
      if (!vis.hero || document.hidden) return;
      const act = rotItems[ri];
      ri = (ri + 1) % rotItems.length;
      const sig = rotItems[ri];
      act.classList.remove('is-on');
      act.classList.add('is-out');
      sig.classList.remove('is-out');
      void sig.offsetWidth;
      sig.classList.add('is-on');
      setTimeout(() => {
        act.classList.remove('is-out');
      }, 800);
    }, 2800);
  }

  /* ---------- Hero: canvas «constelación jurídica» ---------- */
  const canvas = $('#constelacion');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let pts = [], cw = 0, ch = 0;
  function iniciaCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let n = Math.min(70, Math.floor(cw * ch / 18000));
    if (window.innerWidth < 700) n = Math.floor(n / 2);
    pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({ x: Math.random() * cw, y: Math.random() * ch, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: 1 + Math.random() });
    }
    dibujaCanvas(0);
  }
  function dibujaCanvas(dt) {
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    const rect = canvas.getBoundingClientRect();
    const mx = ptr.x - rect.left, my = ptr.y - rect.top;
    const mover = dt > 0 && !RM;
    const k = dt / 16.7;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (mover) {
        p.x += p.vx * k; p.y += p.vy * k;
        if (ptr.activo || FINE) {
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if (d2 < 16900 && d2 > 1) { const d = Math.sqrt(d2); const f = (130 - d) / 130 * 0.9; p.x += dx / d * f * k; p.y += dy / d * f * k; }
        }
        if (p.x < -10) p.x = cw + 10; else if (p.x > cw + 10) p.x = -10;
        if (p.y < -10) p.y = ch + 10; else if (p.y > ch + 10) p.y = -10;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(200,161,90,.6)';
      ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          ctx.strokeStyle = 'rgba(200,161,90,' + ((1 - Math.sqrt(d2) / 120) * 0.25).toFixed(3) + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
  }
  iniciaCanvas();
  let rzT = null;
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(iniciaCanvas, 200); });

  /* ---------- Hero: sello 3D ---------- */
  let rx = 0, ry = 0;
  function pintaSello(now) {
    if (!el.selloEsc || RM) return;
    const idle = Math.sin(now / 2600) * 16;
    const objY = ptr.nx * 14 + idle;
    const objX = -ptr.ny * 10 + Math.sin(now / 3400) * 4;
    rx = lerp(rx, objX, 0.06);
    ry = lerp(ry, objY, 0.06);
    el.selloEsc.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    if (el.sello) el.sello.style.transform = 'translate3d(0,' + (S.hero * vh * 0.18).toFixed(1) + 'px,0)';
    if (el.heroTxt) el.heroTxt.style.opacity = (1 - S.hero * 0.55).toFixed(3);
  }

  /* ---------- Cierre ---------- */
  function pintaCierre() {
    if (el.cierreTxt && !RM) el.cierreTxt.style.transform = 'scale(' + (0.8 + 0.2 * S.cierre).toFixed(4) + ')';
  }

  /* ---------- Bucle único ---------- */
  let ultimo = performance.now();
  function suaviza(dt) {
    const k = RM ? 1 : 1 - Math.pow(0.001, dt / 1000 * 1.2);
    for (const key in P) {
      S[key] = lerp(S[key], P[key], k);
      if (Math.abs(S[key] - P[key]) < 0.0004) S[key] = P[key];
    }
  }
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(now - ultimo, 64);
    ultimo = now;
    if (document.hidden) return;

    if (sucio) {
      medir();
      sucio = false;
      hdr.classList.toggle('is-claro', tema.h === 'claro' && !hdr.classList.contains('is-menu'));
      html.dataset.tf = tema.f;
      if (usaProgresoJS && progreso) {
        const tot = document.documentElement.scrollHeight - vh;
        progreso.style.transform = 'scaleX(' + (tot > 0 ? clamp(sy / tot) : 0).toFixed(4) + ')';
      }
    }
    suaviza(dt);

    // cursor
    if (FINE && cursor) {
      cx = lerp(cx, ptr.x, 0.18); cy = lerp(cy, ptr.y, 0.18);
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    }

    if (vis.hero) {
      if (!RM) dibujaCanvas(dt);
      pintaSello(now);
    }
    if (!RM) pintaManifiesto(S.mani);
    pintaPortal(dt);
    pintaAreas();
    pintaSuc();
    pintaBanda(dt);
    pintaProceso();
    pintaCierre();
    // continúa mientras haya movimiento suavizado pendiente
    if (Math.abs(S.mani - P.mani) + Math.abs(S.portal - P.portal) + Math.abs(S.areas - P.areas) > 0.0004) sucio = false;
  }

  /* ---------- Arranque ---------- */
  configuraPin();
  medir();
  for (const key in P) S[key] = P[key];
  if (RM) {
    pintaPortal(0); pintaProceso(); pintaSuc();
  }
  requestAnimationFrame(tick);
})();
