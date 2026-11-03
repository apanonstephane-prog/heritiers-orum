/* Les Héritiers d'Orun — Acte I. Beat 'em up 2.5D (Phaser 3). */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer:coarse)').matches;
document.body.classList.toggle('touch', touch);
if (touch) $('keys').innerHTML = '<span><b>Joystick</b>8 directions</span><span><b>Frappe</b>combo en 3 coups</span><span><b>Pied</b>renverse · bas = balayage</span><span><b>Saut</b>+ Frappe en l\'air</span><span><b>Tempête</b>jauge turquoise</span><span><b>Esquive</b>ruée invincible</span>';

const VW = 960, VH = 540;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
let best = 0; try { best = +localStorage.getItem('orun-best') || 0; } catch (e) {}

/* ---------- Rotation paysage forcée sur téléphone en portrait ---------- */
let ROT = false;
function fitStage() {
  const vv = window.visualViewport;
  let w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight); ROT = touch && h > w;
  // un changement d'orientation pendant un appui laisse sinon le joystick « collé »
  try { inp.jx = inp.jy = 0; $('knob').style.transform = ''; } catch (e) {}
  window.scrollTo(0, 0);
  const st = $('stage'); st.classList.toggle('rot', ROT); if (ROT) [w, h] = [h, w];
  st.style.width = w + 'px'; st.style.height = h + 'px';
  const k = Math.min(w / VW, h / VH), gw = VW * k, gh = VH * k, gs = $('game').style;
  gs.width = gw + 'px'; gs.height = gh + 'px'; gs.left = (w - gw) / 2 + 'px'; gs.top = (h - gh) / 2 + 'px';
}
// iOS : les dimensions se stabilisent avec retard après une rotation ou l'apparition de la barre Safari
let fitT = [];
function refit() { fitStage(); fitT.forEach(clearTimeout); fitT = [120, 350, 800].map(d => setTimeout(fitStage, d)); }
addEventListener('resize', refit); addEventListener('orientationchange', refit);
if (window.visualViewport) visualViewport.addEventListener('resize', refit);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refit(); });
// pas de défilement, de rebond ni de zoom par pincement/double-tape
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
fitStage();

/* ---------- Audio procédural (SFX + musique afro-futuriste) ---------- */
let AC = null, master = null, muted = false, noiseBuf = null, mus = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination); } catch (e) { return; } }
  if (AC.state === 'suspended') AC.resume();
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
}
function nz() { if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; }
function tone(f, d, type = 'sine', v = .1, slide = 0, at = 0, dest) {
  if (!AC || muted) return; const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(dest || master); o.start(t); o.stop(t + d + .03);
}
function noise(d, v = .2, fq = 1500, q = .8, type = 'bandpass', at = 0, dest) {
  if (!AC || muted) return; const t = AC.currentTime + at, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = nz(); f.type = type; f.frequency.value = fq; f.Q.value = q; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f).connect(g).connect(dest || master); s.start(t, Math.random() * .5); s.stop(t + d + .03);
}
const sfx = {
  swing() { noise(.14, .16, 2600, .7); },
  hit() { tone(140, .14, 'square', .12, -80); noise(.09, .22, 1200, .6); },
  heavy() { tone(90, .3, 'square', .16, -50); noise(.25, .3, 700, .5); tone(55, .4, 'sine', .25, -20); },
  block() { tone(1800, .12, 'triangle', .07, -400); tone(2600, .08, 'sine', .04); noise(.05, .1, 5000, 3); },
  zap() { noise(.3, .18, 3500, 1.5); tone(1200, .25, 'sawtooth', .04, -900); },
  storm() { noise(.9, .35, 2000, .4); tone(70, 1, 'sawtooth', .12, -30); tone(880, .5, 'square', .04, -700, .1); },
  dash() { noise(.2, .18, 3200, 1.2); tone(600, .15, 'triangle', .06, 500); },
  jump() { tone(320, .1, 'triangle', .05, 220); },
  land() { noise(.08, .12, 400, .8, 'lowpass'); },
  charge() { tone(300, .7, 'sine', .06, 900); },
  laser() { tone(900, .25, 'sawtooth', .07, -600); noise(.2, .14, 4000, 2); },
  growl() { noise(.4, .18, 220, 2); tone(70, .4, 'sawtooth', .05, 20); },
  boom() { tone(60, .7, 'sine', .45, -30); noise(.6, .4, 300, .6, 'lowpass'); },
  shatter() { noise(.5, .25, 6000, 1); for (let i = 0; i < 5; i++) tone(rnd(1800, 3600), .3, 'triangle', .03, -500, i * .04); },
  pick() { tone(880, .1, 'triangle', .08); tone(1320, .14, 'triangle', .07, 0, .07); tone(1760, .18, 'triangle', .05, 0, .14); },
  roar() { tone(80, 1.2, 'sawtooth', .14, -30); tone(83, 1.2, 'sawtooth', .1, -32); noise(1.1, .25, 400, .6); },
  hurt() { tone(260, .25, 'sawtooth', .08, -140); },
  break() { noise(.3, .3, 900, .6); tone(180, .2, 'square', .06, -90); },
  radio() { tone(1400, .05, 'square', .025, 0, 0); tone(1900, .05, 'square', .02, 0, .06); noise(.12, .03, 3000, 2, 'bandpass', 0); },
  gong() { tone(110, 2.5, 'sine', .22, -4); tone(220, 1.8, 'sine', .08); tone(331, 1.3, 'sine', .05); }
};
function startMusic() {
  if (!AC || mus) return;
  const g = AC.createGain(); g.gain.value = 0; g.connect(master);
  const dl = AC.createDelay(); dl.delayTime.value = .27; const fb = AC.createGain(); fb.gain.value = .3; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; dl.connect(lp).connect(fb).connect(dl); lp.connect(g);
  mus = { g, next: AC.currentTime + .2, step: 0, boss: false, mode: null };
  const S = [55, 65.41, 73.42, 82.41, 98, 110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66];
  const kick = (t, v) => { const o = AC.createOscillator(), e = AC.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .18); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(e).connect(g); o.start(t); o.stop(t + .32); };
  const hat = (t, v) => { const s = AC.createBufferSource(), f = AC.createBiquadFilter(), e = AC.createGain(); s.buffer = nz(); f.type = 'highpass'; f.frequency.value = 7000; e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .05); s.connect(f).connect(e).connect(g); s.start(t, Math.random() * .5); s.stop(t + .06); };
  const clap = (t, v) => { const s = AC.createBufferSource(), f = AC.createBiquadFilter(), e = AC.createGain(); s.buffer = nz(); f.type = 'bandpass'; f.frequency.value = 1600; e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .16); s.connect(f).connect(e).connect(g); s.start(t, Math.random() * .5); s.stop(t + .18); };
  const talk = (t, v) => { const o = AC.createOscillator(), e = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(rnd(160, 220), t); o.frequency.exponentialRampToValueAtTime(rnd(90, 130), t + .22); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .26); o.connect(e).connect(g); o.start(t); o.stop(t + .28); };
  const bass = (t, f, d) => { const o = AC.createOscillator(), fl = AC.createBiquadFilter(), e = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(180, t + d); e.gain.setValueAtTime(.16, t); e.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(fl).connect(e).connect(g); o.start(t); o.stop(t + d + .02); };
  const pluck = (t, f, v) => { for (const [m, ty] of [[1, 'triangle'], [2, 'sine']]) { const o = AC.createOscillator(), e = AC.createGain(); o.type = ty; o.frequency.value = f * m; e.gain.setValueAtTime(v / m, t); e.gain.exponentialRampToValueAtTime(.001, t + .5); o.connect(e); e.connect(g); e.connect(dl); o.start(t); o.stop(t + .55); } };
  const bassLine = [0, 0, 3, 0, 5, 0, 3, 2], lead = [];
  setInterval(() => {
    if (!AC || !mus) return;
    const M = mus.mode, ttl = M === 'title';
    if (!/^(stage|boss)/.test(M || '') && !ttl) { mus.next = AC.currentTime + .1; return; }
    const beat = mus.boss ? .118 : ttl ? .17 : .136;
    while (mus.next < AC.currentTime + .3) {
      const t = mus.next, s = mus.step % 16, bar = Math.floor(mus.step / 16);
      if (!ttl && s % 4 === 0) kick(t, .55); if (ttl && s % 8 === 0) kick(t, .25); if (mus.boss && s % 4 === 3 && Math.random() < .5) kick(t, .3);
      if (!ttl && s % 8 === 4) clap(t, .22); if (!ttl || s % 2 === 0) hat(t, s % 2 ? .05 : ttl ? .04 : .09);
      if (s === 6 || s === 11 || s === 14) talk(t, .14);
      if (s % 2 === 0) bass(t, S[bassLine[(s / 2 + bar) % 8]] * (mus.boss ? .94 : 1), beat * 1.8);
      if (s === 0 && bar % 2 === 0) { lead.length = 0; for (let i = 0; i < 16; i++) lead.push(Math.random() < (i % 4 === 0 ? .7 : .3) ? S[5 + Math.floor(Math.random() * 8)] * 2 : 0); }
      if (lead[s]) pluck(t, lead[s], .06);
      mus.next += beat; mus.step++;
    }
  }, 80);
}

/* ---------- Données de jeu ---------- */
const CHAR = {
  amara: { h: 200 }, milicien: { h: 204 }, tireuse: { h: 200 }, chien: { h: 112 }, brute: { h: 246 }, pretresse: { h: 214 }, ferrum: { h: 360 },
  faucheuse: { h: 212 }, yewa: { h: 300 },
  harponneur: { h: 214 }, ijji: { h: 236 }, plongeur: { h: 196 }, oshun: { h: 300 }, spectre: { h: 206 }, eshu: { h: 246 }, lamelune: { h: 206 }, nyx: { h: 232 }
};
// zones du décor (coordonnées logiques)
const TILE = 1260, OV = 140, STEP = TILE - OV;
const WORLD_W = TILE * 5 - OV * 4;
function floorAt(x) {
  const k = clamp(Math.floor(x / STEP), 0, 4), f = (x - k * STEP);
  const a = (k === 4 && G && G.flood) ? [ZFLOOR[4][0] + G.flood, ZFLOOR[4][1]] : ZFLOOR[k];
  if (k < 4 && f > STEP - 40) { const b = ZFLOOR[k + 1], t = clamp((f - (STEP - 40)) / (OV + 40), 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  return a;
}
/* ---------- Niveaux ---------- */
// chaque acte : décor (dossier), sol praticable par tuile, rencontres, boss, textes
const LEVELS = [
  {
    dir: '', name: 'Acte I · Les Quartiers suspendus', track: 'stage1', bossTrack: 'boss1', atlas: null,
    zfloor: [[334, 530], [334, 530], [342, 404], [342, 404], [314, 530]],
    ztint: [[255, 242, 224], [255, 238, 222], [226, 234, 255], [226, 234, 255], [255, 226, 206]],
    enc: [
      { L: 140, waves: [['milicien', 'milicien'], ['milicien', 'chien']], props: [[620, 0.55, 'crate'], [820, .85, 'barrel']] },
      { L: 1180, waves: [['tireuse', 'milicien'], ['brute', 'milicien']], props: [[1500, .3, 'crate'], [1900, .7, 'cell'], [1620, .9, 'kiosk']] },
      { L: 2480, event: 'debris', waves: [['chien', 'chien', 'tireuse'], ['pretresse', 'milicien*']], props: [[2900, .5, 'barrel'], [3200, .5, 'crate']] },
      { L: 3560, waves: [['brute', 'pretresse', 'milicien*'], ['chien*', 'tireuse*', 'milicien', 'milicien*']], props: [[3900, .3, 'cell'], [4150, .75, 'crate'], [4300, .4, 'barrel']] },
      { L: WORLD_W - VW, boss: true, props: [[WORLD_W - 820, .3, 'barrel'], [WORLD_W - 180, .8, 'barrel'], [WORLD_W - 500, .9, 'crate']] }
    ],
    boss: { kind: 'ferrum', name: 'Oba Ferrum', sub: 'Colosse-Réacteur', face: 'face_ferrum.webp', ey: 'Gardien du Marché Haut', desc: 'Le Colosse-Réacteur, enchaîné par Sombre-Lune.', line: '« Gardienne… brise mes chaînes… ou tombe avec moi. »', phase2: 'Cœur à nu · Rage', crack: 'ARMURE FISSURÉE' },
    intro: [
      ['Nova-Kemet · 2311', 'Depuis trois siècles, la cité flotte au-dessus des nuages, portée par les Orishas-machines : des esprits anciens liés à ses réacteurs.'],
      ['Sombre-Lune', 'Le conglomérat Sombre-Lune vide les esprits un à un pour alimenter Orun-Zéro, une arme orbitale. Privés de leurs gardiens, les quartiers suspendus commencent à tomber.'],
      ['Amara Diallo', 'Dernière lame-tempête de la lignée des Gardiens, Amara descend vers le Marché Haut. Au cœur du réacteur, Oba Ferrum, protecteur du quartier, a été enchaîné et retourné contre les siens.']
    ],
    end: ['Acte I terminé', 'Libéré, le cœur d\'Oba Ferrum s\'apaise. Le colosse murmure : « Les Jardins-Turbines… ils y retiennent Yewa. » Kofi attend Amara aux portes des serres.']
  },
  {
    dir: 'l2/', name: 'Acte II · Les Jardins-Turbines', track: 'stage2', bossTrack: 'boss2', atlas: 'l2',
    zfloor: [[372, 528], [372, 528], [404, 470], [404, 470], [398, 516]],
    ztint: [[255, 246, 228], [255, 246, 228], [236, 244, 255], [236, 244, 255], [236, 228, 255]],
    enc: [
      { L: 140, waves: [['faucheuse', 'milicien'], ['faucheuse', 'chien', 'milicien']], props: [[620, 0.5, 'crate'], [860, .85, 'barrel']] },
      { L: 1180, waves: [['tireuse', 'faucheuse'], ['brute', 'faucheuse*']], props: [[1500, .3, 'crate'], [1880, .7, 'cell'], [1650, .9, 'kiosk']] },
      { L: 2480, event: 'gusts', waves: [['chien', 'chien', 'faucheuse'], ['pretresse', 'faucheuse*']], props: [[2900, .5, 'barrel'], [3200, .5, 'crate']] },
      { L: 3560, event: 'gusts', waves: [['brute*', 'faucheuse', 'tireuse'], ['faucheuse*', 'milicien*', 'chien*', 'tireuse']], props: [[3900, .3, 'cell'], [4150, .75, 'crate'], [4300, .4, 'barrel']] },
      { L: WORLD_W - VW, boss: true, props: [[WORLD_W - 820, .4, 'barrel'], [WORLD_W - 180, .8, 'barrel'], [WORLD_W - 500, .9, 'crate']] }
    ],
    boss: { kind: 'yewa', name: 'Yewa-Nul', sub: 'Esprit des vents', face: 'face_yewa.webp', ey: 'Gardienne des Jardins-Turbines', desc: 'L\'esprit des vents et des jardins, vidé et rempli de Nul.', line: '« Le vent… ne m\'écoute plus… Aide-moi à me souvenir, Gardienne. »', phase2: 'Tempête du Nul', crack: 'LE NUL SE FISSURE' },
    intro: [
      ['Acte II · Les Jardins-Turbines', 'Au-dessus du Marché Haut, les serres verticales nourrissent toute la cité. Leurs éoliennes géantes tournent sous le souffle de Yewa, l\'esprit des vents et des jardins.'],
      ['Le Nul', 'Sombre-Lune a vidé Yewa et l\'a remplie de Nul, un vide qui dévore la sève. Les jardins se dessèchent, les turbines s\'emballent, et les faucheuses de la milice récoltent ce qui reste.'],
      ['Kofi Mensah', 'Kofi, forgeron-boxeur et frère d\'armes d\'Amara, tient la radio depuis les docks des serres. « Monte jusqu\'au sanctuaire du vent, petite sœur. Je garde tes arrières. »']
    ],
    end: ['Acte II terminé', 'Libérée, Yewa reprend son souffle et les jardins reverdissent. Mais avant de s\'apaiser, elle murmure : « Ọ̀run-Zéro est presque chargée… La Flèche… » Kofi a trouvé un moyen de monter : les Docks des Nuages.']
  },
  {
    dir: 'l3/', name: 'Acte III · Les Docks des Nuages', track: 'stage3', bossTrack: 'boss3', atlas: 'l3',
    zfloor: [[395, 530], [395, 530], [362, 530], [362, 530], [372, 525]],
    ztint: [[255, 236, 214], [255, 236, 214], [232, 228, 255], [232, 228, 255], [220, 226, 255]],
    enc: [
      { L: 140, waves: [['harponneur', 'milicien'], ['harponneur', 'chien', 'tireuse']], props: [[620, 0.5, 'crate'], [860, .85, 'barrel']] },
      { L: 1180, waves: [['harponneur', 'harponneur'], ['brute', 'harponneur*']], props: [[1500, .3, 'crate'], [1880, .7, 'cell'], [1650, .9, 'kiosk']] },
      { L: 2480, event: 'bombard', waves: [['chien', 'harponneur', 'tireuse'], ['pretresse', 'harponneur*', 'milicien']], props: [[2900, .5, 'barrel'], [3200, .5, 'crate']] },
      { L: 3560, event: 'bombard', waves: [['brute*', 'harponneur', 'tireuse*'], ['harponneur*', 'milicien*', 'brute', 'chien*']], props: [[3900, .3, 'cell'], [4150, .75, 'crate'], [4300, .4, 'barrel']] },
      { L: WORLD_W - VW, boss: true, props: [[WORLD_W - 820, .4, 'barrel'], [WORLD_W - 180, .8, 'barrel'], [WORLD_W - 500, .9, 'crate']] }
    ],
    boss: { kind: 'ijji', name: 'Commandante Ìjì', sub: 'Capitaine du Croissant', face: 'face_ijji.webp', ey: 'Maîtresse des Docks des Nuages', desc: 'Elle livre les esprits capturés à la Flèche, cale après cale.', line: '« Une Gardienne sur mon pont ? Jetez-la par-dessus bord. »', phase2: 'Bombardement', crack: 'COQUE PERCÉE', tip: 'Ìjì harponne de loin : <b>change de ligne</b> quand la chaîne violette s\'allume. En phase 2, quitte les ombres du bombardement.' },
    intro: [
      ['Acte III · Les Docks des Nuages', 'Les esprits libérés ont un mot en commun : la Flèche. Pour l\'atteindre, il faut un dirigeable, et tous partent des Docks des Nuages.'],
      ['Commandante Ìjì', 'La capitaine Ìjì y charge les esprits capturés dans les cales du croissant violet. Ses harponneurs tiennent les quais.'],
      ['Kofi Mensah', '« Je prépare un vieux cargo au bout des quais, petite sœur. Ouvre-moi la route, et on s\'envole. »']
    ],
    end: ['Acte III terminé', 'Le vaisseau amiral s\'échoue sur les quais et ses cales s\'ouvrent : des dizaines d\'esprits s\'envolent. Dans les registres de bord d\'Ìjì, une destination revient sans cesse : les Bassins d\'Ọ̀ṣun, qui abreuvent toute la cité.']
  },
  {
    dir: 'l4/', name: 'Acte IV · Les Bassins d\'Ọ̀ṣun', track: 'stage4', bossTrack: 'boss4', atlas: 'l4',
    zfloor: [[400, 528], [400, 528], [402, 482], [402, 482], [382, 528]],
    ztint: [[240, 252, 255], [240, 252, 255], [214, 240, 244], [214, 240, 244], [228, 236, 255]],
    enc: [
      { L: 140, waves: [['plongeur', 'milicien'], ['plongeur', 'chien', 'tireuse']], props: [[620, 0.5, 'crate'], [860, .85, 'barrel']] },
      { L: 1180, event: 'flood', waves: [['tireuse', 'plongeur'], ['brute', 'plongeur*']], props: [[1500, .3, 'crate'], [1880, .7, 'cell'], [1650, .9, 'kiosk']] },
      { L: 2480, waves: [['milicien', 'plongeur', 'tireuse'], ['pretresse', 'plongeur*', 'chien']], props: [[2900, .5, 'barrel'], [3200, .5, 'crate']] },
      { L: 3560, event: 'flood', waves: [['brute*', 'plongeur', 'pretresse*'], ['plongeur*', 'milicien*', 'plongeur*', 'chien*']], props: [[3900, .3, 'cell'], [4150, .75, 'crate'], [4300, .4, 'barrel']] },
      { L: WORLD_W - VW, boss: true, props: [[WORLD_W - 820, .4, 'barrel'], [WORLD_W - 180, .8, 'barrel'], [WORLD_W - 500, .9, 'crate']] }
    ],
    boss: { kind: 'oshun', name: 'Ọ̀ṣun-Nul', sub: 'Esprit des eaux', face: 'face_oshun.webp', ey: 'Gardienne des Bassins', desc: 'L\'esprit des rivières, empoisonné de Nul : l\'eau de toute la cité devient amère.', line: '« Mon eau était douce… pourquoi a-t-elle ce goût de vide ? »', phase2: 'La crue', crack: 'LE NUL SE DISSOUT', tip: 'Ọ̀ṣun fouette loin : reste hors de la bande turquoise. <b>Saute</b> ses vagues. En phase 2, la crue réduit l\'arène.' },
    intro: [
      ['Acte IV · Les Bassins d\'Ọ̀ṣun', 'Sous la cité dorment les bassins sacrés d\'Ọ̀ṣun. Chaque goutte bue à Nova-Kemet en vient.'],
      ['Le poison', 'Sombre-Lune y déverse du Nul pour affaiblir l\'esprit des eaux sans qu\'on le remarque. Déjà, les fontaines du Marché Haut deviennent violettes.'],
      ['Amara Diallo', '« Ọ̀ṣun, tiens bon. J\'arrive avec les vannes ouvertes et la colère au poing. »']
    ],
    end: ['Acte IV terminé', 'L\'eau redevient claire et chante de nouveau dans les canaux. Ọ̀ṣun confie à Amara une perle de rivière : « Zuri t\'attend aux Archives d\'Ifá. Elle y a trouvé le chemin de la Flèche… mais quelqu\'un s\'amuse avec les reflets. »']
  },
  {
    dir: 'l5/', name: 'Acte V · Les Archives d\'Ifá', track: 'stage5', bossTrack: 'boss5', atlas: 'l5',
    zfloor: [[362, 528], [362, 528], [362, 528], [362, 528], [382, 528]],
    ztint: [[255, 240, 222], [255, 240, 222], [226, 222, 255], [226, 222, 255], [244, 228, 255]],
    enc: [
      { L: 140, waves: [['spectre', 'milicien'], ['spectre', 'tireuse', 'chien']], props: [[620, 0.5, 'crate'], [860, .85, 'barrel']] },
      { L: 1180, waves: [['milicien', 'spectre'], ['brute', 'spectre*']], props: [[1500, .3, 'crate'], [1880, .7, 'cell'], [1650, .9, 'kiosk']] },
      { L: 2480, event: 'dark', waves: [['spectre', 'chien', 'spectre'], ['pretresse', 'spectre*', 'milicien']], props: [[2900, .5, 'barrel'], [3200, .5, 'crate']] },
      { L: 3560, event: 'dark', waves: [['brute*', 'spectre', 'tireuse*'], ['spectre*', 'milicien*', 'brute', 'spectre']], props: [[3900, .3, 'cell'], [4150, .75, 'crate'], [4300, .4, 'barrel']] },
      { L: WORLD_W - VW, boss: true, props: [[WORLD_W - 820, .4, 'barrel'], [WORLD_W - 180, .8, 'barrel'], [WORLD_W - 500, .9, 'crate']] }
    ],
    boss: { kind: 'eshu', name: 'Ẹ̀ṣù-Miroir', sub: 'Esprit des carrefours', face: 'face_eshu.webp', ey: 'Gardien des carrefours', desc: 'L\'esprit des chemins et des messages, enfermé par Sombre-Lune dans un labyrinthe de miroirs.', line: '« Tous les chemins mènent ici, Gardienne. Lequel est le bon ? »', phase2: 'Mille reflets', crack: 'UN MIROIR SE BRISE', tip: 'Ẹ̀ṣù t\'attire avec son bâton et tire un rayon de miroir : <b>change de ligne</b>. En phase 2, ses reflets tombent en un coup.' },
    intro: [
      ['Acte V · Les Archives d\'Ifá', 'Les Archives d\'Ifá gardent la mémoire de la cité : chaque masque, chaque tablette raconte un chemin.'],
      ['Zuri Okafor', 'Zuri, technomancienne et oracle des masques, y cherche le passage secret vers la Flèche. « Les masques me parlent, Amara… et ils ont peur. »'],
      ['Les reflets', 'Sombre-Lune a enfermé Ẹ̀ṣù, l\'esprit des carrefours, dans une salle de miroirs. Tant qu\'il est captif, tous les chemins mentent.']
    ],
    end: ['Acte V terminé', 'Ẹ̀ṣù s\'incline et tous les miroirs montrent enfin la même route : une passerelle qui monte vers la Flèche d\'Ọ̀run. « Ton ancienne maîtresse t\'y attend, Gardienne. Elle croit encore sauver la cité. »']
  },
  {
    dir: 'l6/', name: 'Acte VI · La Flèche d\'Ọ̀run', track: 'stage6', bossTrack: 'boss6', atlas: 'l6',
    zfloor: [[386, 528], [386, 528], [396, 528], [396, 528], [392, 528]],
    ztint: [[228, 224, 255], [228, 224, 255], [236, 230, 255], [236, 230, 255], [240, 226, 255]],
    enc: [
      { L: 140, waves: [['lamelune', 'milicien'], ['lamelune', 'tireuse', 'milicien']], props: [[620, 0.5, 'crate'], [860, .85, 'barrel']] },
      { L: 1180, waves: [['lamelune*', 'lamelune'], ['brute*', 'lamelune*']], props: [[1500, .3, 'crate'], [1880, .7, 'cell'], [1650, .9, 'kiosk']] },
      { L: 2480, event: 'elevator', waves: [['milicien*', 'lamelune', 'lamelune*'], ['pretresse', 'lamelune*', 'tireuse*']], props: [[2900, .5, 'barrel'], [3200, .5, 'crate']] },
      { L: 3560, event: 'elevator', waves: [['lamelune*', 'lamelune*', 'tireuse*'], ['lamelune*', 'lamelune', 'brute*', 'chien*']], props: [[3900, .3, 'cell'], [4150, .75, 'crate'], [4300, .4, 'barrel']] },
      { L: WORLD_W - VW, boss: true, props: [[WORLD_W - 820, .4, 'barrel'], [WORLD_W - 180, .8, 'barrel'], [WORLD_W - 500, .9, 'crate']] }
    ],
    boss: { kind: 'nyx', name: 'Nyx Adébayo', sub: 'Directrice de Sombre-Lune', face: 'face_nyx.webp', ey: 'Ancienne Gardienne', desc: 'La maîtresse d\'armes d\'Amara. Elle croit la cité perdue et veut sauver « ce qui peut l\'être ».', line: '« Tu as toujours eu le geste juste, Amara. Montre-moi s\'il suffit. »', phase2: 'Gravité inversée', crack: 'SA GARDE FAIBLIT', tip: 'Nyx <b>contre</b> si tu frappes sans arrêt : varie, recule quand elle se met en garde. Fuis le cercle violet de gravité.' },
    intro: [
      ['Acte VI · La Flèche d\'Ọ̀run', 'La tour orbitale de Sombre-Lune perce les nuages. À son sommet, Ọ̀run-Zéro aspire les derniers esprits de la cité.'],
      ['Nyx Adébayo', 'Nyx fut la plus grande des Gardiennes, et la maîtresse d\'armes d\'Amara. Elle a vu les quartiers tomber et a choisi de sauver ce qui pouvait l\'être, quel qu\'en soit le prix.'],
      ['Les héritiers', 'Kofi tient la base de la tour, Zuri brouille les défenses. Amara monte seule vers le sommet.']
    ],
    end: ['Fin', 'Amara ne détruit pas Ọ̀run-Zéro : elle coupe les chaînes de tous les esprits à la fois. La cité ne tombe pas, elle descend lentement, portée par des esprits enfin libres. Nyx, à genoux, regarde Nova-Kemet se poser sur les nuages. « Tu avais raison, Amara. On ne possède pas un esprit… on le porte. »']
  }

];
let LV = 0, ZFLOOR, ENC, ZTINT, STORY, END, CARRY = null;
function setLevel(i) { LV = i; const L = LEVELS[i]; ZFLOOR = L.zfloor; ENC = L.enc; ZTINT = L.ztint; STORY = L.intro; END = L.end; }
setLevel(0);
const TK = () => TALKS[LV];

/* ---------- Scène principale ---------- */
let SC = null;   // scène
let G = null;    // état de partie
let state = 'loading', paused = false;
// une entrée par joueur ; inp = joueur 1 (clavier principal, tactile, 1re manette)
const mkInp = () => ({ x: 0, y: 0, kx: 0, ky: 0, jx: 0, jy: 0, gx: 0, gy: 0, atk: 0, kick: 0, jump: 0, pow: 0, dash: 0, heavy: 0, sweep: 0, sup2: 0, runReq: 0 });
const INP = [mkInp(), mkInp()];
const inp = INP[0];
let NPLAYERS = 1;
const P2TINT = [255, 168, 118]; // J2 : Amara aux reflets braise, en attendant l'animation de Kofi et Zuri
const alive = () => G.players.filter(p => p.active && p.st !== 'out');
// cible d'un ennemi : le joueur debout le plus proche (avec un peu d'inertie)
function target(e) {
  const L = G.players.filter(p => p.active && p.st !== 'out' && p.st !== 'dead');
  if (!L.length) return e.tgt && e.tgt.active ? e.tgt : G.p;
  let best = null, bd = 1e9;
  for (const p of L) { const d = Math.abs(p.x - e.x) + Math.abs(p.y - e.y) * 2 - (p === e.tgt ? 140 : 0); if (d < bd) { bd = d; best = p; } }
  e.tgt = best; return best;
}
// à qui revient le mérite d'un coup (joueur direct, ennemi projeté, objet lancé)
function ownerOf(src) { if (!src) return G.p; if (src.isPlayer && src.inp) return src; if (src.owner && src.owner.isPlayer) return src.owner; return G.p; }

class Play extends Phaser.Scene {
  constructor() { super('play'); }
  preload() {
    const bar = $('lbar');
    this.load.on('progress', v => bar.style.width = Math.round(v * 100) + '%');
    // décor d'abord (léger), puis les planches d'animation ; version allégée sur mobile (≈100 Mo de mémoire graphique au lieu de ≈300)
    // décor de l'acte en cours (clés préfixées par le numéro d'acte : les textures survivent au redémarrage de scène)
    const D = LEVELS[LV].dir, K = 'L' + LV, has = k => this.textures.exists(k) || this.cache.json.exists(k);
    if (!has(K + 'stage')) this.load.json(K + 'stage', D + 'stage.json');
    for (let i = 0; i < 3; i++) if (!has(K + 'st' + i)) this.load.image(K + 'st' + i, D + 'stage_' + i + '.webp');
    if (!has(K + 'sky')) this.load.image(K + 'sky', D + 'st_sky.webp'); if (!has(K + 'fg')) this.load.image(K + 'fg', D + 'st_fg.webp');
    if (!has('props')) { this.load.json('propsj', 'props.json'); this.load.image('props', 'props.webp'); }
    if (!has('atlas')) this.load.json('atlas', ATL.main + '.json');
    for (let i = 0; i < ATL.mainPages; i++) if (!has('m' + i)) this.load.image('m' + i, ATL.main + '_' + i + '.webp');
    // planches propres à l'acte (nouvel ennemi + boss)
    const X = LEVELS[LV].atlas;
    if (X) { const n = (LITE ? 'm' : '') + X; if (!has('atlas' + X)) this.load.json('atlas' + X, D + 'atlas_' + n + '.json'); for (let i = 0; i < (LITE ? 1 : 2); i++) if (!has(X + 'p' + i)) this.load.image(X + 'p' + i, D + 'atlas_' + n + '_' + i + '.webp'); }
    this.load.on('loaderror', f => { LOADERR.push(f.key); });
  }
  create() {
    SC = this;
    const K = 'L' + LV, X = LEVELS[LV].atlas;
    const need = ['atlas', K + 'stage', K + 'st0', K + 'st1', K + 'st2'].concat(Array.from({ length: ATL.mainPages }, (_, i) => 'm' + i), X ? ['atlas' + X] : []);
    const miss = need.filter(k => !(this.textures.exists(k) || this.cache.json.exists(k)));
    if (miss.length) { $('loading').innerHTML = '<div>Chargement incomplet (' + miss.join(', ') + ')<br><br><button class="go" onclick="location.reload()">Réessayer</button></div>'; return; }
    this.META = {}; regAtlas(this, this.cache.json.get('atlas'), 'm');
    if (X) { regAtlas(this, this.cache.json.get('atlas' + X), X + 'p'); BOSS_READY = true; }
    else if (this.cache.json.exists('atlasB') && this.textures.exists('b0')) { regAtlas(this, this.cache.json.get('atlasB'), 'b'); BOSS_READY = true; }
    else {
      // atlas du boss de l'acte I chargé en arrière-plan pendant que l'on joue
      BOSS_READY = false; this.load.json('atlasB', ATL.boss + '.json'); this.load.image('b0', ATL.boss + '_0.webp');
      this.load.once('complete', () => { regAtlas(this, this.cache.json.get('atlasB'), 'b'); BOSS_READY = true; });
      this.load.start();
    }
    const P = this.cache.json.get('propsj'); this.PROPS = P;
    for (const k in P) { const [x, y, w, h] = P[k]; if (!this.textures.get('props').has(k)) this.textures.get('props').add(k, 0, x, y, w, h); }
    // textures procédurales pour les effets
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 16); g.generateTexture('dot', 32, 32); g.clear();
    for (let r = 32; r > 0; r -= 2) { g.fillStyle(0xffffff, (1 - r / 32) * .22); g.fillCircle(32, 32, r); } g.generateTexture('glow', 64, 64); g.clear();
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 24, 4); g.generateTexture('streak', 24, 4); g.clear();
    g.lineStyle(6, 0xffffff, 1); g.strokeCircle(64, 64, 58); g.generateTexture('ring', 128, 128); g.clear();
    g.fillStyle(0xffffff, 1); g.beginPath(); g.arc(64, 64, 60, -1.3, 1.3, false); g.arc(52, 64, 48, 1.1, -1.1, true); g.closePath(); g.fillPath(); g.generateTexture('crescent', 128, 128); g.clear();
    g.fillStyle(0x000000, 1); g.fillEllipse(32, 10, 64, 20); g.generateTexture('shadow', 64, 20); g.destroy();

    // décor
    const ST = this.cache.json.get(K + 'stage'); let x = 0;
    // ciel : une seule image en parallaxe lente (pas de TileSprite, fragile sur iOS)
    if (this.textures.exists(K + 'sky')) { const k = Math.max(VH / 960, (VW + WORLD_W * .1 + 20) / 2240); this.add.image(0, -(960 * k - VH) * .4, K + 'sky').setOrigin(0).setScale(k).setScrollFactor(.1).setDepth(-20); }
    for (let i = 0; i < ST.parts.length; i++) { const im = this.add.image(x, 0, K + 'st' + i).setOrigin(0).setScale(1 / ST.scale).setDepth(-10); x += im.displayWidth; }
    // premier plan : copies juxtaposées en parallaxe rapide
    if (this.textures.exists(K + 'fg')) { const k = VH / 960, w = 2240 * k; for (let i = 0; i * w < WORLD_W * 1.3 + VW; i++) this.add.image(i * w, 0, K + 'fg').setOrigin(0).setScale(k).setScrollFactor(1.3).setDepth(9000).setAlpha(.9); }
    this.tele = this.add.graphics().setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    this.fxg = this.add.graphics().setDepth(8000).setBlendMode(Phaser.BlendModes.ADD);
    this.bars = this.add.graphics().setDepth(8500);
    // particules
    const mk = (tex, cfg) => this.add.particles(0, 0, tex, Object.assign({ emitting: false, blendMode: 'ADD' }, cfg)).setDepth(8100);
    this.pSpark = mk('streak', { speed: { min: 250, max: 650 }, lifespan: { min: 180, max: 380 }, scale: { start: 1.2, end: 0 }, rotate: { onEmit: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) }, angle: { min: 0, max: 360 }, tint: [0xffffff, 0xffe08a] });
    this.pBolt = mk('streak', { speed: { min: 200, max: 700 }, lifespan: { min: 200, max: 500 }, scale: { start: 1.4, end: 0 }, rotate: { onEmit: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) }, angle: { min: 0, max: 360 }, tint: [0x8ef7ff, 0x2fe0d0, 0xffffff] });
    this.pViolet = mk('streak', { speed: { min: 150, max: 450 }, lifespan: { min: 200, max: 450 }, scale: { start: 1.1, end: 0 }, rotate: { onEmit: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) }, angle: { min: 0, max: 360 }, tint: [0xb07cff, 0x7a3cff, 0xffffff] });
    this.pFire = mk('dot', { speed: { min: 60, max: 340 }, lifespan: { min: 300, max: 800 }, scale: { start: .5, end: 0 }, angle: { min: 180, max: 360 }, gravityY: 300, tint: [0xffb347, 0xff6a1a, 0xffe08a] });
    this.pDust = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 30, max: 140 }, lifespan: { min: 300, max: 600 }, scale: { start: .35, end: .9 }, alpha: { start: .35, end: 0 }, angle: { min: 190, max: 350 }, tint: 0xd8c4a8 }).setDepth(2);
    this.pAmb = this.add.particles(0, 0, 'dot', { x: { min: 0, max: VW }, y: { min: 0, max: VH }, lifespan: 6000, speedY: { min: -14, max: -4 }, speedX: { min: -8, max: 8 }, scale: { start: .08, end: .02 }, alpha: { start: .7, end: 0 }, frequency: 120, tint: [0xffd36b, 0x8ef7ff], blendMode: 'ADD' }).setScrollFactor(0).setDepth(8900);
    try { this.cameras.main.postFX.addVignette(.5, .5, .92, .32); } catch (e) {}
    this.cameras.main.setOrigin(0, 0);
    this.applyZoom();
    if (!RESIZE_BOUND) { RESIZE_BOUND = true; this.scale.on('resize', () => { try { SC.applyZoom(); } catch (e) {} }); }
    $('loading').hidden = true;
    $('pFace').style.backgroundImage = 'url(face_amara.webp)'; $('pFace2').style.backgroundImage = 'url(face_amara.webp)';
    const B = LEVELS[LV].boss; $('bFace').style.backgroundImage = 'url(' + B.face + ')'; $('bName').textContent = B.name; $('bPhase').textContent = B.sub;
    $('biEy').textContent = B.ey; $('biName').textContent = B.name; $('biDesc').textContent = B.desc; $('biLine').textContent = B.line;
    newGame(true);
    if (CARRY) { $('title').hidden = true; showStory('intro'); return; } // passage à l'acte suivant : on enchaîne sur son récit
    state = 'title';
    $('title').style.backgroundImage = 'linear-gradient(90deg,rgba(11,7,20,.92) 0%,rgba(11,7,20,.55) 46%,rgba(11,7,20,.1) 75%),url(st_sky.webp)';
    $('best').textContent = best ? 'Record ' + String(best).padStart(6, '0') : '';
    $('title').hidden = false;
  }
  applyZoom() { this.cameras.main.setZoom(this.scale.width / VW); }
  update(time, delta) { tick(Math.min(delta, 50) / 1000); }
}

let BOSS_READY = false, RESIZE_BOUND = false; const SEEN = {}; const LOADERR = [];
const LITE = touch || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const ATL = LITE ? { main: 'atlas_mmain', mainPages: 2, boss: 'atlas_mboss' } : { main: 'atlas_main', mainPages: 4, boss: 'atlas_boss' };
function regAtlas(sc, A, tp) {
  for (const c in A.chars) {
    const C = A.chars[c]; C.tp = tp; sc.META[c] = C;
    for (const k in C.frames) { const [p, x, y, w, h] = C.frames[k]; sc.textures.get(tp + p).add(k, 0, x, y, w, h); }
    // clips manquants synthétisés à partir des existants
    const cl = C.clips;
    if (!cl.getup && cl.fall) cl.getup = cl.fall.slice().reverse();
    if (!cl.hurt && cl.break) cl.hurt = cl.break.slice(0, 5);
  }
}
/* ---------- Animation ---------- */
// coups dont l'animation dédiée n'est pas encore produite : on réutilise la plus proche
const CLIP_ALIAS = { kick: 'atk3', kick2: 'kick', sweep: 'kick', rush: 'dash', held: 'hurt', win: 'idle', grab: 'atk1', knee: 'atk2', throw: 'atk3' };
function setClip(a, clip, fps, loop, onEnd) {
  if (a.clip === clip && a.loop && loop) return;
  const C = SC.META[a.kind].clips; if (!C[clip] && CLIP_ALIAS[clip] && C[CLIP_ALIAS[clip]]) clip = CLIP_ALIAS[clip]; if (!C[clip]) clip = C.idle ? 'idle' : Object.keys(C)[0];
  a.clip = clip; a.frames = C[clip]; a.fps = fps; a.loop = !!loop; a.at = 0; a.fi = -1; a.onEnd = onEnd || null; a.ended = false;
}
function animStep(a, dt) {
  a.at += dt * a.fps; let i = Math.floor(a.at);
  if (i >= a.frames.length) { if (a.loop) { a.at %= a.frames.length; i = Math.floor(a.at); } else { i = a.frames.length - 1; if (!a.ended) { a.ended = true; const f = a.onEnd, fr = a.frames; a.onEnd = null; if (f) f(); if (a.frames !== fr) return; } } }
  a.fi = Math.min(i, a.frames.length - 1);
}
const prog = a => clamp(a.at / a.frames.length, 0, 1);
function draw(a) {
  const k = a.frames[a.fi < 0 ? 0 : Math.min(a.fi, a.frames.length - 1)], fm = SC.META[a.kind].frames[k];
  a.spr.setTexture(SC.META[a.kind].tp + fm[0], k);
  a.spr.setFlipX(a.face < 0); a.spr.setOrigin(a.face < 0 ? 1 - fm[5] : fm[5], fm[6]);
  a.spr.setPosition(a.x, a.y - a.z - (a.hover || 0)).setDepth(a.y + (a.dz || 0) + (a.isPlayer && (a.st === 'grab' || a.st === 'held') ? 40 : 0));
  a.sh.setPosition(a.x, a.y + 2).setDepth(3).setScale(a.shW * (1 - Math.min(.5, a.z / 300)), 1).setAlpha(.38 * (1 - Math.min(.6, a.z / 300)));
  if (a.isPlayer) { const coop = NPLAYERS > 1; a.sh.setTint(coop ? (a.slot ? 0xff8a3d : 0x2fe0d0) : 0x000000); if (coop) a.sh.setAlpha(.55 * (1 - Math.min(.6, a.z / 300))); }
}

/* ---------- Entités ---------- */
let UID = 0;
function actor(kind, x, y, face) {
  const sc = CHAR[kind].h / SC.META[kind].refH;
  const a = { kind, x, y, z: 0, vz: 0, vx: 0, vy: 0, face: face || 1, hp: 100, max: 100, st: 'idle', t: 0, cd: 0, inv: 0, flash: 0, hitIds: new Set(), dead: false, shW: kind === 'ferrum' ? 2.6 : kind === 'chien' ? 1.6 : 1.1 };
  a.spr = SC.add.image(x, y, SC.META[kind].tp + '0').setScale(sc); a.id = ++UID; a.sh = SC.add.image(x, y, 'shadow');
  a.scale = sc;
  return a;
}
function newGame(demo) {
  if (G) { for (const e of G.all) { e.spr.destroy(); e.sh.destroy(); e.bub && e.bub.destroy(); } for (const p of G.props) p.spr.destroy(); for (const p of G.items) p.spr.destroy(); for (const s of G.shots) s.spr && s.spr.destroy(); }
  const D = DIFF[DIFFK];
  G = { demo, t: 0, cam: 0, camMin: 0, lock: null, enc: 0, wave: 0, score: 0, combo: 0, comboT: 0, hitstop: 0, ts: 1, tsT: 1, all: [], en: [], props: [], items: [], shots: [], rings: [], beams: [], boss: null, ended: false, checkpoint: 0, kills: 0, tokens: 0, goT: 0, timers: [], said: {}, cont: D.cont, zoneTint: 0xffffff, players: [], event: null, pshots: [], haz: [], clouds: [], gustT: 0, wind: 0 };
  G.players.push(newPlayer(0, 220, 430));
  G.players.push(newPlayer(1, 160, 470));
  if (!demo && NPLAYERS > 1) joinPlayer(G.players[1], true);
  G.p = G.players[0];
  for (const e of ENC) for (const [x, f, k] of e.props) addProp(k, x, f);
  updHUD();
}
function newPlayer(slot, x, y) {
  const p = actor('amara', x, y, 1); p.hp = p.max = 100; p.en = 40; p.st = 'idle'; p.combo = 0; p.buffer = 0; p.dashCd = 0; p.air = false; p.airAtk = false; p.atkId = slot * 100000; p.runT = 0; p.run = false; p.grabCd = 0;
  p.isPlayer = true; p.slot = slot; p.inp = INP[slot]; p.lives = DIFF[DIFFK].lives; p.score = 0; p.rank = 1; p.nextLife = LIFE_STEP; p.weapon = null; p.active = slot === 0;
  setClip(p, 'idle', 14, true);
  if (!p.active) { p.spr.setVisible(false); p.sh.setVisible(false); } else G.all.push(p);
  return p;
}
// le J2 rejoint la partie (écran titre « 2 joueurs », ou START sur la 2e manette en cours de jeu)
function joinPlayer(p, silent) {
  if (p.active) return; const p1 = G.players[0];
  p.active = true; p.hp = p.max; p.en = 50; p.lives = DIFF[DIFFK].lives; p.st = 'idle'; p.z = 0; p.vx = p.vy = 0; p.inv = silent ? 0 : 2;
  p.x = clamp(p1.x - 70, (G.lock != null ? G.lock : G.cam) + 60, (G.lock != null ? G.lock : G.cam) + VW - 60); p.y = clamp(p1.y + 40, floorAt(p.x)[0], floorAt(p.x)[1]);
  p.spr.setVisible(true); p.sh.setVisible(true); if (!G.all.includes(p)) G.all.push(p);
  setClip(p, 'idle', 14, true); NPLAYERS = 2; $('hud2').hidden = false;
  if (!silent) { floatTxt(p.x, p.y - 240, 'J2 EN PISTE', '#ffb37a', true); sfx.pick(); glowFx(p.x, p.y - 100, 0xffb37a, 5, 500); }
  updHUD();
}
function addProp(kind, x, f) {
  const fl = floorAt(x), y = fl[0] + (fl[1] - fl[0]) * f;
  const spr = SC.add.image(x, y, 'props', kind).setOrigin(.5, .96).setScale(kind === 'kiosk' ? .62 : kind === 'cell' ? .4 : .42).setDepth(y);
  G.props.push({ kind, x, y, z: 0, vx: 0, hp: kind === 'crate' ? 2 : kind === 'kiosk' ? 3 : 1, spr, armed: 0, rolling: 0, hitIds: new Set() });
}
const ENEMY = {
  milicien: { hp: 70, spd: 120, pts: 150 },
  tireuse: { hp: 52, spd: 90, pts: 200 },
  chien: { hp: 46, spd: 250, pts: 180 },
  brute: { hp: 150, spd: 70, pts: 400 },
  pretresse: { hp: 58, spd: 0, pts: 350 },
  ferrum: { hp: 660, spd: 55, pts: 10000 },
  faucheuse: { hp: 84, spd: 105, pts: 260 },
  yewa: { hp: 720, spd: 150, pts: 12000 },
  harponneur: { hp: 90, spd: 95, pts: 280 }, ijji: { hp: 760, spd: 85, pts: 14000 },
  plongeur: { hp: 70, spd: 130, pts: 300 }, oshun: { hp: 800, spd: 120, pts: 16000 },
  spectre: { hp: 66, spd: 140, pts: 320 }, eshu: { hp: 820, spd: 120, pts: 18000 },
  lamelune: { hp: 100, spd: 150, pts: 400 }, nyx: { hp: 1000, spd: 170, pts: 30000 }
};
// variantes élites : même dessin recoloré, comportement plus dangereux
const ELITE = {
  milicien: { name: 'CAPITAINE', tint: [255, 150, 170] }, // saisit le joueur
  chien: { name: 'ALPHA', tint: [170, 200, 255] },        // double bond
  tireuse: { name: 'TIREUSE D\'ÉLITE', tint: [255, 230, 140] }, // rafale de 3 tirs
  brute: { name: 'COLOSSE', tint: [255, 160, 120] },      // bouclier renforcé, onde plus large
  pretresse: { name: 'GRANDE PRÊTRESSE', tint: [255, 170, 255] },
  faucheuse: { name: 'MOISSONNEUSE', tint: [255, 150, 120] }, // fauche plus vite, spores plus larges
  harponneur: { name: 'BOSCO', tint: [255, 190, 130] }, plongeur: { name: 'PLONGEUR D\'ABYSSE', tint: [150, 210, 255] },
  spectre: { name: 'SPECTRE ANCIEN', tint: [255, 170, 230] }, lamelune: { name: 'LAME-ÉCLIPSE', tint: [255, 140, 140] }
};
function spawn(kind, side, elite) {
  const cam = G.lock ? G.lock : G.cam, fl = floorAt(cam + VW / 2);
  const x = side > 0 ? cam + VW + 60 : cam - 60, y = rnd(fl[0] + 10, fl[1] - 10);
  const e = actor(kind, x, y, -side); const D = ENEMY[kind];
  e.hp = e.max = Math.round(D.hp * DIFF[DIFFK].ehp * (elite ? 1.6 : 1)); e.spd = D.spd * (elite ? 1.15 : 1); e.cd = rnd(.6, 1.4); if (elite) { e.elite = true; later(.6, () => !e.dead && floatTxt(e.x, e.y - CHAR[kind].h - 30, ELITE[kind].name, '#ff8ab0')); } e.st = 'enter'; e.side = side; e.enterX = side > 0 ? cam + VW - rnd(120, 260) : cam + rnd(120, 260);
  if (kind === 'brute') e.shield = e.shieldMax = elite ? 110 : 70;
  if (kind === 'pretresse') { e.hover = 14; e.tpT = rnd(3, 5); e.sigilT = rnd(2, 4); }
  setClip(e, kind === 'pretresse' ? 'idle' : kind === 'tireuse' ? 'roll' : 'walk', kind === 'chien' ? 30 : kind === 'tireuse' ? 18 : 24, kind !== 'tireuse');
  G.en.push(e); G.all.push(e); return e;
}
function spawnBoss() {
  const L = G.lock, K = LEVELS[LV].boss.kind;
  const e = actor(K, L + VW + 140, (floorAt(L + 600)[0] + floorAt(L + 600)[1]) / 2, -1);
  e.hp = e.max = Math.round(ENEMY[K].hp * DIFF[DIFFK].ehp * (NPLAYERS > 1 ? 1.5 : 1)); e.spd = ENEMY[K].spd;
  if (K === 'yewa') { e.x = L + VW - 260; e.hover = 420; e.st = 'yewaEnter'; e.shW = 2.2; } e.st = 'bossEnter'; e.phase = 1; e.cd = 2; e.boss = true; e.dz = 2;
  setClip(e, 'idle', 12, true); G.en.push(e); G.all.push(e); G.boss = e;
  $('boss').hidden = false; updBoss();
}

// minuteries en temps de jeu (figées en pause / gel d'impact ; real = insensible au ralenti)
function later(sec, fn, real) { if (G) G.timers.push({ t: sec, fn, real: !!real, g: G }); }
function runTimers(dt, rdt) {
  const due = [];
  for (const t of G.timers) { t.t -= t.real ? rdt : dt; if (t.t <= 0) due.push(t); }
  if (due.length) { G.timers = G.timers.filter(t => t.t > 0); for (const t of due) if (t.g === G) t.fn(); }
}
/* ---------- Effets ---------- */
function floatTxt(x, y, s, col, big) {
  const t = SC.add.text(x, y, s, { fontFamily: 'Unbounded, Arial Black, sans-serif', fontSize: big ? '28px' : '17px', fontStyle: '800', color: col || '#fff', stroke: '#0b0714', strokeThickness: 5 }).setOrigin(.5).setDepth(8600).setResolution(2);
  SC.tweens.add({ targets: t, y: y - (big ? 70 : 46), alpha: { from: 1, to: 0 }, scale: { from: big ? 1.4 : 1.15, to: 1 }, duration: big ? 1100 : 750, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}
function slashFx(x, y, face, col, sz) {
  const c = SC.add.image(x, y, 'crescent').setDepth(8200).setBlendMode('ADD').setTint(col || 0x9ff6ff).setScale(sz || .9).setFlipX(face < 0).setAlpha(.95);
  SC.tweens.add({ targets: c, scale: (sz || .9) * 1.35, alpha: 0, duration: 180, onComplete: () => c.destroy() });
}
function ringFx(x, y, col, r, dur, flat) {
  const c = SC.add.image(x, y, 'ring').setDepth(flat ? 4 : 8200).setBlendMode('ADD').setTint(col).setScale(.1, flat ? .035 : .1).setAlpha(1);
  SC.tweens.add({ targets: c, scaleX: r / 64, scaleY: flat ? r / 64 * .35 : r / 64, alpha: 0, duration: dur || 400, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
}
function glowFx(x, y, col, s, dur) {
  const c = SC.add.image(x, y, 'glow').setDepth(8150).setBlendMode('ADD').setTint(col).setScale(s || 3);
  SC.tweens.add({ targets: c, alpha: 0, scale: (s || 3) * 1.6, duration: dur || 300, onComplete: () => c.destroy() });
}
function bolt(x0, y0, x1, y1, col) {
  const g = SC.fxg; g.lineStyle(3, col || 0x9ff6ff, 1); g.beginPath(); g.moveTo(x0, y0);
  const n = 7; for (let i = 1; i < n; i++) { const t = i / n; g.lineTo(x0 + (x1 - x0) * t + rnd(-14, 14), y0 + (y1 - y0) * t + rnd(-14, 14)); } g.lineTo(x1, y1); g.strokePath();
}
function shake(ms, k) { SC.cameras.main.shake(ms, k); }
// flash d'écran adouci : jamais opaque (confort des yeux, surtout pour les enfants)
function softFlash(ms, r, g, b) {
  if (!SC.flashRect) SC.flashRect = SC.add.rectangle(0, 0, VW, VH, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(9500);
  const f = SC.flashRect; SC.tweens.killTweensOf(f); f.setFillStyle((r << 16) | (g << 8) | b, 1).setAlpha(.38);
  SC.tweens.add({ targets: f, alpha: 0, duration: Math.max(140, ms * 1.4), ease: 'Quad.easeOut' });
}

/* ---------- Combat ---------- */
// boîte de coup : portée devant, tolérance de profondeur, hauteur
function inFront(a, b, reach, depth, back) {
  const dx = (b.x - a.x) * a.face; return dx > -(back || 20) && dx < reach && Math.abs(b.y - a.y) < depth && Math.abs((b.z || 0) - a.z) < (a.st === 'airAtk' ? 220 : 110); // coup aérien : porte vers le bas
}
function hitEnemy(e, dmg, kind, src) {
  if (e.dead || e.st === 'tpout' || e.inv > 0) return false;
  const p = ownerOf(src), fromFront = Math.sign(src.x - e.x) === e.face;
  // un coup sur un ennemi qui tient un joueur le force à lâcher prise
  if (e.st === 'holding' && e.held) { const h = e.held; freeHeld(h, e); }
  // bouclier de la prêtresse
  if (e.sigil > 0) { e.sigil -= dmg; sfx.block(); SC.pViolet.explode(10, e.x, e.y - 120); floatTxt(e.x, e.y - 200, 'SCEAU', '#b07cff'); if (e.sigil <= 0) { e.bub && e.bub.destroy(); e.bub = null; } hitstop(.04); return true; }
  // Nyx en garde-contre : le coup est renvoyé à l'attaquant
  if (e.kind === 'nyx' && e.counterReady && p && src === p) { e.counterReady = false; sfx.block(); hitstop(.1); SC.pViolet.explode(24, e.x, e.y - 120); floatTxt(e.x, e.y - 260, 'CONTRE !', '#c9a0ff', true); hurtPlayer(p, 18, e, true); return true; }
  if (e.kind === 'nyx') { e.hitCount = (e.hitCount || 0) + 1; e.hitWin = 1.6; }
  // garde de la lame-lune : bloque tout ce qui n'est pas un coup lourd de dos
  if (e.kind === 'lamelune' && e.guard && fromFront && kind !== 'power' && kind !== 'object') { sfx.block(); SC.pViolet.explode(10, e.x + e.face * 30, e.y - 120); floatTxt(e.x, e.y - 210, 'PARÉ', '#c9a0ff'); hitstop(.04); return true; }
  // garde du milicien
  if (e.kind === 'milicien' && e.st === 'block' && fromFront && kind !== 'heavy' && kind !== 'power') { sfx.block(); SC.pSpark.explode(10, e.x + e.face * 30, e.y - 120); floatTxt(e.x, e.y - 210, 'BLOQUÉ', '#ffd36b'); e.x -= e.face * 10; hitstop(.03); return true; }
  // bouclier de la brute
  if (e.kind === 'brute' && e.shield > 0 && fromFront && kind !== 'power') {
    e.shield -= dmg * (kind === 'heavy' ? 1.6 : 1); sfx.block(); SC.pViolet.explode(14, e.x + e.face * 50, e.y - 130); hitstop(.04); e.x -= e.face * 6;
    if (e.shield <= 0) { e.atk = false; e.st = 'break'; e.t = 0; setClip(e, 'break', 16, false, () => knock(e, 0)); sfx.shatter(); shake(220, .008); floatTxt(e.x, e.y - 240, 'BOUCLIER BRISÉ', '#b07cff', true); }
    return true;
  }
  let m = 1;
  if (e.boss && e.kind === 'yewa') { const air = src && src.isPlayer && src.z > 40; m = e.st === 'tired' ? 1.6 : air || kind === 'power' || kind === 'object' ? 1.1 : .5; }
  else if (e.boss) { if (e.phase === 1 && kind !== 'power' && kind !== 'object' && kind !== 'heavy') m = .55; if (e.st === 'kneel') m = 1.6; if (e.phase === 2) m *= 1.1; }
  if (e.kind === 'brute' && e.st === 'down') m = 1.5;
  const direct = src === p, wpn = direct && p.weapon ? p.weapon.kind : null;
  const d = Math.round(dmg * m * (wpn === 'spear' ? 1.4 : 1) * (direct ? RANKS[p.rank - 1].dmg : 1) * (e.elite ? .85 : 1));
  e.hp -= d; e.flash = .09; e.atk = false; G.combo++; G.comboT = 2.2; p.en = Math.min(100, p.en + 4);
  if (wpn && kind !== 'power') wearWeapon(p);
  addScore(p, d * 10 * Math.min(5, 1 + Math.floor(G.combo / 5)));
  floatTxt(e.x + rnd(-14, 14), e.y - CHAR[e.kind].h * .9 - e.z, String(d), m > 1 ? '#ffd36b' : '#fff');
  // la prêtresse perd ses sceaux posés quand on la frappe
  if (e.kind === 'pretresse') for (const o of G.en) if (o.sigilFrom === e) { o.sigil = 0; o.bub && o.bub.destroy(); o.bub = null; }
  if (e.hp <= 0) { kill(e, src); return true; }
  if (e.boss) { bossCrack(e); if (e.phase === 1 && e.hp <= e.max * .5) BOSSAI[e.kind].phase2(e); updBoss(); return true; }
  if (e.st === 'grabbed') { e.flash = .09; return true; } // tenu par un joueur : le partenaire peut frapper sans le libérer
  const big = kind === 'heavy' || kind === 'power' || kind === 'object' || wpn === 'hammer';
  if (big || (e.kind === 'pretresse' && Math.random() < .3)) knock(e, Math.sign(e.x - src.x) || -e.face);
  else if (e.st !== 'fall' && e.st !== 'down') { e.st = 'hurt'; e.t = 0; setClip(e, 'hurt', 20, false, () => { if (e.st === 'hurt') { e.st = 'think'; e.cd = rnd(.3, .7); } }); e.x += (Math.sign(e.x - src.x) || 1) * 8; e.vx = 0; }
  return true;
}
function knock(e, dir) {
  if (e.dead) return;
  if (e.kind === 'pretresse') { e.st = 'hurt'; e.t = 0; setClip(e, 'hurt', 16, false, () => { if (!e.dead) teleport(e); }); return; }
  e.atk = false; e.st = 'fall'; e.t = 0; e.vx = dir * 260; e.vz = 380; e.z = Math.max(e.z, 1);
  setClip(e, 'fall', 22, false);
}
function kill(e, src) {
  e.dead = true; e.atk = false; e.hp = 0; G.kills++; for (const q of G.players) if (q.grabE === e) releaseGrab(q);
  if (e.held) freeHeld(e.held, e);
  const D = ENEMY[e.kind], who = ownerOf(src); addScore(who, D.pts * (e.elite ? 2 : 1) * Math.min(5, 1 + Math.floor(G.combo / 5))); who.en = Math.min(100, who.en + 12);
  e.bub && e.bub.destroy();
  if (e.boss) return bossDeath(e);
  e.st = 'dying'; e.t = 0; const dir = Math.sign(e.x - src.x) || 1; e.vx = dir * 300; e.vz = 420; e.z = Math.max(1, e.z);
  setClip(e, 'fall', 22, false); hitstop(.09); shake(160, .006);
  // dernier ennemi de la dernière vague : ralenti
  const left = G.en.filter(o => !o.dead).length;
  if (left === 0 && G.lock && !ENC[G.enc].boss && G.wave >= ENC[G.enc].waves.length - 1) { G.tsT = .25; later(.65, () => G.tsT = 1, true); softFlash(120, 255, 240, 220); }
}
function hitstop(s) { G.hitstop = Math.max(G.hitstop, s); }
function hurtPlayer(p, dmg, src, heavy) {
  if (!p || !p.active || p.inv > 0 || p.st === 'dead' || p.st === 'out' || p.st === 'power' || p.st === 'dash' || p.st === 'rush' || G.ended) return false;
  if (p.st === 'grab') releaseGrab(p);
  if (p.st === 'held') freeHeld(p, null);
  dmg = Math.max(1, Math.round(dmg * DIFF[DIFFK].hurt));
  p.hp -= dmg; G.combo = 0; sfx.hurt(); sfx.hit(); shake(180, .009); hitstop(.07); p.flash = .1;
  SC.pSpark.explode(12, p.x, p.y - 120 - p.z);
  if (p.hp <= 0) {
    p.hp = 0; p.st = 'dead'; dropWeapon(p); p.vx = Math.sign(p.x - src.x) * 200; p.vz = 360; p.z = Math.max(1, p.z); setClip(p, 'fall', 20, false); G.tsT = .35; p.lives--;
    if (p.rank > 1) { p.rank--; } // une étoile perdue à chaque chute
    later(1.6, () => { G.tsT = 1; if (p.lives > 0) respawn(p); else playerOut(p); }, true); updHUD(); return true;
  }
  if (heavy || p.z > 0) { p.st = 'fall'; p.t = 0; dropWeapon(p); p.vx = (Math.sign(p.x - src.x) || -p.face) * 240; p.vz = 340; p.z = Math.max(p.z, 1); setClip(p, 'fall', 24, false); }
  else { p.st = 'hurt'; p.t = 0; p.inv = Math.max(p.inv, .45); setClip(p, 'hurt', 22, false, () => { if (p.st === 'hurt') toIdle(p); }); p.x += (Math.sign(p.x - src.x) || -p.face) * 14; }
  updHUD(); return true;
}

function respawn(p) {
  p.hp = p.max; p.en = Math.max(p.en, 50); p.z = 0; p.vx = p.vy = 0; p.inv = 2.6; p.st = 'getup'; setClip(p, 'getup', 22, false, () => p.st === 'getup' && toIdle(p));
  sfx.storm(); shake(300, .012); softFlash(220, 160, 250, 255); ringFx(p.x, p.y, 0x8ef7ff, 320, 600, true); glowFx(p.x, p.y - 100, 0x8ef7ff, 7, 600);
  for (const e of G.en) if (!e.dead && !e.boss && Math.abs(e.x - p.x) < 340) knock(e, Math.sign(e.x - p.x) || 1);
  floatTxt(p.x, p.y - 240, p.slot ? 'J2 SE RELÈVE' : 'AMARA SE RELÈVE', p.slot ? '#ffb37a' : '#8ef7ff', true); updHUD();
}
// plus de vies : le joueur sort ; la partie s'arrête quand plus personne n'est debout
function playerOut(p) {
  if (G.players.some(q => q !== p && q.active && q.st !== 'out')) {
    // l'équipe continue : le joueur tombé peut revenir en dépensant un crédit (START / Tempête)
    p.st = 'out'; p.spr.setVisible(false); p.sh.setVisible(false); p.hp = 0;
    floatTxt(p.x, p.y - 200, (p.slot ? 'J2' : 'J1') + ' HORS JEU' + (G.cont > 0 ? ' · START POUR REVENIR' : ''), '#ff5a6e', true); updHUD();
  } else showOver();
}
function rejoin(p) {
  if (p.st !== 'out' || G.cont <= 0) return; G.cont--; p.lives = DIFF[DIFFK].lives; p.spr.setVisible(true); p.sh.setVisible(true);
  const o = G.players.find(q => q !== p && q.active && q.st !== 'out') || p; p.x = o.x - 60 * (p.slot ? 1 : -1); p.y = o.y; respawn(p);
}
/* ---------- Joueur ---------- */
function toIdle(p) { p.st = 'idle'; p.combo = 0; setClip(p, 'idle', 14, true); }
const ATK = {
  atk1: { fps: 30, win: [.3, .7], reach: 150, dmg: 9, lunge: 30, kind: 'light' },
  atk2: { fps: 30, win: [.25, .75], reach: 160, dmg: 11, lunge: 40, kind: 'light' },
  atk3: { fps: 30, win: [.45, .85], reach: 190, dmg: 18, lunge: 60, kind: 'heavy' },
  airAtk: { fps: 26, win: [.15, .9], reach: 160, dmg: 15, lunge: 0, kind: 'heavy' },
  airSlash: { fps: 26, win: [.2, .8], reach: 175, dmg: 16, lunge: 0, kind: 'heavy', depth: 55 },
  airKick: { fps: 24, win: [.2, .95], reach: 165, dmg: 18, lunge: 0, kind: 'heavy', depth: 55 },
  heavy: { fps: 26, win: [.32, .62], reach: 210, dmg: 24, lunge: 50, kind: 'power', depth: 55 },
  dash: { fps: 30, win: [.1, .75], reach: 170, dmg: 13, lunge: 0, kind: 'heavy' },
  kick: { fps: 24, win: [.3, .7], reach: 185, dmg: 15, lunge: 35, kind: 'heavy' },
  kick2: { fps: 22, win: [.35, .75], reach: 195, dmg: 18, lunge: 40, kind: 'heavy' },
  sweep: { fps: 22, win: [.33, .68], reach: 185, dmg: 13, lunge: 10, kind: 'power', depth: 60 },
  rush: { fps: 16, win: [.05, .85], reach: 150, dmg: 26, lunge: 0, kind: 'power', depth: 60 }
};
function startAtk(p, clip) {
  const I = p.inp;
  if (I.x && clip !== 'dash') p.face = Math.sign(I.x); // coup arrière : on se retourne en frappant
  p.st = clip; p.t = 0; p.atkId++; sfx.swing(); const A = ATK[clip];
  setClip(p, clip, A.fps * (p.weapon && p.weapon.kind === 'hammer' ? .85 : 1) * RANKS[p.rank - 1].spd, false, () => { if (p.st === clip) { if (p.buffer && (clip === 'atk1' || clip === 'atk2')) { const b = p.buffer; p.buffer = 0; startAtk(p, b === 3 ? 'heavy' : b === 2 ? 'kick2' : clip === 'atk1' ? 'atk2' : 'atk3'); } else toIdle(p); } });
  p.fx = false;
}
function playerUpdate(p, dt) {
  const I = p.inp, mvx = I.x, mvy = I.y;
  p.slowT = Math.max(0, (p.slowT || 0) - dt);
  p.inv = Math.max(0, p.inv - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.flash = Math.max(0, p.flash - dt); p.grabCd = Math.max(0, p.grabCd - dt);
  if (p.st === 'out') { I.atk = I.jump = I.dash = I.kick = I.heavy = I.sweep = I.sup2 = 0; if (I.pow) { I.pow = 0; rejoin(p); } return; }
  if (p.st === 'grab') { grabUpdate(p, dt); return; }
  if (p.st === 'held') { heldUpdate(p, dt); return; }
  const fl = floorAt(p.x);
  const grounded = p.z <= 0;
  if (p.st === 'dead') { physics(p, dt); return; }
  if (p.st === 'win') { p.vx = p.vy = 0; return; }
  // entrées
  if (I.pow) {
    I.pow = 0; const ok = grounded && ['idle', 'walk', 'atk1', 'atk2', 'atk3', 'hurt', 'land'].includes(p.st);
    if (ok && p.weapon) throwWeapon(p); // arme en main : Tempête = lancer
    else if (ok && (p.en >= 50 || p.hp > 20)) {
      if (p.en >= 50) p.en -= 50; else { p.hp -= 15; floatTxt(p.x, p.y - 250, 'SACRIFICE −15', '#ff5a6e', true); } // Tempête désespérée : coûte de la vie
      // direction maintenue vers l'avant : Ruée-tempête ; sinon Tempête circulaire
      if (mvx && Math.abs(mvx) > .3) { p.face = Math.sign(mvx); rush(p); } else power(p);
    }
    else if (ok) floatTxt(p.x, p.y - 230, 'TROP FAIBLE', '#ff5a6e');
  }
  if (I.dash) { I.dash = 0; if (p.dashCd <= 0 && grounded && ['idle', 'walk', 'atk1', 'atk2', 'land'].includes(p.st)) { if (mvx) p.face = Math.sign(mvx); p.st = 'dash'; p.t = 0; p.inv = .35; p.dashCd = .75; p.atkId++; sfx.dash(); setClip(p, 'dash', 30, false, () => p.st === 'dash' && toIdle(p)); } }
  if (I.jump) { I.jump = 0; if (grounded && ['idle', 'walk', 'land'].includes(p.st)) { p.st = 'air'; p.grav = 2100; p.vz = 860; p.z = 1; p.airAtk = false; p.airKind = null; sfx.jump(); SC.pDust.explode(6, p.x, p.y); setClip(p, 'jumpUp', 14, false); } }
  if (I.kick) {
    I.kick = 0;
    if (p.st === 'idle' || p.st === 'walk' || p.st === 'land') startAtk(p, mvy > .5 ? 'sweep' : 'kick');
    else if ((p.st === 'atk1' || p.st === 'atk2') && prog(p) > .35) p.buffer = 2; // finisher au pied
    else if (p.st === 'air' && !p.airAtk) airStrike(p, 'airKick');
  }
  if (I.atk) {
    I.atk = 0;
    if (p.st === 'walk' && p.run) { p.st = 'dash'; p.t = 0; p.atkId++; p.run = false; p.runT = 0; p.blitz = true; sfx.dash(); setClip(p, 'dash', 30, false, () => p.st === 'dash' && toIdle(p)); } // coup en course
    else if (p.st === 'idle' || p.st === 'walk' || p.st === 'land') startAtk(p, 'atk1');
    else if ((p.st === 'atk1' || p.st === 'atk2') && prog(p) > .35) p.buffer = 1;
    else if (p.st === 'air' && !p.airAtk) airStrike(p, 'airSlash');
  }
  if (I.sweep) { I.sweep = 0; if (p.st === 'idle' || p.st === 'walk' || p.st === 'land') startAtk(p, 'sweep'); else if (p.st === 'air' && !p.airAtk) airStrike(p, 'airKick'); }
  if (I.heavy) {
    I.heavy = 0;
    if (p.st === 'idle' || p.st === 'walk' || p.st === 'land') startAtk(p, 'heavy');
    else if ((p.st === 'atk1' || p.st === 'atk2') && prog(p) > .35) p.buffer = 3; // finisher lourd
    else if (p.st === 'air' && !p.airAtk) airStrike(p, 'airSlash');
  }
  if (I.sup2) {
    I.sup2 = 0; const ok = grounded && ['idle', 'walk', 'atk1', 'atk2', 'atk3', 'kick', 'land', 'hurt'].includes(p.st);
    if (ok && p.en >= 75) { p.en -= 75; foudre(p); } else if (ok) floatTxt(p.x, p.y - 230, 'FOUDRE : 75 %', '#ff5a6e');
  }
  // états
  if (p.st === 'idle' || p.st === 'walk') {
    if (mvx || mvy) {
      // course : double tape clavier, ou direction horizontale maintenue 0,5 s
      if (mvx && Math.sign(mvx) === p.face) p.runT += dt; else p.runT = 0;
      if (I.runReq && mvx) p.run = true; if (p.runT > .5) p.run = true; if (!mvx) p.run = false;
      const sp = (p.run ? 1.65 : 1) * (p.slowT > 0 ? .5 : 1);
      p.vx = mvx * 250 * sp; p.vy = mvy * 165; if (mvx) p.face = Math.sign(mvx);
      if (p.st !== 'walk') { p.st = 'walk'; setClip(p, 'walk', 30, true); }
      p.fps = p.run ? 46 : 30; if (p.run && Math.random() < .25) SC.pDust.explode(1, p.x - p.face * 20, p.y);
      tryGrab(p);
    }
    else { p.vx = p.vy = 0; p.run = false; p.runT = 0; if (p.st !== 'idle') toIdle(p); }
  } else if (p.st === 'air' || p.st === 'airAtk') {
    p.vx = mvx * 230; p.vy = mvy * 120; if (mvx && p.st === 'air') p.face = Math.sign(mvx);
    if (p.st === 'air' && p.vz < 0 && p.clip !== 'jumpDown') setClip(p, 'jumpDown', 14, false);
  } else if (ATK[p.st] && p.st !== 'airAtk') {
    const A = ATK[p.st], pr = prog(p); p.run = false; p.runT = 0;
    p.vx = p.st === 'dash' ? p.face * (pr < .7 ? 720 : 120) : p.st === 'rush' ? p.face * (pr < .75 ? 940 : 60) : (pr < .4 ? p.face * A.lunge * 3 : 0); p.vy = 0;
    if ((p.st === 'dash' || p.st === 'rush') && pr < .75 && Math.random() < (p.st === 'rush' ? 1 : .6)) (p.slot ? SC.pFire : SC.pBolt).explode(p.st === 'rush' ? 4 : 2, p.x - p.face * 30, p.y - 100);
    if (p.st === 'rush' && Math.random() < .3) bolt(p.x - p.face * 120, p.y - 110, p.x + p.face * 40, p.y - 100 + rnd(-30, 30), p.slot ? 0xffb37a : 0x9ff6ff);
  } else if (p.st === 'hurt' || p.st === 'land' || p.st === 'power' || p.st === 'super2' || p.st === 'getup') { p.vx = 0; p.vy = 0; }
  if (p.st !== 'dash') p.blitz = false;
  // coups portés
  const A = p.st === 'airAtk' ? ATK[p.airKind || 'airAtk'] : ATK[p.st];
  if (A) {
    const pr = prog(p);
    if (pr >= A.win[0] && !p.fx) { p.fx = true; slashFx(p.x + p.face * 90, p.y - 115 - p.z, p.face, p.weapon && p.weapon.kind === 'hammer' ? 0xffa040 : p.slot ? 0xffc08a : 0x9ff6ff, p.st === 'atk3' || p.st === 'heavy' ? 1.25 : .95); if (p.st === 'atk3' || p.st === 'heavy') { sfx.zap(); SC.pBolt.explode(14, p.x + p.face * 100, p.y - 100); } }
    if (pr >= A.win[0] && pr <= A.win[1]) {
      const reach = A.reach * (p.weapon && p.weapon.kind === 'spear' ? 1.4 : 1) * (p.st === 'dash' && p.blitz ? RANKS[p.rank - 1].blitz : 1);
      for (const e of G.en) if (!e.dead && !e.hitIds.has(p.atkId) && inFront(p, e, reach + (e.boss ? 60 : 0), e.boss ? 70 : (A.depth || 42))) {
        e.hitIds.add(p.atkId);
        if (hitEnemy(e, A.dmg, A.kind, p)) { sfx.hit(); if (A.kind === 'heavy') sfx.heavy(); hitstop(A.kind === 'heavy' ? .085 : .05); SC.pSpark.explode(A.kind === 'heavy' ? 16 : 9, e.x - e.face * 10, e.y - CHAR[e.kind].h * .55 - e.z); glowFx(e.x, e.y - CHAR[e.kind].h * .55 - e.z, 0x9ff6ff, 1.6, 160); shake(A.kind === 'heavy' ? 140 : 70, A.kind === 'heavy' ? .007 : .003); }
      }
      for (const o of G.props) if (!o.dead && !o.hitIds.has(p.atkId) && inFront(p, o, reach, 46)) { o.hitIds.add(p.atkId); hitProp(o, p, A.kind); }
    }
  }
  physics(p, dt);
  // atterrissage
  if (p.z <= 0 && (p.st === 'air' || p.st === 'airAtk')) { p.st = 'land'; sfx.land(); SC.pDust.explode(8, p.x, p.y); setClip(p, 'land', 24, false, () => p.st === 'land' && toIdle(p)); }
  if (p.z <= 0 && p.st === 'fall' && p.vz <= 0 && p.clip === 'fall' && p.t > .2) { p.st = 'down'; p.t = 0; shake(120, .005); SC.pDust.explode(10, p.x, p.y); setClip(p, 'down', 10, true); }
  if (p.st === 'down') { p.t += dt; if (p.t > .55) { p.st = 'getup'; p.inv = 1.1; setClip(p, 'getup', 26, false, () => p.st === 'getup' && toIdle(p)); } }
  if (p.st === 'fall') p.t += dt;
  // limites
  const L = G.lock != null ? G.lock : G.camMin;
  p.x = clamp(p.x, L + 40, (G.lock != null ? G.lock + VW : WORLD_W) - 40);
  const f2 = floorAt(p.x); p.y = clamp(p.y, f2[0], f2[1]);
}
function physics(a, dt) {
  a.x += a.vx * dt; a.y += a.vy * dt;
  if (a.z > 0 || a.vz > 0) { a.vz -= (a.grav || 1900) * dt; a.z += a.vz * dt; if (a.z <= 0) { a.z = 0; a.vz = 0; if (a.st === 'fall' || a.st === 'dying' || a.st === 'dead') a.vx *= .35; } }
  else if (a.st === 'fall' || a.st === 'dying' || a.st === 'dead') a.vx *= Math.pow(.02, dt);
}
function power(p) {
  p.st = 'power'; p.t = 0; p.inv = 1.2; p.vx = p.vy = 0; sfx.charge(); updHUD();
  setClip(p, 'power', 24, false, () => p.st === 'power' && toIdle(p));
  later(.56, () => {
    if (!p.active || p.st === 'out') return;
    sfx.storm(); shake(380, .014); softFlash(160, 160, 250, 255); hitstop(.12);
    ringFx(p.x, p.y, 0x8ef7ff, 300, 520, true); ringFx(p.x, p.y - 110, 0xffffff, 160, 320); glowFx(p.x, p.y - 100, 0x8ef7ff, 7, 500);
    SC.pBolt.explode(60, p.x, p.y - 100);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; bolt(p.x, p.y - 110, p.x + Math.cos(a) * 280, p.y - 110 + Math.sin(a) * 140); }
    for (const e of G.en) if (!e.dead && Math.abs(e.x - p.x) < 300 && Math.abs(e.y - p.y) < 120) { hitEnemy(e, 34, 'power', p); SC.pBolt.explode(10, e.x, e.y - 100); }
    for (const o of G.props) if (!o.dead && Math.abs(o.x - p.x) < 300 && Math.abs(o.y - p.y) < 120) hitProp(o, p, 'power');
  });
}

/* ---------- Ruée-tempête : direction + Tempête ---------- */
function rush(p) {
  p.st = 'rush'; p.t = 0; p.inv = .7; p.atkId++; p.vy = 0; sfx.charge(); sfx.dash(); updHUD();
  setClip(p, 'rush', 22, false, () => p.st === 'rush' && toIdle(p));
  softFlash(90, 160, 250, 255); glowFx(p.x, p.y - 100, p.slot ? 0xffb37a : 0x8ef7ff, 5, 300);
}

/* ---------- Attaques aériennes ---------- */
function airStrike(p, kind) {
  const I = p.inp; if (I.x) p.face = Math.sign(I.x);
  p.airAtk = true; p.airKind = kind; p.st = 'airAtk'; p.atkId++; p.fx = false; sfx.swing();
  if (p.vz < 0) p.vz *= .4; // petit flottement pour que le coup porte
  setClip(p, kind, ATK[kind].fps, false);
}

/* ---------- Foudre céleste : 2e super (75 % d'énergie) ---------- */
function foudre(p) {
  if (p.inp.x) p.face = Math.sign(p.inp.x);
  p.st = 'super2'; p.t = 0; p.inv = 1.8; p.vx = p.vy = 0; p.atkId++; sfx.charge(); updHUD();
  floatTxt(p.x, p.y - 280, 'FOUDRE CÉLESTE', '#8ef7ff', true);
  setClip(p, 'super2', 22, false, () => p.st === 'super2' && toIdle(p));
  later(.25, () => { if (!p.active || p.st !== 'super2') return; bolt(p.x + p.face * 10, -40, p.x + p.face * 10, p.y - 200, 0xffffff); glowFx(p.x, p.y - 180, 0x8ef7ff, 5, 300); sfx.zap(); });
  later(.55, () => {
    if (!p.active || p.st === 'out') return;
    const cx = p.x + p.face * 200;
    sfx.storm(); shake(480, .018); softFlash(200, 200, 255, 255); hitstop(.14);
    ringFx(cx, p.y, 0x8ef7ff, 360, 600, true); glowFx(cx, p.y - 60, 0xffffff, 8, 500);
    for (let i = 0; i < 7; i++) { const x = cx + (i - 3) * 85 + rnd(-20, 20); bolt(x, -40, x + rnd(-30, 30), p.y + rnd(-40, 40), i % 2 ? 0xffffff : 0x8ef7ff); SC.pBolt.explode(10, x, p.y - 40); }
    for (const e of G.en) if (!e.dead && (e.x - p.x) * p.face > -140 && (e.x - p.x) * p.face < 560 && Math.abs(e.y - p.y) < 130) { hitEnemy(e, 40, 'power', p); SC.pBolt.explode(12, e.x, e.y - 100); }
    for (const o of G.props) if (!o.dead && (o.x - p.x) * p.face > -140 && (o.x - p.x) * p.face < 560 && Math.abs(o.y - p.y) < 130) hitProp(o, p, 'power');
  });
}

/* ---------- Prise & projection ---------- */
const GRABBABLE = { milicien: 1, tireuse: 1, brute: 1, faucheuse: 1, harponneur: 1, plongeur: 1, lamelune: 1 };
function tryGrab(p) {
  if (p.grabCd > 0 || p.z > 0 || !p.inp.x) return;
  for (const e of G.en) {
    if (e.dead || !GRABBABLE[e.kind] || e.z > 0 || e.inv > 0 || e.sigil > 0) continue;
    if (!['think', 'hurt', 'block', 'enter'].includes(e.st)) continue;
    if (e.kind === 'brute' && e.shield > 0) continue;
    if (G.players.some(q => q !== p && q.grabE === e)) continue;
    const dx = (e.x - p.x) * p.face;
    if (dx > 20 && dx < 78 && Math.abs(e.y - p.y) < 18) {
      p.st = 'grab'; p.t = 0; p.knees = 0; p.grabE = e; p.vx = p.vy = 0; p.run = false; p.vault = null;
      e.st = 'grabbed'; e.atk = false; e.vx = e.vy = 0; e.face = -p.face; e.t = 0;
      setClip(e, 'hurt', .001, false); setClip(p, 'grab', 6, true);
      sfx.block(); floatTxt(p.x, p.y - 230, 'PRISE', '#ffd36b'); tip('grab');
      return;
    }
  }
}
function releaseGrab(p) {
  const e = p.grabE; p.grabE = null; p.grabCd = .5; p.vault = null; p.z = 0;
  if (e && !e.dead && e.st === 'grabbed') { e.st = 'think'; e.cd = .5; setClip(e, 'idle', 10, true); }
  if (p.st === 'grab') toIdle(p);
}
function grabUpdate(p, dt) {
  const I = p.inp, e = p.grabE; p.t += dt; p.vx = p.vy = 0; I.pow = I.dash = 0;
  if (!e || e.dead) { releaseGrab(p); return; }
  // saut par-dessus l'ennemi tenu : on se retrouve dans son dos
  if (p.vault) {
    const v = p.vault; v.t += dt; const k = clamp(v.t / .36, 0, 1);
    p.x = v.x0 + (v.x1 - v.x0) * k; p.z = Math.sin(k * Math.PI) * 150; I.atk = I.jump = 0;
    if (k >= 1) { p.vault = null; p.z = 0; p.face = v.face; p.t = 0; sfx.land(); SC.pDust.explode(6, p.x, p.y); setClip(p, 'grab', 6, true); floatTxt(p.x, p.y - 230, 'DANS LE DOS', '#ffd36b'); }
    else return;
  }
  if (e.st !== 'grabbed') { releaseGrab(p); return; }
  e.x = p.x + p.face * 62; e.y = p.y + 1; e.z = 0;
  const behind = e.face === p.face, back = I.x && Math.sign(I.x) !== p.face;
  if (p.t > 1.8) { floatTxt(e.x, e.y - 220, 'DÉGAGÉ', '#ff5a6e'); e.x += p.face * 30; releaseGrab(p); return; }
  if (I.jump && !behind && !back) {
    // saut par-dessus
    I.jump = 0; const x1 = clamp(e.x + p.face * 62, (G.lock != null ? G.lock : G.cam) + 40, (G.lock != null ? G.lock : G.cam) + VW - 40);
    p.vault = { t: 0, x0: p.x, x1, face: -p.face }; sfx.jump(); setClip(p, 'jumpUp', 14, false); tip('vault'); return;
  }
  if (I.jump || (I.atk && back)) {
    I.jump = I.atk = 0;
    if (behind) suplex(p, e); else throwE(p, e, -p.face);
    return;
  }
  if (I.atk) {
    I.atk = 0; p.knees++; p.t = Math.min(p.t, .9); sfx.swing();
    const last = p.knees >= 3;
    setClip(p, 'knee', last ? 30 : 38, false, () => { if (p.st === 'grab') setClip(p, 'grab', 6, true); });
    later(.08, () => {
      if (p.st !== 'grab' || p.grabE !== e || e.dead) return;
      e.inv = 0; e.st = 'think';
      hitEnemy(e, last ? 14 : 8, last ? 'heavy' : 'grab', p); sfx.hit(); hitstop(last ? .09 : .05);
      SC.pSpark.explode(10, e.x - e.face * 10, e.y - CHAR[e.kind].h * .45); shake(last ? 160 : 80, last ? .008 : .004);
      if (e.dead) return;
      if (last) { p.grabE = null; p.grabCd = .5; later(.2, () => p.st === 'grab' && toIdle(p)); }
      else { e.st = 'grabbed'; setClip(e, 'hurt', .001, false); }
    });
  }
}
function throwE(p, e, dir) {
  p.face = dir; p.grabE = null; p.grabCd = .5; sfx.heavy(); hitstop(.06);
  setClip(p, 'throw', 30, false, () => p.st === 'grab' && toIdle(p));
  e.st = 'thrown'; e.t = 0; e.face = -dir; e.vx = dir * 600; e.vz = 420; e.z = 30; e.thrHit = new Set(); e.owner = p; e.slam = 16;
  setClip(e, 'fall', 22, false); floatTxt(p.x, p.y - 230, 'PROJECTION', '#ffd36b');
  later(.25, () => p.st === 'grab' && toIdle(p));
}
// prise de dos : l'ennemi passe par-dessus et s'écrase derrière (dégâts doublés à l'impact)
function suplex(p, e) {
  p.grabE = null; p.grabCd = .6; sfx.heavy(); hitstop(.08); shake(120, .006);
  setClip(p, 'throw', 28, false, () => p.st === 'grab' && toIdle(p));
  e.st = 'thrown'; e.t = 0; e.vx = -p.face * 260; e.vz = 760; e.z = 60; e.thrHit = new Set(); e.owner = p; e.slam = 32;
  setClip(e, 'fall', 18, false); floatTxt(p.x, p.y - 240, 'RENVERSEMENT', '#ffd36b', true);
  later(.3, () => p.st === 'grab' && toIdle(p));
}

/* ---------- Ennemis qui saisissent le joueur ---------- */
function enemyGrab(e, p) {
  if (!p || p.st === 'held' || p.z > 0 || p.inv > 0 || !['idle', 'walk', 'land', 'atk1', 'atk2', 'hurt'].includes(p.st)) return false;
  if (p.st === 'grab') releaseGrab(p);
  e.st = 'holding'; e.held = p; e.t = 0; e.atk = true; e.vx = e.vy = 0; e.holdHit = .7;
  p.st = 'held'; p.heldBy = e; p.mash = 0; p.t = 0; p.vx = p.vy = 0; p.run = false; dropWeapon(p);
  p.face = -e.face; setClip(p, 'held', 14, true); setClip(e, 'atk1', .001, false); e.at = 0;
  sfx.block(); floatTxt(p.x, p.y - 230, 'SAISIE ! MARTÈLE', '#ff5a6e', true); tip('held');
  return true;
}
function heldUpdate(p, dt) {
  const I = p.inp, e = p.heldBy; p.t += dt; p.vx = p.vy = 0;
  if (!e || e.dead || e.st !== 'holding') { freeHeld(p, e); return; }
  p.x = e.x + e.face * 58; p.y = e.y - 1; p.z = 0;
  // se dégager en martelant n'importe quel bouton ou direction
  if (I.atk || I.jump || I.dash || I.pow) { p.mash += 1; p.spr.x += rnd(-4, 4); I.atk = I.jump = I.dash = I.pow = 0; }
  if (I.x !== p.lastMx) { p.mash += .5; p.lastMx = I.x; }
  if (p.mash >= 7) { const h = e; freeHeld(p, e); h.st = 'hurt'; h.t = 0; setClip(h, 'hurt', 16, false, () => { if (h.st === 'hurt') { h.st = 'think'; h.cd = .8; } }); floatTxt(p.x, p.y - 220, 'LIBÉRÉE', '#7dffa8'); }
}
function holdingUpdate(e, dt) {
  const p = e.held; e.vx = e.vy = 0;
  if (!p || p.st !== 'held') { e.held = null; e.st = 'think'; e.atk = false; e.cd = 1; return; }
  e.holdHit -= dt;
  if (e.holdHit <= 0) {
    e.holdHit = .75; setClip(e, 'atk2', 20, false, () => { if (e.st === 'holding') { setClip(e, 'atk1', .001, false); e.at = 0; } });
    p.hp -= Math.max(1, Math.round(6 * DIFF[DIFFK].hurt)); p.flash = .1; sfx.hit(); hitstop(.04); shake(90, .004); G.combo = 0; updHUD();
    if (p.hp <= 0) { p.hp = 1; }
  }
  if (e.t > 2.4) { // fin de la prise : projection du joueur
    const q = p; freeHeld(q, e); q.inv = 0; hurtPlayer(q, 12, e, true); e.cd = 1.4;
  }
}
function freeHeld(p, e) {
  if (e) { e.held = null; e.atk = false; if (e.st === 'holding') { e.st = 'think'; e.cd = 1.2; setClip(e, 'idle', 10, true); } }
  if (p && p.st === 'held') { p.heldBy = null; p.inv = .7; toIdle(p); }
}

/* ---------- Armes tenues : usure, chute, lancer ---------- */
const WEAPONS = { spear: { name: 'LANCE D\'ORUN', uses: 14, col: '#8ef7ff' }, hammer: { name: 'MARTEAU-FORGE', uses: 10, col: '#ffb347' } };
function takeWeapon(p, kind, uses) {
  if (p.weapon) dropWeapon(p);
  p.weapon = { kind, uses: uses || WEAPONS[kind].uses }; floatTxt(p.x, p.y - 220, WEAPONS[kind].name, WEAPONS[kind].col, true); tip('weapon'); updHUD();
}
function wearWeapon(p) {
  if (!p.weapon) return; p.weapon.uses--;
  if (p.weapon.uses <= 0) { sfx.shatter(); SC.pSpark.explode(16, p.x + p.face * 60, p.y - 110); floatTxt(p.x, p.y - 230, 'ARME BRISÉE', '#ff5a6e'); p.weapon = null; }
  updHUD();
}
function dropWeapon(p) {
  if (!p.weapon) return; const w = p.weapon; p.weapon = null;
  const x = p.x - p.face * 50, f = floorAt(x), y = clamp(p.y + 10, f[0], f[1]);
  const spr = SC.add.image(x, y, 'props', w.kind).setOrigin(.5, .9).setScale(.32).setDepth(y);
  G.items.push({ kind: w.kind, uses: w.uses, x, y, spr, t: 0, cool: .8 }); updHUD();
}
function throwWeapon(p) {
  const w = p.weapon; p.weapon = null; updHUD();
  startAtk(p, 'atk3'); sfx.heavy();
  const spr = SC.add.image(p.x + p.face * 60, p.y - 120, 'props', w.kind).setScale(.36).setDepth(p.y + 1).setFlipX(p.face < 0);
  G.pshots.push({ kind: w.kind, x: p.x + p.face * 60, y: p.y, z: 120, vx: p.face * 980, owner: p, life: .9, spr, hit: new Set(), dmg: w.kind === 'spear' ? 30 : 36 });
  floatTxt(p.x, p.y - 230, 'LANCER', WEAPONS[w.kind].col);
}
function pshotsUpdate(dt) {
  for (const s of G.pshots) {
    s.life -= dt; s.x += s.vx * dt; s.spr.setPosition(s.x, s.y - s.z).setDepth(s.y + 1); s.spr.angle += (s.kind === 'hammer' ? 900 : 0) * dt * Math.sign(s.vx);
    if (Math.random() < .7) (s.kind === 'spear' ? SC.pBolt : SC.pFire).explode(1, s.x, s.y - s.z);
    for (const e of G.en) if (!e.dead && !s.hit.has(e.id) && Math.abs(e.x - s.x) < (e.boss ? 90 : 50) && Math.abs(e.y - s.y) < (e.boss ? 60 : 36)) {
      s.hit.add(e.id); hitEnemy(e, s.dmg, 'heavy', { x: s.x - s.vx, face: Math.sign(s.vx), owner: s.owner }); sfx.hit(); hitstop(.05);
      if (s.kind === 'hammer') { s.life = 0; explode(s.x, s.y, 140, 18, { isPlayer: true, thrown: true, owner: s.owner }); }
    }
    for (const o of G.props) if (!o.dead && Math.abs(o.x - s.x) < 50 && Math.abs(o.y - s.y) < 40) hitProp(o, { x: s.x - s.vx, face: Math.sign(s.vx), owner: s.owner }, 'heavy');
    const L = G.lock != null ? G.lock : G.cam; if (s.x < L - 60 || s.x > L + VW + 60) s.life = 0;
    if (s.life <= 0) s.spr.destroy();
  }
  G.pshots = G.pshots.filter(s => s.life > 0);
}

/* ---------- Score, rangs (étoiles), vies bonus ---------- */
const RANKS = [{ dmg: 1, spd: 1, blitz: 1, pow: 1 }, { dmg: 1.12, spd: 1.06, blitz: 1.25, pow: 1.25 }, { dmg: 1.25, spd: 1.12, blitz: 1.5, pow: 1.5 }];
const RANK_STEP = 30000, LIFE_STEP = 50000;
function addScore(p, n) {
  n = Math.round(n); G.score += n; if (!p || G.demo) return; p.score += n; p.rankPts = (p.rankPts || 0) + n;
  if (p.rank < 3 && p.rankPts >= RANK_STEP) { p.rank++; p.rankPts = 0; floatTxt(p.x, p.y - 260, '★'.repeat(p.rank) + ' RANG ' + p.rank, '#ffd36b', true); sfx.pick(); glowFx(p.x, p.y - 100, 0xffd36b, 5, 500); tip('rank'); updHUD(); }
  if (p.score >= p.nextLife) { p.nextLife += LIFE_STEP; if (p.lives < 9) { p.lives++; floatTxt(p.x, p.y - 290, '1 VIE EN PLUS', '#7dffa8', true); sfx.gong(); updHUD(); } }
}

/* ---------- Difficulté ---------- */
const DIFF = {
  facile: { label: 'Facile', lives: 5, cont: 5, hurt: .6, ehp: .8, elite: 0 },
  normal: { label: 'Normal', lives: 3, cont: 2, hurt: 1, ehp: 1, elite: 1 },
  difficile: { label: 'Difficile', lives: 3, cont: 1, hurt: 1.3, ehp: 1.25, elite: 2 }
};
let DIFFK = 'normal'; try { const d = localStorage.getItem('orun-diff'); if (DIFF[d]) DIFFK = d; } catch (e) {}

function thrownUpdate(e, dt) {
  physics(e, dt);
  for (const o of G.en) if (o !== e && !o.dead && !o.boss && !e.thrHit.has(o.id) && Math.abs(o.x - e.x) < 70 && Math.abs(o.y - e.y) < 34) {
    e.thrHit.add(o.id); hitEnemy(o, 18, 'object', e); SC.pSpark.explode(14, o.x, o.y - 100); sfx.heavy(); shake(140, .008);
  }
  if (G.boss && !G.boss.dead && !e.thrHit.has('b') && Math.abs(G.boss.x - e.x) < 110 && Math.abs(G.boss.y - e.y) < 50) { e.thrHit.add('b'); hitEnemy(G.boss, 22, 'object', e); }
  const L = G.lock != null ? G.lock : G.cam; e.x = clamp(e.x, L + 30, L + VW - 30);
  if (e.z <= 0 && e.t > .15) {
    const sl = e.slam || 16; e.hp -= sl; e.flash = .1; shake(sl > 20 ? 320 : 200, sl > 20 ? .016 : .01); sfx.boom(); SC.pDust.explode(sl > 20 ? 24 : 14, e.x, e.y); floatTxt(e.x, e.y - 120, String(sl), '#ffd36b', sl > 20); addScore(ownerOf(e), sl > 20 ? 600 : 300);
    if (sl > 20) for (const o of G.en) if (o !== e && !o.dead && !o.boss && Math.abs(o.x - e.x) < 130 && Math.abs(o.y - e.y) < 50) hitEnemy(o, 14, 'object', e);
    if (e.hp <= 0) kill(e, { x: e.x - e.vx, owner: e.owner }); else { e.st = 'down'; e.t = 0; e.vx = 0; setClip(e, 'down', 8, true); }
  }
}
// les ennemis ne se superposent plus
function separate() {
  const L = G.en.filter(e => !e.dead && !e.boss && e.z <= 0 && !['grabbed', 'thrown', 'fall', 'down', 'dying', 'gone', 'tpout'].includes(e.st));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) < 56 && Math.abs(dy) < 22) {
      const push = (56 - Math.abs(dx)) * .5, s = Math.sign(dx) || (a.id < b.id ? 1 : -1);
      a.x -= s * push * .5; b.x += s * push * .5;
      const sy = Math.sign(dy) || (a.id < b.id ? 1 : -1); a.y -= sy * 1.2; b.y += sy * 1.2;
    }
  }
}
/* ---------- Objets du décor ---------- */
function hitProp(o, src, kind) {
  if (o.dead) return;
  const dir = Math.sign(o.x - src.x) || src.face || 1;
  if (o.kind === 'barrel') { // le tonneau part en boulet
    if (kind === 'heavy' || kind === 'power') { o.owner = ownerOf(src); o.rolling = 1.4; o.vx = dir * 820; o.armed = 0; sfx.heavy(); floatTxt(o.x, o.y - 120, 'BOULET !', '#8ef7ff'); }
    else { o.x += dir * 18; o.spr.x = o.x; sfx.block(); }
    return;
  }
  if (o.kind === 'cell') { if (!o.armed) { o.owner = ownerOf(src); o.armed = 1.1; sfx.charge(); floatTxt(o.x, o.y - 120, 'SURCHARGE', '#8ef7ff'); } return; }
  o.owner = ownerOf(src); o.hp--; sfx.break(); SC.pSpark.explode(8, o.x, o.y - 50); o.spr.x += dir * 4;
  if (o.hp <= 0) breakProp(o);
}
function breakProp(o) {
  o.dead = true; SC.pFire.explode(12, o.x, o.y - 40); SC.pDust.explode(10, o.x, o.y);
  SC.tweens.add({ targets: o.spr, alpha: 0, scaleY: o.spr.scaleY * .3, duration: 220, onComplete: () => o.spr.destroy() });
  if (o.kind === 'kiosk') { addScore(o.owner || G.p, 500); floatTxt(o.x, o.y - 150, '+500', '#ffd36b'); return; }
  const roll = Math.random(), it = roll < .4 ? 'plate' : roll < .7 ? 'fruit' : roll < .85 ? 'spear' : 'hammer';
  const spr = SC.add.image(o.x, o.y, 'props', it).setOrigin(.5, .9).setScale(it === 'plate' ? .28 : it === 'fruit' ? .2 : .32).setDepth(o.y);
  G.items.push({ kind: it, x: o.x, y: o.y, spr, t: 0 });
}
function explode(x, y, r, dmg, owner) {
  sfx.boom(); shake(320, .016); softFlash(100, 255, 220, 160);
  ringFx(x, y, 0xffb347, r, 450, true); glowFx(x, y - 60, 0xff8a3d, 6, 420); SC.pFire.explode(40, x, y - 40);
  for (const e of G.en) if (!e.dead && Math.abs(e.x - x) < r && Math.abs(e.y - y) < r * .45) hitEnemy(e, dmg, 'object', { x, face: 1, owner });
  // une arme lancée par un joueur ne blesse pas l'équipe ; les décors piégés, si
  if (!(owner && owner.isPlayer && owner.thrown)) for (const p of G.players) if (p.active && Math.abs(p.x - x) < r * .8 && Math.abs(p.y - y) < r * .4) hurtPlayer(p, Math.round(dmg * .5), { x }, true);
  for (const o of G.props) if (!o.dead && o.kind !== 'barrel' && Math.abs(o.x - x) < r && Math.abs(o.y - y) < r * .45) breakProp(o);
}
function propsUpdate(dt) {
  for (const o of G.props) {
    if (o.dead) continue;
    if (o.armed > 0) { o.armed -= dt; o.spr.setTint(Math.floor(o.armed * 12) % 2 ? 0xffffff : 0x8ef7ff); if (o.armed <= 0) { o.dead = true; o.spr.destroy(); explode(o.x, o.y, 210, 40, o.owner); } }
    if (o.rolling > 0) {
      o.rolling -= dt; o.x += o.vx * dt; o.spr.x = o.x; o.spr.angle += o.vx * dt * .6;
      if (Math.random() < .5) SC.pDust.explode(1, o.x, o.y);
      for (const e of G.en) if (!e.dead && Math.abs(e.x - o.x) < 60 && Math.abs(e.y - o.y) < 40) { hitEnemy(e, 26, 'object', { x: o.x - o.vx, face: Math.sign(o.vx), owner: o.owner }); o.rolling = 0; }
      const L = G.lock != null ? G.lock : G.cam;
      if (o.rolling <= 0 || o.x < L - 40 || o.x > L + VW + 40) { o.dead = true; o.spr.destroy(); explode(o.x, o.y, 150, 24, o.owner); }
    }
  }
  for (const it of G.items) {
    if (it.dead) continue; it.t += dt; it.spr.y = it.y - 6 - Math.sin(it.t * 4) * 5; if (it.cool > 0) { it.cool -= dt; continue; }
    for (const p of G.players) {
      if (!p.active || p.st === 'out' || p.st === 'dead' || p.st === 'held' || it.dead) continue;
      if (Math.abs(it.x - p.x) < 50 && Math.abs(it.y - p.y) < 34 && p.z < 30) {
        it.dead = true; it.spr.destroy(); sfx.pick(); glowFx(it.x, it.y - 40, 0xffd36b, 3, 300);
        if (it.kind === 'plate') { p.hp = Math.min(p.max, p.hp + 40); floatTxt(p.x, p.y - 220, '+40 VIE', '#7dffa8'); }
        if (it.kind === 'fruit') { p.en = Math.min(100, p.en + 50); floatTxt(p.x, p.y - 220, '+50 ÉNERGIE', '#8ef7ff'); }
        if (it.kind === 'spear' || it.kind === 'hammer') takeWeapon(p, it.kind, it.uses);
        updHUD();
      }
    }
  }
}

/* ---------- IA ennemie ---------- */
function canAttack(e) {
  const busy = G.en.filter(o => !o.dead && o !== e && o.atk).length;
  return busy < (G.boss ? 2 : 2);
}
function face(e, p) { e.face = Math.sign(p.x - e.x) || e.face; }
function moveTo(e, tx, ty, spd, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy * 1.6);
  if (d < 8) { e.vx = e.vy = 0; return true; }
  e.vx = dx / d * spd; e.vy = dy / d * spd * .7; return false;
}
function enemyUpdate(e, dt) {
  const p = target(e); e.t += dt; e.cd -= dt; e.flash = Math.max(0, e.flash - dt); e.inv = Math.max(0, e.inv - dt);
  if (e.sigil > 0) { e.sigilT2 -= dt; if (e.sigilT2 <= 0) { e.sigil = 0; e.bub && e.bub.destroy(); e.bub = null; } }
  if (e.bub) e.bub.setPosition(e.x, e.y - CHAR[e.kind].h * .5 - e.z).setDepth(e.y + 1);
  if (e.boss) { BOSSAI[e.kind].update(e, dt); physics(e, dt); if (e.st !== 'bossEnter' && G.lock != null) { e.x = clamp(e.x, G.lock + 105, G.lock + VW - 105); const f = floorAt(e.x); e.y = clamp(e.y, f[0] + 10, f[1]); } return; }
  const fl = floorAt(e.x);
  if (e.st === 'dying') { physics(e, dt); if (e.z <= 0 && e.t > .3) { e.st = 'gone'; e.t = 0; if (e.kind !== 'pretresse') setClip(e, 'down', 8, true); } return; }
  if (e.st === 'grabbed') { e.vx = e.vy = 0; return; }
  if (e.st === 'holding') { holdingUpdate(e, dt); return; }
  if (e.st === 'thrown') { thrownUpdate(e, dt); return; }
  if (e.st === 'gone') { e.spr.setAlpha(Math.max(0, 1 - e.t / .9)); if (Math.floor(e.t * 14) % 2) e.spr.setAlpha(.2); if (e.t > .9) { e.remove = true; } return; }
  if (e.st === 'fall') { physics(e, dt); if (e.z <= 0 && e.t > .25) { e.st = 'down'; e.t = 0; shake(90, .004); SC.pDust.explode(8, e.x, e.y); setClip(e, 'down', 8, true); } return; }
  if (e.st === 'down') {
    e.vx = 0; if (e.t > (e.kind === 'brute' ? 2.2 : 1)) {
      if (e.kind === 'milicien') { e.st = 'getup'; e.inv = .5; setClip(e, 'getup', 14, false, () => { e.st = 'think'; e.cd = .5; }); }
      else if (e.kind === 'tireuse') { e.st = 'getup'; e.inv = .5; setClip(e, 'rise', 18, false, () => { e.st = 'think'; e.cd = .4; }); }
      else if (['faucheuse', 'harponneur', 'plongeur', 'spectre', 'lamelune'].includes(e.kind)) { e.st = 'getup'; e.inv = .5; setClip(e, 'getup', 18, false, () => { e.st = 'think'; e.cd = .5; }); }
      else if (e.kind === 'brute') { e.st = 'getup'; e.inv = .6; e.shield = e.shieldMax; setClip(e, 'getup', 14, false, () => { e.st = 'think'; e.cd = .8; }); }
      else { e.st = 'think'; e.cd = .3; setClip(e, 'walk', 30, true); }
    }
    return;
  }
  if (e.st === 'hurt' || e.st === 'break' || e.st === 'getup') { e.vx = e.vy = 0; physics(e, dt); return; }
  // entrée en scène
  if (e.st === 'enter') { face(e, p); if (moveTo(e, e.enterX, e.y, e.spd * 1.3 + 60, dt)) { e.st = 'think'; } physics(e, dt); clampE(e); return; }
  AI[e.kind](e, p, dt);
  physics(e, dt); clampE(e);
}
function clampE(e) { const f = floorAt(e.x); e.y = clamp(e.y, f[0], f[1]); if (G.lock != null && e.st !== 'enter') e.x = clamp(e.x, G.lock + 30, G.lock + VW - 30); }
function walkAnim(e, moving, fps) { const c = moving ? 'walk' : 'idle'; if (e.clip !== c) setClip(e, c, moving ? fps : 12, true); }
const AI = {
  eshu(e, p, dt) { eshuUpdate(e, dt); }, // reflets d'Ẹ̀ṣù : même comportement, un coup suffit
  // Harponneur : reste à distance, harponne le joueur et le ramène vers lui, puis l'assomme
  harponneur(e, p, dt) {
    if (e.st === 'harpoon') {
      e.vx = e.vy = 0; const pr = prog(e);
      if (pr < .35) { const g = SC.tele; g.lineStyle(2, 0xffb37a, .4 + .3 * Math.sin(G.t * 40)); g.beginPath(); g.moveTo(e.x + e.face * 90, e.y - 120); g.lineTo(e.x + e.face * 560, e.y - 120); g.strokePath(); }
      if (!e.hitDone && pr > .35 && pr < .55) for (const q of G.players) if (q.active && q.z < 80 && (q.x - e.x) * e.face > 40 && Math.abs(q.x - e.x) < 560 && Math.abs(q.y - e.y) < 30 && hurtPlayer(q, 8, e, false)) {
        e.hitDone = true; const tx = e.x + e.face * 95; SC.tweens.add({ targets: q, x: tx, duration: 260, ease: 'Quad.easeIn' }); floatTxt(q.x, q.y - 220, 'HARPONNÉE !', '#ffb37a');
        later(.45, () => { if (!e.dead && e.st === 'harpoon') { e.st = 'bash'; e.hitDone = false; setClip(e, 'bash', 22, false, () => { if (e.st === 'bash') { e.st = 'think'; e.atk = false; e.cd = rnd(1.4, 2); } }); } });
      }
      return;
    }
    if (e.st === 'bash') { e.vx = e.vy = 0; const pr = prog(e); if (!e.hitDone && pr > .35 && pr < .7) for (const q of G.players) if (q.active && inFront(e, q, 150, 36) && hurtPlayer(q, 14, e, true)) e.hitDone = true; return; }
    face(e, p); const want = canAttack(e) || e.atk, dx = Math.abs(p.x - e.x);
    const arrived = moveTo(e, p.x - e.face * (want ? (dx < 160 ? 120 : 360) : 420), p.y + (want ? 0 : (e.side || 1) * 40), e.spd, dt); walkAnim(e, !arrived, 22);
    if (!want || e.cd > 0 || Math.abs(p.y - e.y) > 30) return;
    e.atk = true; e.vx = e.vy = 0; e.hitDone = false;
    if (dx < 160) { e.st = 'bash'; sfx.swing(); setClip(e, 'bash', 20, false, () => { if (e.st === 'bash') { e.st = 'think'; e.atk = false; e.cd = rnd(1.2, 1.8); } }); }
    else { e.st = 'harpoon'; sfx.charge(); setClip(e, 'harpoon', 16, false, () => { if (e.st === 'harpoon') { e.st = 'think'; e.atk = false; e.cd = rnd(1.6, 2.4); } }); }
  },
  // Plongeur : plonge sous l'eau (invisible, intouchable) et ressurgit derrière sa cible
  plongeur(e, p, dt) {
    if (e.st === 'thrust') { e.vx = e.vy = 0; const pr = prog(e); if (!e.hitDone && pr > .3 && pr < .7) for (const q of G.players) if (q.active && inFront(e, q, 175, 36) && hurtPlayer(q, 11, e, false)) e.hitDone = true; return; }
    if (e.st === 'dive') {
      e.vx = e.vy = 0; const pr = prog(e);
      if (pr > .3 && !e.moved) { e.moved = true; e.inv = .8; const L = G.lock != null ? G.lock : G.cam; const nx = clamp(p.x - p.face * 90, L + 60, L + VW - 60); e.x = nx; e.y = p.y; face(e, p); SC.pDust.explode(10, e.x, e.y); }
      if (pr > .7 && !e.hitDone) for (const q of G.players) if (q.active && Math.abs(q.x - e.x) < 120 && Math.abs(q.y - e.y) < 40 && hurtPlayer(q, 13, e, true)) e.hitDone = true;
      e.spr.setAlpha(pr > .3 && pr < .62 ? 0 : 1);
      return;
    }
    face(e, p); const want = canAttack(e) || e.atk, dx = Math.abs(p.x - e.x);
    const arrived = moveTo(e, p.x - e.face * (want ? 130 : 300), p.y + (want ? 0 : (e.side || 1) * 50), e.spd, dt); walkAnim(e, !arrived, 24);
    if (!want || e.cd > 0) return; e.atk = true; e.vx = e.vy = 0; e.hitDone = false;
    if (dx < 190 && Math.abs(p.y - e.y) < 30 && Math.random() < .55) { e.st = 'thrust'; sfx.swing(); setClip(e, 'thrust', 22, false, () => { if (e.st === 'thrust') { e.st = 'think'; e.atk = false; e.cd = rnd(1, 1.6); } }); }
    else { e.st = 'dive'; e.moved = false; noise(.5, .15, 700, .6); setClip(e, 'dive', 16, false, () => { e.spr.setAlpha(1); if (e.st === 'dive') { e.st = 'think'; e.atk = false; e.cd = rnd(1.8, 2.6); } }); }
  },
  // Spectre-masque : double taille fulgurante, se dissipe et réapparaît ; se dédouble une fois blessé
  spectre(e, p, dt) {
    if (e.st === 'slash') { e.vx = e.vy = 0; const pr = prog(e); if (!e.hitDone && pr > .3 && pr < .75) for (const q of G.players) if (q.active && inFront(e, q, 160, 36) && hurtPlayer(q, e.clone ? 6 : 10, e, false)) e.hitDone = true; return; }
    if (e.st === 'blink') { e.vx = e.vy = 0; const pr = prog(e); if (pr > .45 && !e.moved) { e.moved = true; const L = G.lock != null ? G.lock : G.cam; e.x = clamp(p.x + (Math.random() < .5 ? -1 : 1) * 150, L + 60, L + VW - 60); e.y = p.y; face(e, p); SC.pBolt.explode(12, e.x, e.y - 100); } return; }
    if (!e.clone && !e.split && e.hp < e.max * .55) { e.split = true; const c = spawn('spectre', 1); c.x = e.x - e.face * 80; c.y = e.y; c.st = 'think'; c.clone = true; c.hp = c.max = 22; c.ghost = true; floatTxt(e.x, e.y - 230, 'DÉDOUBLEMENT', '#c9a0ff'); SC.pBolt.explode(20, e.x, e.y - 100); }
    face(e, p); const want = canAttack(e) || e.atk, dx = Math.abs(p.x - e.x);
    const arrived = moveTo(e, p.x - e.face * (want ? 120 : 280), p.y + (want ? 0 : (e.side || 1) * 40), e.spd, dt); walkAnim(e, !arrived, 20);
    if (!want || e.cd > 0) return; e.atk = true; e.vx = e.vy = 0; e.hitDone = false;
    if (dx < 170 && Math.abs(p.y - e.y) < 30) { e.st = 'slash'; sfx.zap(); setClip(e, 'slash', 24, false, () => { if (e.st === 'slash') { e.st = 'think'; e.atk = false; e.cd = rnd(.9, 1.5); } }); }
    else { e.st = 'blink'; e.moved = false; sfx.zap(); setClip(e, 'blink', 22, false, () => { if (e.st === 'blink') { e.st = 'think'; e.atk = false; e.cd = .25; } }); }
  },
  // Lame-lune : pare les coups de face et riposte aussitôt
  lamelune(e, p, dt) {
    if (e.st === 'parry') { e.vx = e.vy = 0; const pr = prog(e); if (pr > .55 && !e.hitDone) for (const q of G.players) if (q.active && inFront(e, q, 170, 36) && hurtPlayer(q, 13, e, true)) e.hitDone = true; return; }
    if (e.st === 'slash') { e.vx = e.vy = 0; const pr = prog(e); if (e.lunge && pr < .4) e.vx = e.face * 380; if (!e.hitDone && pr > .3 && pr < .7) for (const q of G.players) if (q.active && inFront(e, q, 170, 36) && hurtPlayer(q, 12, e, false)) e.hitDone = true; return; }
    face(e, p);
    // garde haute face aux attaques
    if (['atk1', 'atk2', 'kick', 'atk3'].includes(p.st) && Math.abs(p.x - e.x) < 200 && Math.abs(p.y - e.y) < 40 && Math.random() < dt * 3 && e.cd < .8) { e.st = 'parry'; e.hitDone = false; e.guard = true; setClip(e, 'parry', 18, false, () => { e.guard = false; if (e.st === 'parry') { e.st = 'think'; e.cd = .9; } }); return; }
    const want = canAttack(e) || e.atk, dx = Math.abs(p.x - e.x);
    const arrived = moveTo(e, p.x - e.face * (want ? 140 : 300), p.y + (want ? 0 : (e.side || 1) * 40), e.spd, dt); walkAnim(e, !arrived, 24);
    if (!want || e.cd > 0 || Math.abs(p.y - e.y) > 30 || dx > 280) return;
    e.atk = true; e.st = 'slash'; e.lunge = dx > 150; e.hitDone = false; sfx.swing(); setClip(e, 'slash', 22, false, () => { if (e.st === 'slash') { e.st = 'think'; e.atk = false; e.cd = rnd(1, 1.6); } });
  },
  // Faucheuse : garde ses distances, fauche loin et bas (on l'évite en sautant), crache des nuages de spores
  faucheuse(e, p, dt) {
    if (e.st === 'sweep') {
      e.vx = e.vy = 0; const pr = prog(e);
      if (!e.hitDone && pr > .3 && pr < .7) for (const q of G.players) if (q.active && q.z < 45 && inFront(e, q, 270, 40) && hurtPlayer(q, e.elite ? 16 : 13, e, true)) e.hitDone = true;
      return;
    }
    if (e.st === 'spray') { e.vx = e.vy = 0; return; }
    face(e, p);
    const want = canAttack(e) || e.atk, dx = Math.abs(p.x - e.x);
    const tx = p.x - e.face * (want ? 210 : 330 + (e.slot || 0)), ty = p.y + (want ? 0 : (e.side || 1) * 36);
    const arrived = moveTo(e, tx, ty, e.spd, dt); walkAnim(e, !arrived, 22);
    if (!want || e.cd > 0 || Math.abs(p.y - e.y) > 34) return;
    if (dx < 300 && (dx > 120 || Math.random() < .5)) {
      e.st = 'sweep'; e.atk = true; e.hitDone = false; e.vx = e.vy = 0; sfx.swing();
      setClip(e, 'sweep', 24, false, () => { if (e.st === 'sweep') { e.st = 'think'; e.atk = false; e.cd = rnd(1.3, 2) * (e.elite ? .7 : 1); } });
    } else if (dx < 420) {
      e.st = 'spray'; e.atk = true; e.vx = e.vy = 0; sfx.charge();
      setClip(e, 'spray', 20, false, () => { if (e.st === 'spray') { e.st = 'think'; e.atk = false; e.cd = rnd(2.2, 3); } });
      later(.55, () => { if (e.dead || e.st !== 'spray') return; noise(.6, .12, 900, .5); G.clouds.push({ x: e.x + e.face * 170, y: e.y, r: e.elite ? 140 : 110, life: e.elite ? 5 : 4, tick: .2 }); });
    }
  },
  milicien(e, p, dt) {
    if (e.st === 'atk') { e.vx = e.vy = 0; return; }
    if (e.st === 'block') { e.vx = e.vy = 0; if (e.t > .7) { e.st = 'think'; e.cd = .2; } return; }
    face(e, p);
    // parade si le joueur frappe de face
    if (['atk1', 'atk2'].includes(p.st) && Math.abs(p.x - e.x) < 190 && Math.abs(p.y - e.y) < 50 && Math.random() < dt * 2.2 && e.cd < .6) { e.st = 'block'; e.t = 0; e.vx = e.vy = 0; setClip(e, 'block', 18, false); return; }
    const want = canAttack(e) || e.atk;
    const tx = p.x - e.face * (want ? 110 : 240 + (e.slot || 0)), ty = p.y + (want ? 0 : (e.side || 1) * 40);
    const arrived = moveTo(e, tx, ty, e.spd, dt); walkAnim(e, !arrived, 24);
    if (want && e.elite && e.cd <= 0 && Math.abs(p.x - e.x) < 95 && Math.abs(p.y - e.y) < 22 && Math.random() < .5 && enemyGrab(e, p)) return;
    if (want && Math.abs(p.x - e.x) < 150 && Math.abs(p.y - e.y) < 30 && e.cd <= 0) {
      e.st = 'atk'; e.atk = true; e.vx = e.vy = 0; const two = Math.random() < .55;
      const doHit = (clip, dmg, fps, next) => { setClip(e, clip, fps, false, next); e.hitDone = false; e.hitClip = clip; e.hitDmg = dmg; };
      doHit('atk1', 8, 18, () => { if (two && !e.dead && e.st === 'atk') doHit('atk2', 11, 16, endE); else endE(); });
      function endE() { if (e.st === 'atk') { e.st = 'think'; e.atk = false; e.cd = rnd(1, 1.8); } }
      sfx.swing();
    }
    if (e.st === 'atk') {} // géré dans meleeCheck
  },
  tireuse(e, p, dt) {
    if (e.st !== 'roll') face(e, p);
    if (e.st === 'aim') { e.vx = e.vy = 0; e.aimT -= dt; e.aimY = e.y; if (e.aimT <= 0) { e.st = 'fire'; setClip(e, 'fire', 20, false, () => { e.st = 'think'; e.atk = false; e.cd = rnd(1.6, 2.4); }); sfx.laser(); G.shots.push({ x: e.x + e.face * 120, y: e.y, z: 118, vx: e.face * 900, from: e, dmg: 14, life: 1.4 }); if (e.elite) for (let k = 1; k < 3; k++) later(k * .16, () => { if (e.dead) return; sfx.laser(); G.shots.push({ x: e.x + e.face * 120, y: e.y + (k === 1 ? -22 : 22), z: 118, vx: e.face * 900, from: e, dmg: 10, life: 1.4, col: 0xffd36b }); }); SC.pViolet.explode(10, e.x + e.face * 120, e.y - 118); } return; }
    if (e.st === 'fire') { e.vx = e.vy = 0; return; }
    if (e.st === 'roll') { e.vx = (e.rollDir || -e.face) * 360 * (1 - prog(e)); e.vy = (e.rollVy || 0) * (1 - prog(e)); e.face = Math.sign(e.vx) || e.face; return; }
    const dx = Math.abs(p.x - e.x);
    if (dx < 190 && e.cd < 1) { e.st = 'roll'; e.rollDir = -e.face; e.rollVy = 0; setClip(e, 'roll', 22, false, () => { e.st = 'think'; e.cd = .3; setClip(e, 'idle', 10, true); }); return; }
    // se place sur la ligne du joueur, à distance
    const ty = p.y, tx = clamp(p.x - e.face * 420, (G.lock || G.cam) + 60, (G.lock || G.cam) + VW - 60);
    const arrived = moveTo(e, tx, ty, 70, dt); if (e.clip !== 'idle') setClip(e, 'idle', 10, true);
    if (Math.abs(tx - e.x) > 200 && e.cd < .8) { e.st = 'roll'; e.rollDir = Math.sign(tx - e.x); e.face = e.rollDir; e.rollVy = clamp(ty - e.y, -150, 150); setClip(e, 'roll', 22, false, () => { e.st = 'think'; e.cd = Math.max(e.cd, .4); setClip(e, 'idle', 10, true); }); return; }
    if (Math.abs(p.y - e.y) < 30 && e.cd <= 0 && canAttack(e)) { e.st = 'aim'; e.atk = true; e.aimT = .85; e.vx = e.vy = 0; setClip(e, 'aim', 14, false); sfx.charge(); }
  },
  chien(e, p, dt) {
    if (e.st === 'crouch') { e.vx = e.vy = 0; if (e.t > .55) { e.st = 'pounce'; e.t = 0; face(e, p); e.vx = e.face * 520; e.vz = 520; e.z = 1; e.hitDone = false; setClip(e, 'pounce', 26, false); sfx.growl(); } return; }
    if (e.st === 'pounce') { if (!e.hitDone) for (const q of G.players) if (q.active && Math.abs(q.x - e.x) < 80 && Math.abs(q.y - e.y) < 34 && Math.abs(q.z - e.z) < 80 && hurtPlayer(q, e.elite ? 15 : 12, e, false)) { e.hitDone = true; break; } if (e.z <= 0 && e.t > .2 && e.elite && !e.second) { e.second = true; e.t = 0; face(e, p); e.vx = e.face * 560; e.vz = 480; e.z = 1; e.hitDone = false; setClip(e, 'pounce', 28, false); sfx.growl(); return; }
      if (e.z <= 0 && e.t > .2) { e.second = false; e.st = 'think'; e.atk = false; e.vx = 0; e.cd = rnd(1, 1.6); setClip(e, 'idle', 12, true); SC.pDust.explode(6, e.x, e.y); } return; }
    face(e, p);
    const want = canAttack(e) || e.atk, ang = e.t * 1.3 + (e.slot || 0);
    const tx = want ? p.x - e.face * 260 : p.x + Math.cos(ang) * 300, ty = want ? p.y : p.y + Math.sin(ang) * 60;
    const arrived = moveTo(e, tx, ty, e.spd, dt); walkAnim(e, !arrived, 32);
    if (want && Math.abs(p.x - e.x) < 300 && Math.abs(p.y - e.y) < 30 && e.cd <= 0) { e.st = 'crouch'; e.t = 0; e.atk = true; setClip(e, 'crouch', 14, false); e.vx = e.vy = 0; }
  },
  brute(e, p, dt) {
    if (e.st === 'bash') { const pr = prog(e); e.vx = pr > .2 && pr < .8 ? e.face * 520 : 0; e.vy = 0; if (!e.hitDone && pr > .2) for (const q of G.players) if (q.active && inFront(e, q, 120, 40) && hurtPlayer(q, 16, e, true)) e.hitDone = true; return; }
    if (e.st === 'slam') { e.vx = e.vy = 0; return; }
    face(e, p);
    const want = canAttack(e) || e.atk;
    const tx = p.x - e.face * (want ? 150 : 280), ty = p.y;
    const arrived = moveTo(e, tx, ty, e.spd, dt); walkAnim(e, !arrived, 20);
    const dx = Math.abs(p.x - e.x);
    if (want && e.cd <= 0 && Math.abs(p.y - e.y) < 60) {
      e.atk = true;
      if (dx < 230) { e.st = 'bash'; e.hitDone = false; setClip(e, 'bash', 10, false, () => { e.st = 'think'; e.atk = false; e.cd = rnd(1.4, 2); }); sfx.heavy(); }
      else if (dx < 420) {
        e.st = 'slam'; setClip(e, 'slam', 16, false, () => { e.st = 'think'; e.atk = false; e.cd = rnd(1.8, 2.6); });
        later(.7, () => { if (e.dead || e.st !== 'slam') return; sfx.boom(); shake(240, .01); G.rings.push({ x: e.x + e.face * 60, y: e.y, r: 20, max: e.elite ? 420 : 330, spd: 620, dmg: 14, col: e.elite ? 0xff5a8a : 0xb07cff, hitS: new Set() }); SC.pViolet.explode(20, e.x + e.face * 60, e.y); });
      } else e.atk = false;
    }
  },
  pretresse(e, p, dt) {
    face(e, p); e.vx = e.vy = 0;
    if (e.st === 'beamWind' || e.st === 'beam' || e.st === 'tpout' || e.st === 'tpin' || e.st === 'sigil') {
      if (e.st === 'beam') { e.beamT -= dt; e.beamTick -= dt; if (e.beamTick <= 0) { let any = false; for (const q of G.players) if (q.active && Math.abs(q.y - e.y) < 32 && (q.x - e.x) * e.face > 0 && (q.x - e.x) * e.face < 760 && q.z < 120) { hurtPlayer(q, 4, e, false); any = true; } if (any) e.beamTick = .22; } }
      return;
    }
    e.tpT -= dt; e.sigilT -= dt;
    if (e.tpT <= 0 || Math.abs(p.x - e.x) < 140) { teleport(e); return; }
    const ally = G.en.find(o => !o.dead && o !== e && !o.sigil && o.kind !== 'pretresse' && !o.boss);
    if (e.sigilT <= 0 && ally) { e.st = 'sigil'; setClip(e, 'sigil', 18, false, () => { e.st = 'think'; e.sigilT = rnd(5, 7); setClip(e, 'idle', 10, true); }); later(.35, () => { if (e.dead || ally.dead) return; ally.sigil = 40; ally.sigilT2 = 7; ally.sigilFrom = e; sfx.zap(); ally.bub = SC.add.image(ally.x, ally.y - 100, 'ring').setTint(0xb07cff).setBlendMode('ADD').setAlpha(.7).setScale(1.3, 1.9); SC.pViolet.explode(16, ally.x, ally.y - 100); }); return; }
    if (e.cd <= 0 && canAttack(e)) {
      e.st = 'beamWind'; e.atk = true; e.beamY = e.y; sfx.charge();
      setClip(e, 'wind', 6, false, () => { if (e.dead || e.st !== 'beamWind') return; e.st = 'beam'; e.beamT = .7; e.beamTick = 0; sfx.laser(); setClip(e, 'beam', 18, false, () => { e.st = 'think'; e.atk = false; e.cd = rnd(2.2, 3.2); setClip(e, 'idle', 10, true); }); });
    } else if (e.clip !== 'idle') setClip(e, 'idle', 10, true);
  }
};
function teleport(e) {
  e.st = 'tpout'; e.atk = false; sfx.zap(); SC.pViolet.explode(18, e.x, e.y - 100);
  setClip(e, 'tpout', 18, false, () => {
    if (e.dead) return; const L = G.lock != null ? G.lock : G.cam, p = target(e);
    let nx = p.x + (Math.random() < .5 ? -1 : 1) * rnd(340, 460); nx = clamp(nx, L + 80, L + VW - 80); const f = floorAt(nx);
    e.x = nx; e.y = clamp(p.y + rnd(-50, 50), f[0], f[1]); face(e, p); e.st = 'tpin'; SC.pViolet.explode(18, e.x, e.y - 100);
    setClip(e, 'tpin', 14, false, () => { e.st = 'think'; e.tpT = rnd(3.5, 5); e.cd = Math.min(e.cd, .6); setClip(e, 'idle', 10, true); });
  });
}
// coups de mêlée des miliciens (fenêtre active au milieu du clip)
function meleeCheck(e) {
  if (e.kind === 'milicien' && e.st === 'atk' && !e.hitDone && e.clip === e.hitClip && prog(e) > .45 && prog(e) < .8) {
    for (const q of G.players) if (q.active && inFront(e, q, 150, 34) && hurtPlayer(q, e.hitDmg, e, e.hitClip === 'atk2')) e.hitDone = true;
  }
}

/* ---------- Boss : Oba Ferrum ---------- */
function bossUpdate(e, dt) {
  const p = target(e);
  if (e.st === 'bossEnter') { e.vx = -90; setClip(e, 'idle', 12, true); if (e.x < G.lock + VW - 220) { e.vx = 0; e.st = 'think'; e.cd = 1.4; sfx.roar(); shake(500, .012); if (!SEEN.boss) { SEEN.boss = 1; cutscene(TK().boss); } } return; }
  if (e.st === 'dyingBoss') { e.vx = 0; return; }
  if (['smashWind', 'smash', 'recover', 'backhand', 'burst', 'roar', 'chargeWind', 'charge', 'kneel'].includes(e.st)) {
    if (e.st === 'charge') {
      e.vx = e.face * 760; if (Math.random() < .6) { SC.pFire.explode(2, e.x - e.face * 80, e.y - 60); SC.pDust.explode(2, e.x, e.y); }
      for (const q of G.players) if (q.active && !(e.hitSet || (e.hitSet = new Set())).has(q.slot) && Math.abs(q.x - e.x) < 110 && Math.abs(q.y - e.y) < 44 && q.z < 150 && hurtPlayer(q, 26, e, true)) e.hitSet.add(q.slot);
      if ((e.face > 0 && e.x > G.lock + VW - 110) || (e.face < 0 && e.x < G.lock + 110)) { e.vx = 0; e.st = 'kneel'; e.t = 0; sfx.boom(); shake(420, .016); SC.pFire.explode(30, e.x + e.face * 60, e.y - 100); setClip(e, 'kneel', 10, false); floatTxt(e.x, e.y - 380, 'SONNÉ !', '#ffd36b', true); }
    } else e.vx = 0;
    if (e.st === 'kneel' && e.t > 2) { e.st = 'think'; e.cd = .8; setClip(e, 'idle2', 12, true); }
    if (e.st === 'backhand' && !e.hitDone && prog(e) > .3 && prog(e) < .6) for (const q of G.players) if (q.active && inFront(e, q, 230, 60) && hurtPlayer(q, 18, e, true)) e.hitDone = true;
    if (e.st === 'chargeWind') { const g = SC.tele; g.fillStyle(0xff3d1a, .12 + .1 * Math.sin(e.t * 30)); g.fillRect(G.lock, e.y - 34, VW, 68); }
    return;
  }
  face(e, p);
  const dx = Math.abs(p.x - e.x), dy = Math.abs(p.y - e.y);
  // marche lourde
  const tx = p.x - e.face * 210; const arrived = moveTo(e, tx, p.y, e.spd * (e.phase === 2 ? 1.6 : 1), dt);
  e.stepT = (e.stepT || 0) + dt; if (!arrived && e.stepT > .7) { e.stepT = 0; shake(90, .004); sfx.land(); SC.pDust.explode(5, e.x, e.y); }
  if (e.cd > 0) return;
  e.vx = e.vy = 0; e.hitDone = false;
  const r = Math.random();
  if (e.phase === 2 && r < .4) {
    e.st = 'chargeWind'; e.t = 0; e.hitSet = new Set(); sfx.roar(); setClip(e, 'roar', 12, false, () => { if (e.st !== 'chargeWind') return; e.st = 'charge'; e.hitDone = false; setClip(e, 'charge', 14, true); });
  } else if (dx < 240 && dy < 70 && r < .75) {
    e.st = 'backhand'; setClip(e, 'backhand', 18, false, () => { e.st = 'think'; e.cd = rnd(1, 1.6) / e.phase; setClip(e, e.phase === 2 ? 'idle2' : 'idle', 12, true); }); sfx.swing();
  } else {
    e.st = 'smashWind'; sfx.charge();
    setClip(e, 'smashWind', e.phase === 2 ? 20 : 15, false, () => {
      e.st = 'smash'; sfx.boom(); shake(450, .02); softFlash(90, 255, 180, 90); SC.pFire.explode(40, e.x + e.face * 40, e.y - 20);
      const hitS = new Set(); for (const q of G.players) if (q.active && Math.abs(q.x - (e.x + e.face * 40)) < 170 && Math.abs(q.y - e.y) < 60 && q.z < 40 && hurtPlayer(q, 24, e, true)) hitS.add(q.slot);
      G.rings.push({ x: e.x + e.face * 40, y: e.y, r: 40, max: 620, spd: 700, dmg: 18, col: 0xffa040, hitS });
      if (e.phase === 2) later(.42, () => { if (!e.dead) G.rings.push({ x: e.x + e.face * 40, y: e.y, r: 40, max: 620, spd: 760, dmg: 18, col: 0xffa040, hitS: new Set() }); });
      setClip(e, 'smash', 14, false, () => { e.st = 'recover'; setClip(e, 'recover', 10, false, () => { e.st = 'think'; e.cd = rnd(1.2, 1.9) / (e.phase === 2 ? 1.4 : 1); setClip(e, e.phase === 2 ? 'idle2' : 'idle', 12, true); }); });
    });
  }
}
/* ---------- Boss : Yewa-Nul (acte II) ---------- */
// vole hors de portée, pousse l'arène avec ses rafales, fait jaillir des lianes, pique en rase-mottes puis reste épuisée au sol
function yewaUpdate(e, dt) {
  const p = target(e), P2 = e.phase === 2;
  if (e.st === 'yewaEnter') {
    e.vx = 0; e.hover = Math.max(70, e.hover - 240 * dt); if (e.clip !== 'idle') setClip(e, 'idle', 14, true);
    if (e.hover <= 70) { e.st = 'think'; e.cd = 1.4; sfx.roar(); shake(400, .01); gust(-1, 260, .9); if (!SEEN.yewa) { SEEN.yewa = 1; cutscene(TK().boss); } }
    return;
  }
  if (e.st === 'dyingBoss') { e.vx = 0; return; }
  if (e.st !== 'dive' && e.st !== 'tired') e.hover += ((70 + Math.sin(G.t * 2.2) * 14 + (P2 ? 24 : 0)) - e.hover) * Math.min(1, dt * 4);
  // en phase 2, le vent souffle en continu, alternant de côté
  if (P2) { e.windT = (e.windT || 0) - dt; if (e.windT <= 0) { e.windT = 5; e.windDir = -(e.windDir || 1); floatTxt(G.lock + VW / 2, 190, e.windDir > 0 ? 'TEMPÊTE ▶' : '◀ TEMPÊTE', '#e8fff4', true); later(.7, () => !e.dead && gust(e.windDir, 150, 2.6)); } }
  if (['gust', 'vines', 'burst'].includes(e.st)) { e.vx = e.vy = 0; return; }
  if (e.st === 'diveWind') {
    e.vx = e.vy = 0; const g = SC.tele; g.fillStyle(0x8ef7c4, .1 + .1 * Math.sin(e.t * 30)); g.fillRect(G.lock, e.y - 36, VW, 72);
    if (e.t > .75) { e.st = 'dive'; e.t = 0; e.hitSet = new Set(); sfx.dash(); }
    return;
  }
  if (e.st === 'dive') {
    e.vx = e.face * (P2 ? 900 : 780); e.hover = Math.max(8, e.hover - 500 * dt); if (Math.random() < .7) SC.pDust.explode(2, e.x - e.face * 60, e.y);
    for (const q of G.players) if (q.active && !e.hitSet.has(q.slot) && Math.abs(q.x - e.x) < 110 && Math.abs(q.y - e.y) < 44 && q.z < 140 && hurtPlayer(q, 24, e, true)) e.hitSet.add(q.slot);
    if ((e.face > 0 && e.x > G.lock + VW - 112) || (e.face < 0 && e.x < G.lock + 112)) {
      e.vx = 0; e.st = 'tired'; e.t = 0; e.hover = 6; sfx.land(); shake(260, .01); SC.pDust.explode(18, e.x, e.y);
      setClip(e, 'hurt', 8, false); floatTxt(e.x, e.y - 360, 'ÉPUISÉE !', '#ffd36b', true);
    }
    return;
  }
  if (e.st === 'tired') { e.vx = e.vy = 0; e.hover = 6; if (e.t > (P2 ? 1.6 : 2.2)) { e.st = 'think'; e.cd = .9; setClip(e, P2 ? 'idle2' : 'idle', 14, true); } return; }
  // déplacement : plane à distance du joueur visé, sur sa ligne
  face(e, p); const want = P2 ? 'idle2' : 'idle'; if (e.clip !== want) setClip(e, want, 14, true);
  moveTo(e, p.x - e.face * 300, p.y, e.spd * (P2 ? 1.25 : 1), dt);
  if (e.cd > 0) return;
  e.vx = e.vy = 0; const r = Math.random();
  const back = () => { e.st = 'think'; e.cd = rnd(1.3, 2) / (P2 ? 1.3 : 1); setClip(e, P2 ? 'idle2' : 'idle', 14, true); };
  if (r < .34) {
    e.st = 'gust'; sfx.charge(); setClip(e, 'gust', 18, false, back);
    later(1, () => { if (e.dead || e.st !== 'gust') return; gust(e.face, P2 ? 460 : 380, 1.1); for (const q of G.players) if (q.active && (q.x - e.x) * e.face > 0 && Math.abs(q.x - e.x) < 420 && Math.abs(q.y - e.y) < 90) hurtPlayer(q, 8, e, false); });
  } else if (r < .68) {
    e.st = 'vines'; sfx.growl(); setClip(e, 'vines', 18, false, back);
    later(.8, () => {
      if (e.dead) return;
      for (const q of G.players) if (q.active && q.st !== 'out') G.haz.push({ kind: 'vine', x: q.x, y: q.y, r: 85, t: 0, warn: .9 });
      if (P2) for (let i = 0; i < 2; i++) { const x = G.lock + rnd(120, VW - 120), f = floorAt(x); G.haz.push({ kind: 'vine', x, y: rnd(f[0] + 10, f[1] - 10), r: 85, t: 0, warn: 1.1 }); }
    });
  } else {
    e.st = 'diveWind'; e.t = 0; e.y = clamp(p.y, floorAt(e.x)[0] + 10, floorAt(e.x)[1]); sfx.roar(); setClip(e, 'dive', 13, false);
  }
}
function yewaPhase2(e) {
  e.phase = 2; e.st = 'burst'; e.inv = 2.2; e.vx = 0; e.windT = 2.5; sfx.roar(); sfx.boom(); shake(800, .016); softFlash(300, 176, 124, 255);
  $('bPhase').textContent = LEVELS[LV].boss.phase2; radio(TK().phase2);
  ringFx(e.x, e.y, 0xb07cff, 420, 700, true); SC.pViolet.explode(60, e.x, e.y - 200);
  setClip(e, 'burst', 14, false, () => { e.st = 'think'; e.cd = 1; setClip(e, 'idle2', 14, true); });
  later(2.5, () => { if (G.boss === e && !e.dead) { spawn('faucheuse', 1, DIFF[DIFFK].elite >= 1); spawn('faucheuse', -1); tip('throwBoss'); } });
  updBoss();
}
/* ---------- Boss des actes III à VI ---------- */
function bossEnterStep(e) { // entrée commune : le boss avance depuis la droite puis le dialogue démarre
  e.vx = -110; if (e.clip !== 'walk') setClip(e, 'walk', 18, true);
  if (e.x < G.lock + VW - 230) { e.vx = 0; e.st = 'think'; e.cd = 1.2; setClip(e, 'idle', 14, true); sfx.roar(); shake(300, .008); if (!SEEN['b' + LV]) { SEEN['b' + LV] = 1; cutscene(TK().boss); } }
}
function bossBack(e, cd) { return () => { if (e.dead || e.st === 'dyingBoss') return; e.st = 'think'; e.cd = cd / (e.phase === 2 ? 1.35 : 1); setClip(e, e.phase === 2 && SC.META[e.kind].clips.idle2 ? 'idle2' : 'idle', 14, true); }; }
function bossApproach(e, p, dist, dt) { face(e, p); const ok = moveTo(e, p.x - e.face * dist, p.y, e.spd * (e.phase === 2 ? 1.3 : 1), dt); const c = ok ? 'idle' : 'walk'; if (e.clip !== c && SC.META[e.kind].clips[c]) setClip(e, c, ok ? 14 : 18, true); return ok; }
function laneHit(e, reach, dmg, heavy) { let h = false; for (const q of G.players) if (q.active && (q.x - e.x) * e.face > -20 && Math.abs(q.x - e.x) < reach && Math.abs(q.y - e.y) < 40 && q.z < 90 && hurtPlayer(q, dmg, e, heavy)) h = true; return h; }

// Commandante Ìjì : harpon-chaîne qui ramène, rafales de canon, puis bombardement de son dirigeable
function ijjiUpdate(e, dt) {
  const p = target(e);
  if (e.st === 'bossEnter') { bossEnterStep(e); return; }
  if (e.st === 'dyingBoss') { e.vx = 0; return; }
  if (e.phase === 2) { e.bombT = (e.bombT || 2) - dt; if (e.bombT <= 0) { e.bombT = rnd(1.3, 2); const q = pick(G.players.filter(x => x.active && x.st !== 'out')) || G.p; const f = floorAt(q.x); G.haz.push({ x: clamp(q.x + rnd(-60, 60), G.lock + 60, G.lock + VW - 60), y: clamp(q.y + rnd(-20, 20), f[0], f[1]), r: 95, t: 0, warn: 1.2 }); } }
  if (['chain', 'cannon', 'flare', 'hurtB'].includes(e.st)) { e.vx = e.vy = 0; if (e.st === 'chain' && prog(e) < .4) { const g = SC.tele; g.lineStyle(3, 0xc9a0ff, .5 + .3 * Math.sin(G.t * 40)); g.beginPath(); g.moveTo(e.x + e.face * 80, e.y - 130); g.lineTo(e.x + e.face * 700, e.y - 130); g.strokePath(); } return; }
  bossApproach(e, p, 320, dt); if (e.cd > 0) return; e.vx = e.vy = 0;
  if (Math.random() < .5) {
    e.st = 'chain'; sfx.charge(); setClip(e, 'chain', 16, false, bossBack(e, 1.5));
    later(.85, () => { if (e.dead || e.st !== 'chain') return; sfx.heavy(); for (const q of G.players) if (q.active && q.z < 80 && (q.x - e.x) * e.face > 0 && Math.abs(q.x - e.x) < 700 && Math.abs(q.y - e.y) < 34 && hurtPlayer(q, 10, e, false)) { SC.tweens.add({ targets: q, x: e.x + e.face * 120, duration: 300, ease: 'Quad.easeIn' }); floatTxt(q.x, q.y - 220, 'RAMENÉE !', '#c9a0ff'); } });
  } else {
    e.st = 'cannon'; setClip(e, 'cannon', 16, false, bossBack(e, 1.4));
    for (let k = 0; k < 3; k++) later(.5 + k * .28, () => { if (e.dead || e.st !== 'cannon') return; sfx.laser(); G.shots.push({ x: e.x + e.face * 110, y: e.y + (k - 1) * 26, z: 120, vx: e.face * 820, from: e, dmg: 12, life: 1.6, col: 0xffb347 }); });
  }
}
function ijjiPhase2(e) {
  e.phase = 2; e.st = 'flare'; e.inv = 2; e.bombT = 2.5; sfx.roar(); shake(500, .012); softFlash(250, 200, 140, 255);
  $('bPhase').textContent = LEVELS[LV].boss.phase2; radio(TK().phase2);
  setClip(e, 'flare', 14, false, bossBack(e, 1)); later(2.5, () => { if (G.boss === e && !e.dead) { spawn('harponneur', 1, true); spawn('harponneur', -1); } }); updBoss();
}

// Ọ̀ṣun-Nul : fouet d'eau à longue portée, vague au ras du sol (à sauter), crue qui rétrécit l'arène
function oshunUpdate(e, dt) {
  const p = target(e);
  if (e.st === 'bossEnter') { bossEnterStep(e); return; }
  if (e.st === 'dyingBoss') { e.vx = 0; return; }
  if (['whip', 'wave', 'burst'].includes(e.st)) { e.vx = e.vy = 0; if (e.st === 'whip') { const pr = prog(e); if (pr < .4) { const g = SC.tele; g.fillStyle(0x2fe0d0, .1 + .08 * Math.sin(G.t * 30)); g.fillRect(Math.min(e.x, e.x + e.face * 360), e.y - 30, 360, 60); } if (!e.hitDone && pr > .4 && pr < .7) e.hitDone = laneHit(e, 360, 15, true); } return; }
  bossApproach(e, p, 260, dt); if (e.cd > 0) return; e.vx = e.vy = 0; e.hitDone = false;
  if (Math.abs(p.x - e.x) < 380 && Math.random() < .55) { e.st = 'whip'; sfx.swing(); setClip(e, 'whip', 16, false, bossBack(e, 1.3)); }
  else {
    e.st = 'wave'; sfx.growl(); setClip(e, 'wave', 16, false, bossBack(e, 1.6));
    later(.8, () => { if (e.dead) return; noise(.8, .2, 500, .5); G.rings.push({ x: e.x + e.face * 60, y: e.y, r: 30, max: 760, spd: 520, dmg: 14, col: 0x2fe0d0, hitS: new Set() }); if (e.phase === 2) later(.5, () => !e.dead && G.rings.push({ x: e.x + e.face * 60, y: e.y, r: 30, max: 760, spd: 600, dmg: 14, col: 0x2fe0d0, hitS: new Set() })); });
  }
}
function oshunPhase2(e) {
  e.phase = 2; e.st = 'burst'; e.inv = 2.2; sfx.roar(); sfx.boom(); shake(700, .014); softFlash(300, 47, 224, 208);
  $('bPhase').textContent = LEVELS[LV].boss.phase2; radio(TK().phase2);
  G.floodTo = 46; floatTxt(G.lock + VW / 2, 200, 'LA CRUE MONTE !', '#8ef7ff', true);
  setClip(e, 'burst', 14, false, bossBack(e, 1)); later(2.5, () => { if (G.boss === e && !e.dead) { spawn('plongeur', 1, true); spawn('plongeur', -1); } }); updBoss();
}

// Ẹ̀ṣù-Miroir : crochet de bâton qui attire, rayon du miroir, puis reflets trompeurs (un seul est le vrai)
function eshuUpdate(e, dt) {
  const p = target(e);
  if (e.st === 'bossEnter') { bossEnterStep(e); return; }
  if (e.st === 'dyingBoss') { e.vx = 0; return; }
  if (['hook', 'beamWind', 'beam', 'burst'].includes(e.st)) {
    e.vx = e.vy = 0;
    if (e.st === 'hook') { const pr = prog(e); if (!e.hitDone && pr > .35 && pr < .65) for (const q of G.players) if (q.active && inFront(e, q, 230, 40) && hurtPlayer(q, 12, e, false)) { e.hitDone = true; SC.tweens.add({ targets: q, x: e.x + e.face * 90, duration: 220 }); } }
    if (e.st === 'beamWind') { const g = SC.tele; g.fillStyle(0xffffff, .12 + .1 * Math.sin(G.t * 30)); g.fillRect(Math.min(e.x, e.x + e.face * 760), e.y - 30, 760, 60); }
    if (e.st === 'beam') { const g = SC.fxg; g.lineStyle(22, 0xfff4d6, .55); g.beginPath(); g.moveTo(e.x + e.face * 60, e.y - 150); g.lineTo(e.x + e.face * 820, e.y - 150); g.strokePath(); e.beamTick = (e.beamTick || 0) - dt; if (e.beamTick <= 0) { e.beamTick = .25; laneHit(e, 820, 5, false); } }
    return;
  }
  bossApproach(e, p, e.mirror ? 330 : 280, dt); if (e.cd > 0) return; e.vx = e.vy = 0; e.hitDone = false;
  if (Math.abs(p.x - e.x) < 260 && Math.random() < .5) { e.st = 'hook'; sfx.swing(); setClip(e, 'hook', 16, false, bossBack(e, 1.4)); }
  else { e.st = 'beamWind'; sfx.charge(); setClip(e, 'beam', 14, false, bossBack(e, 2)); later(.6, () => { if (!e.dead && e.st === 'beamWind') { e.st = 'beam'; sfx.laser(); } }); }
}
function eshuPhase2(e) {
  e.phase = 2; e.st = 'burst'; e.inv = 2.2; sfx.roar(); shake(600, .012); softFlash(300, 255, 120, 120);
  $('bPhase').textContent = LEVELS[LV].boss.phase2; radio(TK().phase2);
  setClip(e, 'burst', 14, false, bossBack(e, 1));
  later(1.6, () => { if (G.boss !== e || e.dead) return; for (let k = 0; k < 2; k++) { const m = actor('eshu', e.x + (k ? 260 : -260), e.y, e.face); m.hp = m.max = 1; m.st = 'think'; m.cd = 1 + k; m.mirror = true; m.boss = false; m.spd = e.spd; m.decoy = true; setClip(m, 'idle', 14, true); G.en.push(m); G.all.push(m); SC.pBolt.explode(20, m.x, m.y - 120); } floatTxt(G.lock + VW / 2, 200, 'QUI EST LE VRAI ?', '#ffd36b', true); });
  updBoss();
}

// Nyx Adébayo : combo rapide, champ de gravité qui attire puis écrase, garde-contre qui punit l'acharnement, clones d'ombre en phase 2
function nyxUpdate(e, dt) {
  const p = target(e);
  if (e.st === 'bossEnter') { bossEnterStep(e); return; }
  if (e.st === 'dyingBoss') { e.vx = 0; return; }
  // compte les coups encaissés d'affilée : au-delà de 4, elle passe en garde-contre
  e.hitWin = Math.max(0, (e.hitWin || 0) - dt); if (e.hitWin <= 0) e.hitCount = 0;
  if (['combo', 'gravity', 'counter', 'burst'].includes(e.st)) {
    e.vx = e.vy = 0;
    if (e.st === 'combo') { const pr = prog(e); if (pr < .5) e.vx = e.face * 260; const k = Math.floor(pr * 3); if (k !== e.cHit && pr > .15 && pr < .9) { e.cHit = k; laneHit(e, 190, 9, k === 2); } }
    if (e.st === 'gravity') { const pr = prog(e); if (pr < .6) for (const q of G.players) if (q.active && q.st !== 'out' && q.z <= 0) { q.x += Math.sign(e.x - q.x) * 160 * dt; } }
    return;
  }
  if (e.hitCount >= 4 && !e.counterCd) { e.st = 'counter'; e.counterReady = true; e.counterCd = true; later(3, () => e.counterCd = false); floatTxt(e.x, e.y - 280, 'GARDE', '#c9a0ff'); setClip(e, 'counter', 14, false, () => { e.counterReady = false; bossBack(e, .8)(); }); return; }
  bossApproach(e, p, 200, dt); if (e.cd > 0) return; e.vx = e.vy = 0;
  const r = Math.random();
  if (r < .5) { e.st = 'combo'; e.cHit = -1; sfx.swing(); setClip(e, 'combo', 18, false, bossBack(e, 1.1)); }
  else {
    e.st = 'gravity'; sfx.charge(); setClip(e, 'gravity', 14, false, bossBack(e, 1.6));
    later(1.1, () => { if (e.dead) return; sfx.boom(); shake(320, .012); ringFx(e.x, e.y, 0xb07cff, 280, 450, true); for (const q of G.players) if (q.active && Math.abs(q.x - e.x) < 240 && Math.abs(q.y - e.y) < 90 && q.z < 40) hurtPlayer(q, 16, e, true); });
  }
}
function nyxPhase2(e) {
  e.phase = 2; e.st = 'burst'; e.inv = 2.4; sfx.roar(); sfx.boom(); shake(900, .016); softFlash(320, 176, 124, 255);
  $('bPhase').textContent = LEVELS[LV].boss.phase2; radio(TK().phase2);
  setClip(e, 'burst', 14, false, bossBack(e, 1));
  later(2.2, () => { if (G.boss !== e || e.dead) return; for (let k = 0; k < 2; k++) { const c = spawn('lamelune', k ? 1 : -1, true); c.shade = true; } floatTxt(G.lock + VW / 2, 200, 'OMBRES DE NYX', '#c9a0ff', true); });
  // gravité inversée : soulève régulièrement les héritiers
  e.liftT = 4;
  updBoss();
}
const BOSSAI = {
  ferrum: { update: (e, dt) => bossUpdate(e, dt), phase2: e => phase2(e) },
  yewa: { update: (e, dt) => yewaUpdate(e, dt), phase2: e => yewaPhase2(e) },
  ijji: { update: ijjiUpdate, phase2: ijjiPhase2 },
  oshun: { update: oshunUpdate, phase2: oshunPhase2 },
  eshu: { update: eshuUpdate, phase2: eshuPhase2 },
  nyx: { update: (e, dt) => { nyxUpdate(e, dt); if (e.phase === 2 && e.st !== 'dyingBoss') { e.liftT -= dt; if (e.liftT <= 0) { e.liftT = 6; floatTxt(G.lock + VW / 2, 200, 'GRAVITÉ INVERSÉE', '#c9a0ff', true); for (const q of G.players) if (q.active && q.st !== 'out' && q.z <= 0 && !['grab', 'held', 'dead'].includes(q.st)) { q.st = 'air'; q.vz = 900; q.z = 1; q.airAtk = false; setClip(q, 'jumpUp', 10, false); } } } }, phase2: nyxPhase2 }
};
function phase2(e) {
  e.phase = 2; e.st = 'burst'; e.inv = 2.2; e.vx = 0; sfx.roar(); sfx.boom(); shake(800, .018); softFlash(300, 255, 160, 60);
  $('bPhase').textContent = LEVELS[LV].boss.phase2; radio(TK().phase2);
  for (let i = 0; i < 3; i++) later(i * .2, () => SC.pFire.explode(30, e.x + rnd(-60, 60), e.y - rnd(100, 300)));
  ringFx(e.x, e.y, 0xffa040, 420, 700, true);
  for (const p of G.players) if (p.active && Math.abs(p.x - e.x) < 260) { p.vx = Math.sign(p.x - e.x) * 500; hurtPlayer(p, 10, e, true); }
  setClip(e, 'burst', 12, false, () => { e.st = 'roar'; setClip(e, 'roar', 12, false, () => { e.st = 'think'; e.cd = 1; setClip(e, 'idle2', 12, true); }); });
  later(2.5, () => { if (G.boss === e && !e.dead) { spawn('milicien', 1, DIFF[DIFFK].elite >= 1); spawn('milicien', -1); if (NPLAYERS > 1) spawn('chien', 1); tip('throwBoss'); } });
  updBoss();
}
// fissures d'armure à chaque palier de 10 % : retour visible des coups sur le colosse
function bossCrack(e) {
  const step = Math.floor(e.hp / e.max * 10); if (e.crack == null) e.crack = 10;
  if (step < e.crack) {
    e.crack = step; hitstop(.1); shake(220, .01); sfx.shatter(); e.flash = .14;
    SC.pFire.explode(26, e.x + rnd(-40, 40), e.y - rnd(150, 280)); SC.pSpark.explode(20, e.x, e.y - 220);
    floatTxt(e.x, e.y - 400 - (e.hover || 0), LEVELS[LV].boss.crack, '#ffb347'); e.x += e.face * -10;
  }
}
function bossDeath(e) {
  e.st = 'dyingBoss'; G.tsT = .22; sfx.roar(); shake(1400, .02); updBoss(); $('boss').hidden = true;
  for (const o of G.en) if (o !== e && !o.dead) kill(o, e);
  setClip(e, 'kneel', e.kind === 'yewa' ? 12 : 6, false); if (e.kind === 'yewa') { SC.tweens.add({ targets: e, hover: 0, duration: 1600 }); G.wind = 0; }
  for (let i = 0; i < 8; i++) later(i * .16, () => { SC.pFire.explode(26, e.x + rnd(-80, 80), e.y - rnd(60, 320)); sfx.boom(); });
  later(1.5, () => { G.tsT = 1; softFlash(600, 255, 240, 220); glowFx(e.x, e.y - 180, 0xffd36b, 14, 1200); SC.tweens.add({ targets: e.spr, alpha: 0, duration: 1200 }); });
  later(3.2, victory, true);
}

/* ---------- Projectiles & ondes ---------- */
function shotsUpdate(dt) {
  const g = SC.fxg;
  for (const s of G.shots) {
    s.life -= dt; s.x += s.vx * dt;
    g.lineStyle(6, s.col || 0xb07cff, .9); g.beginPath(); g.moveTo(s.x - Math.sign(s.vx) * 60, s.y - s.z); g.lineTo(s.x, s.y - s.z); g.strokePath();
    g.lineStyle(2, 0xffffff, 1); g.beginPath(); g.moveTo(s.x - Math.sign(s.vx) * 40, s.y - s.z); g.lineTo(s.x, s.y - s.z); g.strokePath();
    if (!s.reflected) for (const p of G.players) {
      if (!p.active || s.life <= 0 || !(Math.abs(s.x - p.x) < 34 && Math.abs(s.y - p.y) < 26 && p.z < 150)) continue;
      if (['atk1', 'atk2', 'atk3', 'kick', 'kick2'].includes(p.st) && Math.sign(s.x - p.x) === p.face) { s.vx *= -1.2; s.dmg = 24; s.reflected = true; s.owner = p; sfx.block(); floatTxt(p.x, p.y - 220, 'RENVOYÉ !', '#8ef7ff'); hitstop(.05); break; }
      else if (hurtPlayer(p, s.dmg, { x: s.x - s.vx }, false)) { s.life = 0; break; }
    }
    if (s.reflected) for (const e of G.en) if (!e.dead && Math.abs(s.x - e.x) < 40 && Math.abs(s.y - e.y) < 30) { hitEnemy(e, s.dmg, 'heavy', { x: s.x - s.vx, face: Math.sign(s.vx), owner: s.owner }); s.life = 0; }
  }
  G.shots = G.shots.filter(s => s.life > 0);
  for (const r of G.rings) {
    r.r += r.spd * dt; const a = 1 - r.r / r.max;
    g.lineStyle(10 * a + 2, r.col, Math.max(0, a)); g.strokeEllipse(r.x, r.y, r.r * 2, r.r * .7);
    for (const p of G.players) {
      if (!p.active || r.hitS.has(p.slot)) continue;
      const dx = (p.x - r.x), dy = (p.y - r.y) / .35, d = Math.hypot(dx, dy);
      if (Math.abs(d - r.r) < 30 && p.z < 18) { r.hitS.add(p.slot); hurtPlayer(p, r.dmg, { x: r.x }, true); }
    }
  }
  G.rings = G.rings.filter(r => r.r < r.max);
  pshotsUpdate(dt); hazardsUpdate(dt);
}
function darkness() {
  if (!SC.dark) SC.dark = SC.add.rectangle(0, 0, VW, VH, 0x05030c, 0).setOrigin(0).setScrollFactor(0).setDepth(8950);
  const on = G.event && G.event.kind === 'dark' && G.event.dark; const target = on ? .72 : 0;
  SC.dark.alpha += (target - SC.dark.alpha) * .08;
  if (SC.dark.alpha > .05) for (const p of G.players) if (p.active && p.st !== 'out') { const gx = SC.fxg; gx.fillStyle(0xfff0c8, .07); gx.fillCircle(p.x, p.y - 100, 170); }
  // la crue de l'arène monte jusqu'à son niveau
  if (G.floodTo) G.flood = (G.flood || 0) + Math.sign(G.floodTo - (G.flood || 0)) * Math.min(Math.abs(G.floodTo - (G.flood || 0)), 20 * (1 / 60));
  if (G.flood > 1) { const L = G.lock != null ? G.lock : G.cam, top = ZFLOOR[4][0]; SC.tele.fillStyle(0x2fe0d0, .22 + .05 * Math.sin(G.t * 3)); SC.tele.fillRect(L - 20, top - 6, VW + 40, G.flood + 6); for (const p of G.players) if (p.active) p.y = Math.max(p.y, top + G.flood); }
}
function telegraphs() {
  const g = SC.tele; g.clear(); darkness();
  for (const h of G.haz) { const k = clamp(h.t / h.warn, 0, 1); g.fillStyle(h.kind === 'vine' ? 0x7dff9a : h.laser ? 0xb07cff : 0xff7a2f, .1 + .2 * k + .08 * Math.sin(G.t * 30)); g.fillEllipse(h.x, h.y, h.r * 2 * (.4 + .6 * k), h.r * .7 * (.4 + .6 * k)); g.lineStyle(2, 0xffd36b, .6); g.strokeEllipse(h.x, h.y, h.r * 2, h.r * .7); }
  for (const e of G.en) {
    if (e.dead) continue;
    if (e.kind === 'tireuse' && e.st === 'aim') { const a = .35 + .35 * Math.sin(G.t * 40); g.lineStyle(2, 0xd28cff, a); g.beginPath(); g.moveTo(e.x + e.face * 120, e.y - 118); g.lineTo(e.x + e.face * 960, e.y - 118); g.strokePath(); g.fillStyle(0xb07cff, .12); g.fillEllipse(e.x + e.face * 400, e.y, 820, 26); }
    if (e.kind === 'pretresse' && (e.st === 'beamWind' || e.st === 'beam')) {
      const on = e.st === 'beam', x0 = e.x + e.face * 60, y0 = e.y - 150 - (e.hover || 0);
      if (!on) { g.fillStyle(0xb07cff, .14 + .12 * Math.sin(G.t * 30)); g.fillRect(Math.min(x0, x0 + e.face * 760), e.y - 32, 760, 64); }
      else { SC.fxg.lineStyle(26, 0xb07cff, .55); SC.fxg.beginPath(); SC.fxg.moveTo(x0, y0); SC.fxg.lineTo(x0 + e.face * 760, y0); SC.fxg.strokePath(); SC.fxg.lineStyle(8, 0xffffff, .9); SC.fxg.beginPath(); SC.fxg.moveTo(x0, y0); SC.fxg.lineTo(x0 + e.face * 760, y0); SC.fxg.strokePath(); }
    }
    if (e.kind === 'chien' && e.st === 'crouch') { g.fillStyle(0xff3d5a, .2 + .15 * Math.sin(G.t * 40)); g.fillEllipse(e.x + e.face * 260, e.y, 140, 30); }
    if (e.kind === 'brute' && e.st === 'slam' && prog(e) < .6) { g.lineStyle(3, 0xb07cff, .5); g.strokeEllipse(e.x + e.face * 60, e.y, 660, 230); }
    if (e.boss && e.st === 'smashWind') { g.fillStyle(0xff7a2f, .16 + .12 * Math.sin(G.t * 30)); g.fillEllipse(e.x + e.face * 40, e.y, 340, 120); }
  }
}

/* ---------- Caméra, rencontres ---------- */
function encounters(dt) {
  if (G.lock == null && G.enc < ENC.length) {
    const E = ENC[G.enc];
    if (G.cam >= E.L - 2) { G.lock = E.L; G.wave = -1; G.waveT = .4; G.checkpoint = G.enc; $('go').hidden = true; if (E.event) startEvent(E.event); if (E.boss) bossIntro(); else if (TK()['enc' + G.enc] && !G.said['enc' + G.enc]) { G.said['enc' + G.enc] = 1; radio(TK()['enc' + G.enc]); } }
  }
  if (G.lock != null && !G.ended) {
    const E = ENC[G.enc]; if (E.boss) return;
    const alive = G.en.filter(e => !e.dead).length;
    if (alive === 0) {
      G.waveT -= dt;
      if (G.waveT <= 0) {
        if (G.wave + 1 < E.waves.length) { G.wave++; G.waveT = 1.2; waveList(E.waves[G.wave]).forEach((k, i) => { const el = k.endsWith('*'); const e = spawn(el ? k.slice(0, -1) : k, i % 2 ? -1 : 1, el); e.slot = i * 40; }); }
        else { G.lock = null; G.event = null; G.gustT = 0; G.clouds = []; G.haz.forEach(h => h.done = 1); G.camMin = E.L; G.enc++; $('go').hidden = false; G.goT = 2.5; sfx.pick(); }
      }
    }
  }
}
function camera(dt) {
  const cam = SC.cameras.main, L = G.players.filter(p => p.active && p.st !== 'out');
  const P = L.length ? L : [G.p];
  const mx = P.reduce((a, p) => a + p.x, 0) / P.length, minX = Math.min(...P.map(p => p.x)), maxX = Math.max(...P.map(p => p.x));
  let target = mx - VW * .42 + (P.length === 1 ? P[0].face * 40 : 0);
  if (P.length > 1) target = clamp(target, maxX - VW + 60, minX - 60); // les deux joueurs restent à l'écran
  if (G.lock != null) target = G.lock; else target = clamp(target, G.camMin, Math.min(WORLD_W - VW, G.enc < ENC.length ? ENC[G.enc].L : WORLD_W));
  G.cam += (target - G.cam) * Math.min(1, dt * (G.lock != null ? 3 : 5));
  G.cam = Math.max(G.cam, G.camMin);
  cam.setScroll(Math.round(G.cam * 100) / 100, 0);
  if (G.goT > 0) { G.goT -= dt; if (G.goT <= 0) $('go').hidden = true; }
}
// vagues : en coop on ajoute un ennemi par vague ; en difficile, certains deviennent élites
function waveList(w) {
  const L = w.slice(), D = DIFF[DIFFK];
  if (NPLAYERS > 1) L.push(L[L.length - 1].replace('*', ''));
  if (D.elite >= 2) for (let i = 0; i < L.length; i++) if (!L[i].endsWith('*') && i % 3 === 1 && L[i] !== 'pretresse') L[i] += '*';
  if (D.elite === 0) for (let i = 0; i < L.length; i++) L[i] = L[i].replace('*', '');
  return L;
}

/* ---------- Événement de niveau : pluie de débris sur le pont des Vents ---------- */
function startEvent(kind) {
  if (kind === 'gusts') { G.event = { kind, t: 0, next: 2.2 }; tip('gusts'); return; }
  if (kind === 'bombard') { G.event = { kind: 'debris', t: 0, next: 1.4 }; radio([['kofi', 'Un dirigeable de Sombre-Lune nous pilonne ! Surveille les ombres sur le pont !']]); tip('debris'); return; }
  if (kind === 'flood') { G.event = { kind, t: 0, next: 1.8 }; tip('flood'); return; }
  if (kind === 'dark') { G.event = { kind, t: 0, next: 3, dark: false }; tip('dark'); return; }
  if (kind === 'elevator') { G.event = { kind: 'debris', t: 0, next: 1.6, laser: true }; radio([['zuri', 'L\'ascenseur monte, et leurs drones tirent depuis les parois. Bouge sans arrêt !']]); return; }
  if (kind !== 'debris') return; G.event = { kind, t: 0, next: 1.2 };
  radio([['kofi', 'Le pont se disloque ! Des blocs tombent des tours, suivez les ombres au sol !']]); tip('debris');
}
// rafale annoncée par des feuilles qui traversent l'écran, puis poussée sur tout le monde (joueurs et ennemis)
function gust(dir, power, dur) {
  G.gustT = dur; G.gustDir = dir; G.gustPow = power; sfx.storm();
  for (let i = 0; i < 26; i++) later(i * .03, () => SC.pViolet && SC.pDust.explode(1, (dir > 0 ? G.cam : G.cam + VW) , rnd(300, 520)));
}
function windTick(dt) {
  if (!G.gustT || G.gustT <= 0) return; G.gustT -= dt;
  const push = G.gustDir * G.gustPow * dt;
  for (const p of G.players) if (p.active && p.st !== 'out' && p.st !== 'held' && p.st !== 'grab') { p.x += push * (p.z > 0 ? 1.4 : 1); p.windFx = .1; }
  for (const e of G.en) if (!e.dead && !e.boss && !['grabbed', 'thrown', 'holding'].includes(e.st)) e.x += push * .8;
  if (Math.random() < .6) { const g = SC.fxg; g.lineStyle(2, 0xe8fff4, .35); for (let i = 0; i < 3; i++) { const y = rnd(260, 520), x = G.cam + rnd(0, VW); g.beginPath(); g.moveTo(x, y); g.lineTo(x + G.gustDir * rnd(60, 140), y + rnd(-6, 6)); g.strokePath(); } }
}
function eventUpdate(dt) {
  const ev = G.event; if (!ev || G.lock == null) return; ev.t += dt; ev.next -= dt;
  if (ev.next > 0) return;
  if (ev.kind === 'flood') { ev.next = rnd(2.6, 3.6); const dir = Math.random() < .5 ? 1 : -1, x = dir > 0 ? G.lock + 20 : G.lock + VW - 20; const f = floorAt(x + dir * 200); floatTxt(G.lock + VW / 2, 200, 'VANNE OUVERTE : SAUTE !', '#8ef7ff', true); later(.7, () => { if (G.event === ev) { noise(.8, .18, 500, .5); G.rings.push({ x, y: (f[0] + f[1]) / 2, r: 20, max: 1100, spd: 560, dmg: 10, col: 0x2fe0d0, hitS: new Set() }); } }); return; }
  if (ev.kind === 'dark') { ev.dark = !ev.dark; ev.next = ev.dark ? 3.2 : 5; if (ev.dark) { floatTxt(G.lock + VW / 2, 200, 'LES LUMIÈRES S\'ÉTEIGNENT', '#c9a0ff', true); sfx.zap(); } return; }
  if (ev.kind === 'gusts') { ev.next = rnd(3.2, 4.6); const dir = Math.random() < .5 ? -1 : 1; ev.warn = dir; floatTxt(G.cam + VW / 2, 200, dir > 0 ? 'RAFALE ▶' : '◀ RAFALE', '#e8fff4', true); later(.8, () => { if (G.event === ev) gust(dir, 230, 1.6); }); return; } ev.next = rnd(.9, 1.6) / (NPLAYERS > 1 ? 1.3 : 1);
  // un bloc vise un joueur, un autre tombe au hasard : les ennemis y passent aussi
  const ps = G.players.filter(p => p.active && p.st !== 'out'), p = pick(ps.length ? ps : [G.p]);
  const drop = (x) => { const f = floorAt(x); G.haz.push({ x, y: rnd(f[0] + 10, f[1] - 10), r: 90, t: 0, warn: 1.1, laser: ev.laser }); };
  drop(clamp(p.x + rnd(-40, 40), G.lock + 60, G.lock + VW - 60)); if (Math.random() < .6) drop(G.lock + rnd(80, VW - 80));
}
// nuages de spores des faucheuses : ralentissent et grignotent la vie
function cloudsUpdate(dt) {
  const g = SC.tele;
  for (const c of G.clouds) {
    c.life -= dt; c.tick -= dt; const a = Math.min(1, c.life) * .28;
    g.fillStyle(0xb07cff, a); g.fillEllipse(c.x, c.y, c.r * 2, c.r * .8); g.fillStyle(0xd8b4ff, a * .6); g.fillEllipse(c.x + Math.sin(G.t * 3) * 12, c.y - 6, c.r * 1.4, c.r * .5);
    if (Math.random() < .3) SC.pViolet.explode(1, c.x + rnd(-c.r, c.r) * .8, c.y - rnd(10, 70));
    for (const p of G.players) if (p.active && p.st !== 'out' && Math.abs(p.x - c.x) < c.r && Math.abs(p.y - c.y) < c.r * .4 && p.z < 40) { p.slowT = Math.max(p.slowT || 0, .4); if (c.tick <= 0) { p.hp = Math.max(1, p.hp - Math.round(3 * DIFF[DIFFK].hurt)); p.flash = .06; updHUD(); } }
    if (c.tick <= 0) c.tick = .5;
  }
  G.clouds = G.clouds.filter(c => c.life > 0);
}
function hazardsUpdate(dt) {
  if (!G.haz) return;
  for (const h of G.haz) {
    if (h.done) continue; h.t += dt;
    if (h.t >= h.warn) {
      h.done = 1;
      if (h.kind === 'vine') { // lianes : jaillissent du sol, blessent et entravent
        sfx.growl(); shake(140, .006); SC.pViolet.explode(20, h.x, h.y - 30); ringFx(h.x, h.y, 0x7dff9a, h.r * 1.3, 320, true); glowFx(h.x, h.y - 60, 0x7dff9a, 3, 380);
        for (const p of G.players) if (p.active && Math.abs(p.x - h.x) < h.r && Math.abs(p.y - h.y) < h.r * .45 && p.z < 50 && hurtPlayer(p, 12, { x: h.x }, false)) { p.slowT = 1.6; floatTxt(p.x, p.y - 220, 'ENTRAVÉE', '#7dff9a'); }
        continue;
      }
      sfx.boom(); shake(200, .01); SC.pFire.explode(18, h.x, h.y - 20); SC.pDust.explode(16, h.x, h.y); ringFx(h.x, h.y, 0xffb347, h.r * 1.4, 300, true);
      for (const p of G.players) if (p.active && Math.abs(p.x - h.x) < h.r && Math.abs(p.y - h.y) < h.r * .4 && p.z < 60) hurtPlayer(p, 14, { x: h.x }, true);
      for (const e of G.en) if (!e.dead && !e.boss && Math.abs(e.x - h.x) < h.r && Math.abs(e.y - h.y) < h.r * .4) hitEnemy(e, 22, 'object', { x: h.x, face: 1 });
    }
  }
  G.haz = G.haz.filter(h => !h.done);
}

/* ---------- Boucle ---------- */
function tick(rdt) {
  if (!G || paused) return;
  SC.fxg.clear(); SC.bars.clear();
  G.ts += (G.tsT - G.ts) * Math.min(1, rdt * 8);
  if (state !== 'play' && !G.demo) { drawAll(); return; }
  if (G.demo) { demoTick(rdt); return; }
  pollPad();
  if (G.hitstop > 0) { G.hitstop -= rdt; drawAll(); return; }
  const dt = rdt * G.ts; G.t += dt;
  for (const I of INP) { I.x = clamp(I.kx + I.jx + I.gx, -1, 1); I.y = clamp(I.ky + I.jy + I.gy, -1, 1); }
  runTimers(dt, rdt);
  for (const p of G.players) if (p.active) { animStep(p, dt); playerUpdate(p, dt); }
  for (const e of G.en) { animStep(e, dt); if (!e.dead || e.st === 'dying' || e.st === 'gone' || e.st === 'dyingBoss') enemyUpdate(e, dt); meleeCheck(e); }
  separate();
  for (const e of G.en) if (e.remove) { e.spr.destroy(); e.sh.destroy(); }
  G.all = G.all.filter(a => !a.remove); G.en = G.en.filter(e => !e.remove);
  propsUpdate(dt); eventUpdate(dt); windTick(dt); shotsUpdate(dt); telegraphs(); cloudsUpdate(dt); encounters(dt); camera(rdt);
  // en coop, chaque joueur reste dans le cadre de la caméra
  if (G.players.filter(p => p.active).length > 1) for (const p of G.players) if (p.active && p.st !== 'out') p.x = clamp(p.x, G.cam + 40, G.cam + VW - 40);
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  for (const p of G.players) if (p.active && p.weapon && Math.random() < .5) (p.weapon.kind === 'spear' ? SC.pBolt : SC.pFire).explode(1, p.x + p.face * 40 + rnd(-20, 20), p.y - rnd(60, 160) - p.z);
  zoneTint(); tipsTick(); radioTick(rdt); drawAll(); hudTick();
}
// teinte d'ambiance par zone : marché chaud, pont froid, réacteur incandescent
function mulTint(t, c) { t = t || 0xffffff; return (Math.round(((t >> 16) & 255) * c[0] / 255) << 16) | (Math.round(((t >> 8) & 255) * c[1] / 255) << 8) | Math.round((t & 255) * c[2] / 255); }
function zoneTint() {
  const f = (G.cam + VW * .42) / STEP, k = clamp(Math.floor(f), 0, 4), k2 = clamp(k + 1, 0, 4), t = clamp((f - k - .85) / .15, 0, 1);
  const c = ZTINT[k].map((v, i) => Math.round(v + (ZTINT[k2][i] - v) * t)); G.zoneTint = (c[0] << 16) | (c[1] << 8) | c[2];
}
function drawAll() {
  for (const a of G.all) {
    if (a.fi < 0) animStep(a, 0);
    draw(a);
    if (a.flash > 0) a.spr.setTintFill(0xffffff); else if (a.boss && a.phase === 2) a.spr.setTint(0xffd0b0); else if (a.st === 'grabbed') a.spr.setTint(0xffe0c8); else if (a.slot === 1) a.spr.setTint(mulTint(G.zoneTint, P2TINT)); else if (a.elite) a.spr.setTint(mulTint(G.zoneTint, ELITE[a.kind].tint)); else a.spr.setTint(G.zoneTint || 0xffffff);
    if (a.inv > 0 && a.isPlayer && a.st !== 'dash' && a.st !== 'power' && a.st !== 'rush') a.spr.setAlpha(Math.floor(a.inv * 16) % 2 ? .45 : 1);
    else if (a.kind === 'plongeur' && a.st === 'dive') { const pr = prog(a); a.spr.setAlpha(pr > .3 && pr < .62 ? 0 : 1); }
    else if (a.st !== 'gone' && !a.boss) a.spr.setAlpha(a.kind === 'spectre' ? (a.clone ? .55 : .82) : a.decoy ? .9 : 1);
    if (a.shade && a.flash <= 0) a.spr.setTint(0x6a4a9a);
    // petites barres de vie ennemies
    if (a.isPlayer && NPLAYERS > 1 && a.active && a.st !== 'out') { SC.bars.fillStyle(a.slot ? 0xffb37a : 0x8ef7ff, .9).fillTriangle(a.x - 9, a.y - CHAR.amara.h - a.z - 30, a.x + 9, a.y - CHAR.amara.h - a.z - 30, a.x, a.y - CHAR.amara.h - a.z - 18); }
    if (!a.isPlayer && !a.boss && !a.dead && a.hp < a.max) { const w = 60, x = a.x - w / 2, y = a.y - CHAR[a.kind].h - a.z - 18; SC.bars.fillStyle(0x0b0714, .8).fillRect(x - 1, y - 1, w + 2, 6).fillStyle(0xff3d5a, 1).fillRect(x, y, w * a.hp / a.max, 4); if (a.shield > 0) SC.bars.fillStyle(0xb07cff, 1).fillRect(x, y + 6, w * a.shield / a.shieldMax, 3); }
  }
}
function demoTick(dt) {
  G.t += dt; const p = G.p; animStep(p, dt); p.x = 300; p.face = 1; drawAll();
  SC.cameras.main.setScroll(0, 0);
}

/* ---------- Conseils contextuels (une fois par appareil) ---------- */
let tipSeen = {}; try { tipSeen = JSON.parse(localStorage.getItem('orun-tips') || '{}'); } catch (e) {}
const TIPS = {
  move: () => touch ? 'Joystick : déplacement en 8 directions. Maintiens une direction pour <b>courir</b>.' : '<b>Flèches/ZQSD</b> : déplacement. Double-tape ou maintiens une direction pour <b>courir</b>.',
  grab: () => 'Prise ! <b>' + (touch ? 'Frappe' : 'J') + '</b> = genoux · <b>' + (touch ? 'Saut' : 'K') + '</b> = passer dans son dos · <b>arrière + ' + (touch ? 'Frappe' : 'J') + '</b> = projection.',
  vault: () => 'Dans son dos : <b>' + (touch ? 'Saut' : 'K') + '</b> = renversement, il s\'écrase sur ses alliés.',
  held: () => 'Un capitaine te tient ! <b>Martèle les boutons</b> pour te libérer. En coop, ton partenaire peut le frapper.',
  weapon: () => 'Arme en main : plus de portée et de dégâts, elle s\'use. <b>Tempête</b> = la lancer. Tu la perds si tu tombes.',
  rank: () => 'Nouvelle <b>étoile</b> : coups plus forts et plus rapides. Tu en perds une à chaque chute.',
  flood: () => 'Quand une vanne s\'ouvre, une vague balaie le sol : <b>saute</b> au bon moment.',
  dark: () => 'Les lumières s\'éteignent par moments : reste près de ton partenaire et frappe ce que tu vois.',
  harponneur: () => 'Ligne orange = harpon : <b>change de ligne</b> ou saute, sinon il te ramène à lui.',
  plongeur: () => 'Le plongeur disparaît sous l\'eau et ressurgit <b>derrière toi</b> : retourne-toi vite.',
  spectre: () => 'Le spectre se dédouble quand il faiblit : le reflet pâle tombe en un coup.',
  lamelune: () => 'La lame-lune <b>pare</b> de face : prends-la de dos, utilise la Tempête ou une prise.',
  gusts: () => 'Les rafales poussent tout le monde : <b>avance contre le vent</b> ou profites-en pour pousser les ennemis dans le vide.',
  faucheuse: () => 'La faucheuse frappe loin et bas : <b>saute</b> par-dessus sa faucille, puis colle-la. Évite ses spores violettes.',
  yewa: () => 'Yewa-Nul vole : <b>frappe en sautant</b>, ou attends qu\'elle s\'épuise au sol après un piqué. Quitte les cercles verts.',
  debris: () => 'Des blocs tombent : <b>quitte les ombres orange</b>. Les ennemis aussi y passent.',
  kick: () => '<b>' + (touch ? 'Pied' : 'I') + '</b> = coup de pied (renverse) · <b>bas + pied</b> = balayage · Frappe, Frappe, Pied = enchaînement.',
  milicien: () => 'Le milicien <b>pare</b> de face : le 3ᵉ coup du combo, l\'esquive ou une <b>prise</b> brisent sa garde.',
  chien: () => 'Le chien s\'accroupit avant de bondir : <b>change de ligne</b> ou saute.',
  tireuse: () => 'Ligne violette = tir imminent. <b>Frappe au bon moment</b> pour le renvoyer.',
  brute: () => 'Bouclier frontal : contourne-la, <b>Tempête</b>, ou combo jusqu\'à le briser. <b>Saute</b> l\'onde au sol.',
  pretresse: () => 'La prêtresse protège ses alliés d\'un sceau : <b>frappe-la</b> pour le dissiper.',
  power: () => '<b>Tempête prête</b> (' + (touch ? 'bouton turquoise' : 'L') + ') : sur place = onde circulaire · <b>avec une direction</b> = Ruée-tempête. Sans énergie, elle coûte de la vie.',
  boss: () => LV === 1 ? TIPS.yewa() : LV > 1 ? (LEVELS[LV].boss.tip || '') : 'Oba Ferrum est blindé : <b>Tempête, tonneaux, projections</b> et finishers passent l\'armure. Saute ses ondes.',
  throwBoss: () => LV === 1 ? 'Renforts ! <b>Projette</b> une faucheuse : Yewa est touchée de plein fouet si elle plane bas.' : 'Renforts ! <b>Projette</b> un milicien sur le colosse.',
};
let tipQ = [], tipT = 0;
function tip(k) { if (tipSeen[k] || !TIPS[k] || G.demo) return; tipSeen[k] = 1; try { localStorage.setItem('orun-tips', JSON.stringify(tipSeen)); } catch (e) {} tipQ.push(TIPS[k]()); }
function tipsTick() {
  const el = $('tip');
  if (tipT > 0 && $('radio').classList.contains('on')) { tipT = 0; el.hidden = true; } // la radio prend la place
  if (tipT > 0) { tipT -= 1 / 60; if (tipT <= 0) el.hidden = true; return; }
  if (tipQ.length && !$('radio').classList.contains('on') && $('bossIntro').hidden && state === 'play') { el.innerHTML = tipQ.shift(); el.hidden = false; tipT = 4.2; }
  if (G.t > 1 && G.t < 1.1) tip('move');
  if (G.t > 9 && G.t < 9.1) tip('kick');
  if (G.p.en >= 50) tip('power');
  for (const e of G.en) if (!e.dead && e.st !== 'enter') tip(e.kind);
}
/* ---------- HUD ---------- */
let lastHud = '';
function updHUD() {
  if (!G) return;
  G.players.forEach((p, i) => {
    const sfx2 = i ? '2' : '', hp = p.st === 'out' ? 0 : p.hp / p.max * 100;
    $('hpBar' + sfx2).querySelector('i').style.width = hp + '%'; $('hpBar' + sfx2).querySelector('b').style.width = hp + '%';
    $('enBar' + sfx2).querySelector('i').style.width = p.en + '%'; $('enBar' + sfx2).classList.toggle('full', p.en >= 50);
    const lv = G.demo ? '' : (p.st === 'out' ? 'HORS JEU' : '◆'.repeat(Math.max(0, p.lives))); if ($('lives' + sfx2).textContent !== lv) $('lives' + sfx2).textContent = lv;
    const st = G.demo ? '' : '★'.repeat(p.rank); if ($('rank' + sfx2).textContent !== st) $('rank' + sfx2).textContent = st;
    const w = p.weapon ? WEAPONS[p.weapon.kind].name + ' · ' + p.weapon.uses : ''; const el = $('wpn' + sfx2); if (el.textContent !== w) { el.textContent = w; el.hidden = !w; }
  });
  $('hud2').hidden = G.demo || !G.players[1].active; $('hud').classList.toggle('duo', !$('hud2').hidden);
  const c = $('credits'); const ct = G.demo ? '' : 'Crédits ' + G.cont; if (c.textContent !== ct) c.textContent = ct;
}
function updBoss() { const b = G.boss; if (!b) return; const f = Math.max(0, b.hp / b.max * 100); $('bossBar').querySelector('i').style.width = f + '%'; $('bossBar').querySelector('b').style.width = f + '%'; }
function hudTick() {
  const sc = String(Math.floor(G.score)).padStart(6, '0'); if (sc !== lastHud) { lastHud = sc; $('score').textContent = sc; }
  const c = $('combo'); if (G.combo >= 3) { c.style.opacity = 1; $('comboN').textContent = G.combo; } else c.style.opacity = 0;
  updHUD();
}

/* ---------- Écrans & flux ---------- */
let storyI = 0, storyMode = 'intro';
function showStory(mode) {
  storyMode = mode; storyI = 0; state = 'story'; $('title').hidden = true; $('story').hidden = false; renderStory();
}
function renderStory() {
  const list = storyMode === 'intro' ? STORY : [END];
  const [ey, tx] = list[storyI]; $('stEy').textContent = ey; $('stTx').textContent = tx;
  $('stDots').innerHTML = list.map((_, i) => `<i class="${i === storyI ? 'on' : ''}"></i>`).join('');
  const more = LV < LEVELS.length - 1;
  $('bNext').textContent = storyMode === 'end' ? (more ? 'Acte suivant ▶' : 'Retour au menu') : storyI < list.length - 1 ? 'Continuer' : 'Combattre';
  $('bSkip').hidden = storyMode === 'end';
}
$('bNext').addEventListener('click', () => { const list = storyMode === 'intro' ? STORY : [END]; if (storyI < list.length - 1) { storyI++; renderStory(); } else if (storyMode === 'intro') begin(); else if (LV < LEVELS.length - 1) nextLevel(); else toMenu(); });
$('bSkip').addEventListener('click', begin);
function begin() {
  audio(); playTrack(LEVELS[LV].track); $('story').hidden = true; newGame(false); applyCarry(); state = 'play'; paused = false; radioQ = []; radioT = 0; $('radio').classList.remove('on');
  later(1, () => radio(TK().start), true);
  $('hud').hidden = false; $('bPause').hidden = false; document.body.classList.add('playing'); sfx.gong();
}
function bossIntro() {
  $('tip').hidden = true; tipT = 0; tipQ = [];
  $('bossIntro').hidden = false; playTrack(LEVELS[LV].bossTrack); if (CINES[LV]) preloadIntro(CINES[LV]); sfx.gong(); G.tsT = .3;
  const go = () => { if (!BOSS_READY) { later(.3, go, true); return; } G.tsT = 1; $('bossIntro').hidden = true; spawnBoss(); tip('boss'); };
  later(2.4, go, true);
}
function showOver() {
  if (state !== 'play') return; state = 'over'; document.body.classList.remove('playing'); playTrack('over');
  $('ovEy').textContent = NPLAYERS > 1 ? 'Les héritiers sont tombés' : 'Amara est tombée'; $('ovScore').textContent = String(Math.floor(G.score)).padStart(6, '0');
  $('ovSub').textContent = G.kills + ' ennemis vaincus · zone ' + (G.checkpoint + 1) + ' sur ' + ENC.length + (G.cont > 0 ? ' · ' + G.cont + ' crédit' + (G.cont > 1 ? 's' : '') + ' restant' + (G.cont > 1 ? 's' : '') : ' · plus de crédit');
  $('bRetry').hidden = G.cont <= 0; $('bRetry').textContent = 'Continuer (' + G.cont + ')'; $('ovEy').textContent = G.cont > 0 ? (NPLAYERS > 1 ? 'Les héritiers sont tombés' : 'Amara est tombée') : 'Fin de partie';
  $('over').hidden = false; saveBest();
}
function victory() {
  for (const p of G.players) if (p.active && p.st !== 'out' && p.st !== 'dead') { p.st = 'win'; p.vx = p.vy = 0; setClip(p, 'win', 12, false); }
  G.ended = true; playTrack('clear'); $('boss').hidden = true; $('bossIntro').hidden = true; $('tip').hidden = true; tipT = 0; tipQ = [];
  cutscene(TK().win, () => playEndCine(() => {
  state = 'end'; document.body.classList.remove('playing'); saveBest(); later(4, () => playTrack('title'), true);
  $('hud').hidden = true; $('boss').hidden = true; $('bPause').hidden = true; showStory('end');
  $('stEy').textContent = END[0] + ' · Score ' + String(Math.floor(G.score)).padStart(6, '0');
  setTimeout(() => playTrack('title'), 6000);
  }));
}
function clearCombo() { $('combo').style.opacity = 0; $('buff').hidden = true; }
function saveBest() { clearCombo(); const s = Math.floor(G.score); if (s > best) { best = s; try { localStorage.setItem('orun-best', String(best)); } catch (e) {} } }
function toMenu() {
  if (LV !== 0) { location.reload(); return; } // le menu vit dans le décor de l'acte I
  try { SC.scene.resume(); } catch (e) {} $('tip').hidden = true; tipQ = []; tipT = 0;
  for (const id of ['story', 'over', 'pause', 'bossIntro']) $(id).hidden = true; $('hud').hidden = true; $('boss').hidden = true; $('bPause').hidden = true; $('go').hidden = true;
  document.body.classList.remove('playing'); clearCombo(); paused = false; state = 'title'; playTrack('title'); $('talk').hidden = true; $('radio').classList.remove('on'); radioQ = []; newGame(true); $('title').hidden = false;
  $('best').textContent = best ? 'Record ' + String(best).padStart(6, '0') : '';
}
function retry() {
  // reprise au dernier point de contrôle
  const cp = G.checkpoint, sc = Math.floor(G.score * .5), cont = G.cont - 1, ranks = G.players.map(p => Math.max(1, p.rank - 1));
  $('over').hidden = true; newGame(false); G.score = sc; G.cont = cont; G.players.forEach((p, i) => p.rank = ranks[i]); MUSMAN.cur = null; playTrack(LEVELS[LV].track); state = 'play'; document.body.classList.add('playing');
  if (cp > 0) { G.enc = cp; G.camMin = ENC[cp].L - 20; G.cam = ENC[cp].L - 300; for (const q of G.players) { q.x = ENC[cp].L + 120 - q.slot * 60; q.y = clamp(q.y, floorAt(q.x)[0], floorAt(q.x)[1]); } for (const pr of G.props) if (pr.x < ENC[cp].L) { pr.dead = true; pr.spr.destroy(); } }
  if (ENC[cp] && ENC[cp].boss) { G.cam = ENC[cp].L; }
  $('hud').hidden = false; $('bPause').hidden = false; $('boss').hidden = true;
}
// passage à l'acte suivant : on garde score, vies, étoiles et crédits, puis on recharge la scène avec le nouveau décor
function nextLevel() {
  CARRY = { score: G.score, cont: G.cont, np: NPLAYERS, players: G.players.map(p => ({ active: p.active, out: p.st === 'out', lives: p.lives, rank: p.rank, score: p.score, nextLife: p.nextLife, rankPts: p.rankPts || 0, en: p.en })) };
  $('story').hidden = true; $('loading').hidden = false; $('loading').innerHTML = '<div>' + LEVELS[LV + 1].name + '<span><i id="lbar"></i></span></div>';
  state = 'loading'; G = null; setLevel(LV + 1); SC.scene.restart();
}
function applyCarry() {
  if (!CARRY) return; const c = CARRY; CARRY = null;
  G.score = c.score; G.cont = c.cont; NPLAYERS = c.np;
  c.players.forEach((q, i) => {
    const p = G.players[i]; if (q.active && !p.active) joinPlayer(p, true);
    Object.assign(p, { lives: Math.max(1, q.lives), rank: q.rank, score: q.score, nextLife: q.nextLife, rankPts: q.rankPts, en: Math.max(q.en, 40) });
    if (q.out && G.cont > 0) { /* revient pour l'acte suivant */ }
  });
  updHUD();
}
function startGame() { NPLAYERS = $('m2p').classList.contains('on') ? 2 : 1; startIntro(begin); }
$('bStart').addEventListener('click', () => { audio(); startGame(); });
for (const id of ['m1p', 'm2p']) $(id).addEventListener('click', () => { $('m1p').classList.toggle('on', id === 'm1p'); $('m2p').classList.toggle('on', id === 'm2p'); $('keys2').hidden = id !== 'm2p'; });
for (const k in DIFF) $('d-' + k).addEventListener('click', () => { DIFFK = k; try { localStorage.setItem('orun-diff', k); } catch (e) {} for (const j in DIFF) $('d-' + j).classList.toggle('on', j === k); });
for (const j in DIFF) $('d-' + j).classList.toggle('on', j === DIFFK);
$('bRetry').addEventListener('click', retry);
$('bMenu').addEventListener('click', toMenu);
$('bQuit').addEventListener('click', toMenu);
$('bResume').addEventListener('click', () => setPause(false));
$('bPause').addEventListener('click', () => setPause(true));
function setPause(v) { if (state !== 'play') return; paused = v; try { v ? SC.scene.pause() : SC.scene.resume(); } catch (e) {} $('pause').hidden = !v; document.body.classList.toggle('playing', !v); if (AC) v ? AC.suspend() : AC.resume(); }
$('bMute').addEventListener('click', () => { audio(); muted = !muted; if (master) master.gain.value = muted ? 0 : .9; $('wave').style.opacity = muted ? .15 : 1; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setPause(true); });

/* ---------- Entrées ---------- */
// clavier : en solo, flèches et ZQSD/WASD pilotent Amara ; à deux, flèches + pavé numérique = J2
const KEYS = { arrowleft: 'l', q: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', z: 'u', w: 'u', arrowdown: 'd', s: 'd' };
const ARROWS = { arrowleft: 1, arrowright: 1, arrowup: 1, arrowdown: 1 };
const P2PAD = { Numpad1: 'atk', Numpad2: 'jump', Numpad3: 'pow', Numpad0: 'dash', Numpad4: 'kick', Numpad5: 'heavy', Numpad6: 'sup2', Numpad7: 'sweep' };
const held = [new Set(), new Set()];
const lastTap = [{ d: '', t: 0 }, { d: '', t: 0 }];
function keyDir(i) { const h = held[i], I = INP[i]; I.kx = (h.has('r') ? 1 : 0) - (h.has('l') ? 1 : 0); I.ky = (h.has('d') ? 1 : 0) - (h.has('u') ? 1 : 0); }
const keySlot = k => (NPLAYERS > 1 && ARROWS[k]) ? 1 : 0;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'escape' || k === 'p') { setPause(!paused); return; }
  if (state === 'title' && k === 'enter') { audio(); startGame(); return; }
  if (state === 'cine' && (k === 'enter' || k === 'escape' || k === ' ')) { e.preventDefault(); endIntro(); return; }
  if (state === 'talk' && (k === 'enter' || k === ' ' || k === 'j' || k === 'x' || k === 'k' || e.code === 'Numpad1')) { e.preventDefault(); nextTalk(); return; }
  if (state === 'story' && (k === 'enter' || k === ' ')) { e.preventDefault(); $('bNext').click(); return; }
  if (state !== 'play' || paused) return;
  // le J2 rejoint en cours de partie : Entrée du pavé numérique
  if (e.code === 'NumpadEnter' && G && !G.players[1].active) { joinPlayer(G.players[1]); return; }
  if (KEYS[k]) {
    const d = KEYS[k], i = keySlot(k); e.preventDefault();
    if (!e.repeat && (d === 'l' || d === 'r')) { const now = performance.now(); if (lastTap[i].d === d && now - lastTap[i].t < 260) INP[i].runReq = 1; lastTap[i] = { d, t: now }; }
    held[i].add(d); keyDir(i); return;
  }
  if (e.repeat) return;
  if (P2PAD[e.code]) { INP[NPLAYERS > 1 ? 1 : 0][P2PAD[e.code]] = 1; e.preventDefault(); return; }
  if (k === 'j' || k === 'x') inp.atk = 1;
  else if (k === 'i' || k === 'h') inp.kick = 1;
  else if (k === 'k' || k === ' ' || k === 'c') { inp.jump = 1; e.preventDefault(); }
  else if (k === 'u') inp.heavy = 1;
  else if (k === 'o') inp.sup2 = 1;
  else if (k === 'n') inp.sweep = 1;
  else if (k === 'l' || k === 'v') inp.pow = 1;
  else if (k === 'shift' || k === 'u' || k === 'b') inp.dash = 1;
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (KEYS[k]) { const i = keySlot(k); held[i].delete(KEYS[k]); keyDir(i); if (!held[i].has('l') && !held[i].has('r')) INP[i].runReq = 0; } });
// manettes (API Gamepad) : A saut, X frappe, Y pied, B esquive, RB/RT Tempête, Start pause (ou rejoindre pour le J2)
// à deux : 2 manettes = J1 et J2 ; 1 seule manette = J2 (le J1 joue au clavier)
let padPrev = {};
function padSlot(gi, n) { if (NPLAYERS < 2) return 0; if (n >= 2) return gi === 0 ? 0 : 1; return 1; }
function pollPad() {
  const raw = navigator.getGamepads ? navigator.getGamepads() : [], pads = [];
  for (const g of raw) if (g && g.connected) pads.push(g);
  const used = [false, false];
  pads.forEach((gp, gi) => {
    if (gi > 1) return;
    const slot = padSlot(gi, pads.length), I = INP[slot], prev = padPrev[gp.index] || [];
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), edge = i => b(i) && !prev[i];
    let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
    I.gx = Math.abs(ax) > .35 ? Math.sign(ax) : 0; I.gy = Math.abs(ay) > .35 ? Math.sign(ay) : 0; used[slot] = true;
    if (state === 'play' && !paused) { if (edge(0)) I.jump = 1; if (edge(2)) I.atk = 1; if (edge(3)) I.kick = 1; if (edge(1)) I.dash = 1; if (edge(4) || edge(7)) I.pow = 1; if (edge(5)) I.heavy = 1; if (edge(6)) I.sup2 = 1; }
    // START sur une 2e manette : le J2 rejoint (ou revient avec un crédit)
    if (edge(9) && state === 'play' && G && gi === 1 && !G.players[1].active) { NPLAYERS = 2; joinPlayer(G.players[1]); }
    else if (edge(9) && state === 'play' && G && G.players[slot].st === 'out') rejoin(G.players[slot]);
    else if (edge(9)) { if (state === 'play') setPause(!paused); else if (state === 'title') { audio(); startGame(); } else if (state === 'cine') endIntro(); }
    if (edge(0) && state === 'talk') nextTalk(); if (edge(0) && state === 'cine') endIntro();
    if (edge(0) && state === 'story') $('bNext').click();
    if (edge(0) && state === 'over' && !$('bRetry').hidden) retry();
    padPrev[gp.index] = gp.buttons.map(x => x.pressed);
  });
  for (let i = 0; i < 2; i++) if (!used[i]) INP[i].gx = INP[i].gy = 0;
}
// la manette doit aussi répondre en pause et sur les menus
setInterval(() => { if (state !== 'play' || paused) pollPad(); }, 50);
function bindBtn(id, key) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); audio(); b.classList.add('on'); if (state === 'play' && !paused) inp[key] = 1; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('on'));
}
bindBtn('bAtk', 'atk'); bindBtn('bKick', 'kick'); bindBtn('bHeavy', 'heavy'); bindBtn('bSweep', 'sweep'); bindBtn('bSup', 'sup2'); bindBtn('bJump', 'jump'); bindBtn('bPow', 'pow'); bindBtn('bDash', 'dash');
const joy = $('joy'), knob = $('knob'); let jid = null, jc = [0, 0];
function joyMove(e) {
  let dx = e.clientX - jc[0], dy = e.clientY - jc[1]; if (ROT) [dx, dy] = [dy, -dx];
  const m = Math.hypot(dx, dy); if (m < 10) { inp.jx = inp.jy = 0; knob.style.transform = ''; return; }
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), r = Math.min(m, 42);
  inp.jx = Math.round(Math.cos(a) * 100) / 100; inp.jy = Math.round(Math.sin(a) * 100) / 100;
  knob.style.transform = `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px)`;
}
joy.addEventListener('pointerdown', e => { e.preventDefault(); audio(); jid = e.pointerId; try { joy.setPointerCapture(jid); } catch (_) {} const r = joy.getBoundingClientRect(); jc = [r.left + r.width / 2, r.top + r.height / 2]; joyMove(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === jid) joyMove(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) joy.addEventListener(ev, e => { if (e.pointerId === jid) { jid = null; inp.jx = inp.jy = 0; knob.style.transform = ''; } });
addEventListener('contextmenu', e => e.preventDefault());
const titleMusic = () => { if (state === 'title' && MUSMAN.cur !== 'title') { audio(); playTrack('title'); preloadIntro(); } };
addEventListener('pointerdown', titleMusic); addEventListener('keydown', titleMusic);

/* ---------- Musique : fichiers music/*.mp3 s'ils existent, sinon musique procédurale ---------- */
const MUSMAN = { avail: {}, loops: {}, cur: null, src: null, gain: null, buf: {} };
fetch('music/music.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j) { (j.available || []).forEach(k => MUSMAN.avail[k] = 1); MUSMAN.loops = j.loops || {}; } }).catch(() => {});
async function loadTrack(id) {
  if (MUSMAN.buf[id]) return MUSMAN.buf[id];
  const ab = await (await fetch('music/' + id + '.mp3')).arrayBuffer();
  const b = await new Promise((res, rej) => AC.decodeAudioData(ab, res, rej)); MUSMAN.buf[id] = b; return b;
}
function stopFileTrack(fade = .6) {
  if (!MUSMAN.src) return; const g = MUSMAN.gain, s = MUSMAN.src, t = AC.currentTime;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
  setTimeout(() => { try { s.stop(); } catch (e) {} }, fade * 1000 + 60); MUSMAN.src = null;
}
const ONESHOT = { intro: 1, clear: 1, over: 1 };
async function playTrack(id) {
  audio(); if (!AC || MUSMAN.cur === id) return;
  MUSMAN.cur = id;
  if (!MUSMAN.avail[id]) { stopFileTrack(); setProc(id); return; }
  try {
    const b = await loadTrack(id); if (MUSMAN.cur !== id) return;
    setProc(null); stopFileTrack(.5);
    const s = AC.createBufferSource(), g = AC.createGain(), L = MUSMAN.loops[id];
    s.buffer = b; s.loop = !ONESHOT[id]; if (s.loop && L) { s.loopStart = L.loopStart || 0; s.loopEnd = L.loopEnd || b.duration; }
    g.gain.setValueAtTime(0, AC.currentTime); g.gain.linearRampToValueAtTime(.9, AC.currentTime + .35);
    s.connect(g).connect(master); s.start(AC.currentTime + .02); MUSMAN.src = s; MUSMAN.gain = g; if (id === 'intro') CN.audioT0 = AC.currentTime + .02;
  } catch (e) { setProc(id); }
}
function setProc(mode) {
  if (!AC) return; startMusic(); mus.mode = mode; mus.boss = /^boss/.test(mode || '');
  const on = /^(stage|boss)/.test(mode || '') || mode === 'title', t = AC.currentTime;
  mus.g.gain.cancelScheduledValues(t); mus.g.gain.setValueAtTime(mus.g.gain.value, t); mus.g.gain.linearRampToValueAtTime(on ? (mode === 'title' ? .34 : .42) : 0, t + (on ? 1.2 : .4));
  if (introBus && mode !== 'intro') { const b = introBus; b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + .5); setTimeout(() => b.disconnect(), 700); introBus = null; }
  if (mode === 'intro') introScore();
  if (mode === 'clear') { const D = master; [[440, 0], [554, .14], [659, .28], [880, .42]].forEach(([f, a]) => { tone(f, .9, 'sawtooth', .05, 0, a, D); tone(f / 2, 1.2, 'triangle', .07, 0, a, D); }); tone(110, 2.5, 'sine', .25, 0, .42, D); noise(1.4, .12, 5000, .5, 'highpass', .42, D); }
  if (mode === 'over') { tone(220, 1.6, 'triangle', .08, -110, 0, master); tone(165, 2.2, 'triangle', .07, -80, .5, master); tone(55, 2.6, 'sine', .3, -10, .3, master); }
}

/* ---------- Partition procédurale de l'intro, calée sur les plans (46 s) ---------- */
let introBus = null;
function introScore() {
  const D = introBus = AC.createGain(); D.gain.value = 1; D.connect(master);
  const t0 = AC.currentTime + .05;
  const rev = AC.createConvolver(); { const n = AC.sampleRate * 2.6, b = AC.createBuffer(2, n, AC.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4); } rev.buffer = b; }
  const wet = AC.createGain(); wet.gain.value = .5; rev.connect(wet).connect(D);
  const note = (type, f, at, d, v, att = .02, rel = .3, cut = 0, wetSend = 0) => {
    const o = AC.createOscillator(), e = AC.createGain(), T = t0 + at; o.type = type; o.frequency.value = f;
    let n = o; if (cut) { const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); n = fl; }
    e.gain.setValueAtTime(0, T); e.gain.linearRampToValueAtTime(v, T + att); e.gain.setValueAtTime(v, T + Math.max(att, d - rel)); e.gain.linearRampToValueAtTime(0, T + d);
    n.connect(e); e.connect(D); if (wetSend) e.connect(rev); o.start(T); o.stop(T + d + .05); return o;
  };
  const pad = (fs, at, d, v) => fs.forEach(f => { note('sawtooth', f, at, d, v, d * .4, d * .3, 1400, 1); note('sawtooth', f * 1.006, at, d, v * .7, d * .4, d * .3, 1100, 1); });
  const drum = (at, v, f = 180) => { const o = AC.createOscillator(), e = AC.createGain(), T = t0 + at; o.frequency.setValueAtTime(f, T); o.frequency.exponentialRampToValueAtTime(f * .55, T + .25); e.gain.setValueAtTime(v, T); e.gain.exponentialRampToValueAtTime(.001, T + .35); o.connect(e); e.connect(D); e.connect(rev); o.start(T); o.stop(T + .4); };
  const kick = (at, v = .7) => { const o = AC.createOscillator(), e = AC.createGain(), T = t0 + at; o.frequency.setValueAtTime(150, T); o.frequency.exponentialRampToValueAtTime(40, T + .2); e.gain.setValueAtTime(v, T); e.gain.exponentialRampToValueAtTime(.001, T + .4); o.connect(e).connect(D); o.start(T); o.stop(T + .45); };
  const nz2 = (at, d, v, f0, f1, type = 'bandpass', q = 1, attack = .01) => { const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), e = AC.createGain(), T = t0 + at; s.buffer = nz(); s.loop = true; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, T); fl.frequency.exponentialRampToValueAtTime(f1, T + d); e.gain.setValueAtTime(0.0001, T); e.gain.linearRampToValueAtTime(v, T + attack); e.gain.linearRampToValueAtTime(0.0001, T + d); s.connect(fl).connect(e); e.connect(D); e.connect(rev); s.start(T); s.stop(T + d + .05); };
  const boom = (at, v = .8) => { const o = AC.createOscillator(), e = AC.createGain(), T = t0 + at; o.frequency.setValueAtTime(70, T); o.frequency.exponentialRampToValueAtTime(28, T + 1.8); e.gain.setValueAtTime(v, T); e.gain.exponentialRampToValueAtTime(.001, T + 2.6); o.connect(e).connect(D); o.start(T); o.stop(T + 2.7); nz2(at, 2.2, v * .6, 2000, 120, 'lowpass', .7, .005); };
  const A1 = 55, A2 = 110, C3 = 130.81, D3 = 146.83, E3 = 164.81, F2 = 87.31, G2 = 98, A3 = 220, C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392, F3 = 174.61, Gs3 = 207.65;
  // 0–4 : souffle et tambour parlant
  nz2(0, 4.2, .06, 400, 900, 'bandpass', .6, 2); note('sine', A1, 0, 4.4, .18, 2, 1);
  [[.4, .32, 170], [1.3, .26, 190], [1.8, .3, 150], [2.9, .34, 200], [3.35, .3, 175], [3.75, .36, 220]].forEach(([a, v, f]) => drum(a, v, f));
  // 4–9 : la cité, nappe et chœur
  pad([A2, E3, A3, C4], 4, 5.4, .05); note('sine', A1, 4, 5.4, .2, 1.5, 1);
  [A3, C4, E4].forEach((f, i) => note('triangle', f * 2, 5.2 + i * .9, 2.2, .025, .6, 1, 0, 1));
  // 9–13,5 : réacteur vidé, pulsation grave
  pad([F2, C3, A3], 9, 4.8, .05); for (let i = 0; i < 15; i++) note('sawtooth', i % 4 === 3 ? G2 / 2 : A1, 9 + i * .3, .22, .12, .01, .1, 380);
  // 13,5–18 : Nyx, accord sombre et tic-tac
  pad([D3, F3, Gs3], 13.5, 4.8, .05); note('sine', 41.2, 13.5, 4.6, .22, 1.2, 1);
  for (let i = 0; i < 18; i++) nz2(13.5 + i * .25, .05, .04, 7000, 9000, 'highpass', 1, .002);
  nz2(16.6, 1.4, .22, 300, 6000, 'bandpass', 1.2, 1.3);
  // 18 : un quartier tombe
  boom(18, .9); nz2(18, 4.5, .12, 800, 90, 'lowpass', .5, .02); note('sine', A1 / 2, 18, 5, .3, .05, 2);
  // 23–27,5 : les héritiers, le leitmotiv
  pad([A2, E3, A3, C4], 23, 2.3, .05); pad([F2, C3, A3], 25.25, 2.3, .05);
  const mot = [[A3, 1], [C4, .5], [D4, .5], [E4, 2], [G4, .5], [E4, .5], [D4, 1], [C4, 1], [A3, 2]];
  let tt = 23; for (const [f, b] of mot) { note('sawtooth', f, tt, b * .5, .07, .03, .12, 2200, 1); note('square', f / 2, tt, b * .5, .03, .03, .12, 900); tt += b * .5; }
  for (let i = 0; i < 9; i++) drum(23 + i * .5, .22, 120);
  // 27,5–32,5 : montée
  nz2(27.5, 5, .2, 250, 7000, 'bandpass', 1.4, 4.6); const r = note('sawtooth', 110, 27.5, 5, .05, 4.5, .1, 1800, 1); r.frequency.setValueAtTime(110, t0 + 27.5); r.frequency.exponentialRampToValueAtTime(880, t0 + 32.4);
  for (let i = 0; i < 24; i++) { const a = 27.5 + 5 * (1 - Math.pow(1 - i / 24, 1.6)); nz2(a, .08, .05 + i * .006, 1500, 1800, 'bandpass', 1, .003); }
  // 32,5–37,5 : le plongeon, le rythme entre
  for (let i = 0; i < 10; i++) { const a = 32.5 + i * .5; kick(a, .75); if (i % 2) nz2(a, .16, .2, 1600, 1500, 'bandpass', .8, .003); }
  for (let i = 0; i < 40; i++) nz2(32.5 + i * .125, .04, i % 2 ? .03 : .06, 8000, 9000, 'highpass', 1, .002);
  const bl = [A1, A1, G2 / 2, F2 / 2, A1, A1, G2 / 2, G2 / 2, A1, A1]; bl.forEach((f, i) => note('sawtooth', f, 32.5 + i * .5, .45, .16, .01, .2, 600));
  tt = 32.5; for (const [f, b] of mot) { note('sawtooth', f * 2, tt, b * .5, .06, .02, .1, 3200, 1); tt += b * .5; }
  // 37,5 : le titre
  nz2(36.4, 1.1, .25, 400, 9000, 'bandpass', .8, 1.05); boom(37.5, 1);
  pad([A2, E3, A3, C4, E4], 37.5, 8.5, .07); note('sine', A1, 37.5, 8.5, .3, .05, 4);
  [A3 * 2, E4 * 2, C4 * 4].forEach((f, i) => note('triangle', f, 38 + i * .35, 5, .03, .2, 3, 0, 1));
}

/* ---------- Cinématique d'ouverture ---------- */
const SHOTS = [
  { t: 0, d: 4, kind: 'black', ey: '', tx: 'Il y a trois siècles, nos ancêtres ont confié le ciel aux esprits.' },
  { t: 4, d: 5, kind: 'vid', src: 'intro/v1.mp4', img: 'intro/k1.webp', ey: 'Nova-Kemet · 2311', tx: 'Une cité suspendue, portée par les Orishas-machines.', kb: [1.0, 1.08, 0, -.02] },
  { t: 9, d: 4.5, kind: 'img', img: 'intro/k2.webp', ey: 'Le pillage', tx: 'Sombre-Lune les vide, un à un…', kb: [1.16, 1.02, .02, -.03] },
  { t: 13.5, d: 4.5, kind: 'img', img: 'intro/k3.webp', ey: 'Nyx Adébayo · Sombre-Lune', tx: '…pour élever son arche, Ọ̀run-Zéro. Le reste de la cité peut tomber.', kb: [1.04, 1.14, -.04, .02] },
  { t: 18, d: 5, kind: 'vid', src: 'intro/v2.mp4', img: 'intro/k4.webp', flash: 1, shake: 1, ey: 'Cette nuit', tx: 'Le quartier des Tisserands s\'est effondré dans les nuages.', kb: [1.02, 1.12, 0, .02] },
  { t: 23, d: 4.5, kind: 'img', img: 'intro/k5.webp', ey: '', tx: 'Mais les Gardiens ont laissé des héritiers.', names: 1, kb: [1.14, 1.0, 0, .03] },
  { t: 27.5, d: 5, kind: 'vid', src: 'intro/v3.mp4', img: 'intro/k6.webp', bolt: 1, ey: 'Amara Diallo', tx: 'Dernière lame-tempête.', kb: [1.0, 1.1, 0, 0] },
  { t: 32.5, d: 5, kind: 'vid', src: 'intro/v4.mp4', img: 'intro/k7.webp', speed: 1, kb: [1.0, 1.18, .03, .04] },
  { t: 37.5, d: 8.5, kind: 'img', img: 'intro/k8.webp', flash: 1, shake: 1, title: 1, kb: [1.12, 1.0, 0, -.04] },
];
const CINE_LEN = 46;
const CN = { S: SHOTS, len: CINE_LEN, track: 'intro', on: false, t0: 0, shot: -1, raf: 0, parts: [], bolts: [], vids: {}, cb: null, lastT: 0 };
function preloadIntro(list) {
  list = list || SHOTS; const key = list === SHOTS ? 'pre' : 'pre_' + list[1].img; if (CN[key]) return; CN[key] = 1;
  for (const s of list) {
    if (s.img) { const im = new Image(); im.src = s.img; }
    if (s.src) { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto'; v.src = s.src; v.className = 'cvid'; v.onerror = () => { v.dead = 1; }; $('cine').insertBefore(v, $('cfx')); CN.vids[s.src] = v; try { v.load(); } catch (e) {} }
  }
}
function cineNow() { return CN.track === 'intro' && MUSMAN.src && MUSMAN.cur === 'intro' && CN.audioT0 != null ? Math.max(0, AC.currentTime - CN.audioT0) : (performance.now() - CN.t0) / 1000; }
function startIntro(after) { startCine(SHOTS, CINE_LEN, 'intro', after); }
function startCine(list, len, track, after, titleEy) {
  CN.S = list; CN.len = len; CN.track = track; preloadIntro(list); audio();
  $('ctitle').querySelector('.ey').textContent = titleEy || 'Acte I · Les Quartiers suspendus';
  CN.on = true; CN.done = false; CN.cb = after; CN.shot = -1; CN.parts = []; CN.bolts = []; state = 'cine';
  for (const id of ['title', 'story', 'over']) $(id).hidden = true;
  const c = $('cine'); c.hidden = false; c.classList.remove('end');
  $('ctitle').classList.remove('on'); $('cnames').classList.remove('on'); $('ctext').classList.remove('on');
  fitCine(); CN.audioT0 = null; MUSMAN.cur = null; CN.t0 = performance.now(); playTrack(track);
  cancelAnimationFrame(CN.raf); CN.raf = requestAnimationFrame(cineFrame);
}
function endIntro(force) {
  if (!CN.on || (!force && (CN.done || performance.now() - CN.t0 < 1200))) return; CN.on = false; cancelAnimationFrame(CN.raf);
  for (const v of Object.values(CN.vids)) { try { v.pause(); } catch (e) {} v.classList.remove('on'); }
  $('cine').hidden = true; const f = CN.cb; CN.cb = null; if (f) f();
}
function fitCine() { const cv = $('cfx'), st = $('stage'); cv.width = st.clientWidth * Math.min(2, devicePixelRatio || 1); cv.height = st.clientHeight * Math.min(2, devicePixelRatio || 1); }
function setLayer(s, el) {
  el.style.backgroundImage = 'url(' + s.img + ')'; el.dataset.kb = JSON.stringify(s.kb || [1.05, 1, 0, 0]); el.dataset.t = s.t; el.dataset.d = s.d;
}
function enterShot(i) {
  const s = CN.S[i], c = $('cine'); CN.shot = i;
  // calques image en fondu enchaîné
  const a = $('cl0'), b = $('cl1'), front = a.classList.contains('on') ? b : a, back = front === a ? b : a;
  if (s.kind !== 'black') { setLayer(s, front); front.classList.add('on'); back.classList.remove('on'); }
  else { a.classList.remove('on'); b.classList.remove('on'); }
  for (const v of Object.values(CN.vids)) v.classList.remove('on');
  if (s.kind === 'vid') { const v = CN.vids[s.src]; if (v && !v.dead) { try { v.currentTime = 0; const p = v.play(); if (p && p.then) p.then(() => v.classList.add('on')).catch(() => {}); else v.classList.add('on'); } catch (e) {} } }
  if (s.flash) { const f = $('cflash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  if (s.shake) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  if (s.bolt || s.title) for (let k = 0; k < 3; k++) CN.bolts.push({ life: .35 + k * .12, x: .2 + Math.random() * .6 });
  const tx = $('ctext'); tx.classList.remove('on');
  if (s.tx) { setTimeout(() => { if (CN.shot !== i) return; tx.querySelector('.ey').textContent = s.ey || ''; tx.querySelector('p').textContent = s.tx; void tx.offsetWidth; tx.classList.add('on'); }, i === 0 ? 600 : 350); }
  $('cnames').classList.toggle('on', !!s.names);
  if (s.title) $('ctitle').classList.add('on');
}
function cineFrame() {
  if (!CN.on) return;
  const t = cineNow();
  if (t >= CN.len) { $('cine').classList.add('end'); CN.done = true; setTimeout(() => endIntro(true), 900); return; }
  let i = 0; for (let k = 0; k < CN.S.length; k++) if (t >= CN.S[k].t) i = k;
  if (i !== CN.shot) enterShot(i);
  // Ken Burns : échelle et translation interpolées sur la durée du plan
  for (const el of [$('cl0'), $('cl1')]) {
    if (!el.dataset.kb) continue; const [s0, s1, dx, dy] = JSON.parse(el.dataset.kb), p = clamp((t - +el.dataset.t) / +el.dataset.d, 0, 1.2), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const sc = s0 + (s1 - s0) * e; el.style.transform = `translate3d(${dx * e * 100}%,${dy * e * 100}%,0) scale(${sc})`;
  }
  const s = CN.S[i], v = s.kind === 'vid' && CN.vids[s.src];
  if (v && v.classList.contains('on')) { const p = clamp((t - s.t) / s.d, 0, 1); v.style.transform = `scale(${1 + .04 * p})`; }
  drawCineFx(t, s);
  CN.raf = requestAnimationFrame(cineFrame);
}
function drawCineFx(t, s) {
  const cv = $('cfx'), g = cv.getContext('2d'), W = cv.width, H = cv.height, dt = Math.min(.05, (t - (CN.lastT || t)) || .016); CN.lastT = t;
  g.clearRect(0, 0, W, H);
  // braises / poussière d'or, plus denses sur les plans de feu
  const rate = s.title ? 6 : s.kind === 'black' ? 2 : s.speed ? 0 : 3;
  for (let k = 0; k < rate; k++) CN.parts.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - .5) * 30, vy: -(40 + Math.random() * 90) * (H / 540), r: (1 + Math.random() * 2.2) * (H / 540), life: 3 + Math.random() * 3, a: 0, c: Math.random() < .7 ? '255,190,90' : '142,247,255' });
  g.globalCompositeOperation = 'lighter';
  for (const p of CN.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.a = Math.min(1, p.a + dt * 2) * Math.min(1, p.life); g.fillStyle = `rgba(${p.c},${.55 * p.a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
  CN.parts = CN.parts.filter(p => p.life > 0 && p.y > -20);
  // traits de vitesse pendant le plongeon
  if (s.speed) { g.strokeStyle = 'rgba(200,240,255,.35)'; for (let k = 0; k < 14; k++) { const x = Math.random() * W, y = Math.random() * H, l = (60 + Math.random() * 160) * (H / 540); g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * .35, y - l); g.stroke(); } }
  // éclairs
  for (const b of CN.bolts) {
    b.life -= dt; if (b.life <= 0) continue; const a = Math.min(1, b.life * 4);
    let x = b.x * W, y = 0; g.strokeStyle = `rgba(170,240,255,${a})`; g.lineWidth = 3 * (H / 540); g.shadowColor = '#8ef7ff'; g.shadowBlur = 24; g.beginPath(); g.moveTo(x, y);
    while (y < H * .75) { x += (Math.random() - .5) * 70 * (H / 540); y += (20 + Math.random() * 40) * (H / 540); g.lineTo(x, y); } g.stroke(); g.shadowBlur = 0;
  }
  CN.bolts = CN.bolts.filter(b => b.life > 0);
  if (s.bolt && Math.random() < .03) CN.bolts.push({ life: .25, x: Math.random() < .5 ? .1 + Math.random() * .2 : .7 + Math.random() * .2 });
  if (s.title && Math.random() < .015) CN.bolts.push({ life: .2, x: .3 + Math.random() * .4 });
  g.globalCompositeOperation = 'source-over';
}
/* ---------- Cinématiques de fin d'acte ---------- */
function mkCine(rows) {
  let t = 0; const out = rows.map(([kind, n, d, ey, tx, x]) => { const s = Object.assign({ t, d, kind, ey, tx }, x || {}); if (n) { s.img = 'cine/' + n + '.webp'; if (kind === 'vid') s.src = 'cine/' + n + '.mp4'; } t += d; return s; });
  out.len = t + 1; return out;
}
const KB = [[1.0, 1.1, 0, -.02], [1.14, 1.02, .02, -.02], [1.04, 1.14, -.03, .02], [1.12, 1.0, 0, .03]];
const CINES = [
  mkCine([
    ['black', null, 3, 'Acte I accompli', 'Le Marché Haut est libéré.'],
    ['img', 'c1a', 4.5, 'Oba Ferrum', 'Libéré de ses chaînes, l\'esprit de la forge rallume le réacteur.', { kb: KB[0], flash: 1 }],
    ['vid', 'c1b', 5, 'Le Marché Haut', 'Les lanternes se rallument. Les quartiers suspendus respirent à nouveau.', { kb: KB[1] }],
    ['img', 'c1c', 4.5, 'Une voix dans les ondes', 'Nyx Adébayo. L\'ancienne maîtresse d\'armes d\'Amara sert désormais Sombre-Lune.', { kb: KB[2] }],
    ['vid', 'c1d', 5, 'Prochaine étape', 'Les Jardins-Turbines, où l\'esprit Yewa est retenu.', { kb: KB[3] }]
  ]),
  mkCine([
    ['black', null, 3, 'Acte II accompli', 'Le vent souffle de nouveau sur les Jardins.'],
    ['vid', 'c2a', 5, 'Yewa', 'L\'esprit des feuilles et du vent retrouve son souffle.', { kb: KB[0], flash: 1 }],
    ['img', 'c2b', 4.5, 'Amara et Kofi', 'Pour la première fois depuis des semaines, les serres sentent la sève et non le métal.', { kb: KB[1] }],
    ['img', 'c2c', 4.5, 'Ọ̀run-Zéro', 'Mais là-haut, la grande arche de Sombre-Lune est presque chargée.', { kb: KB[2] }],
    ['vid', 'c2d', 5, 'Prochaine étape', 'Pour monter jusqu\'à elle, il faut un dirigeable. Direction les Docks des Nuages.', { kb: KB[3] }]
  ]),
  mkCine([
    ['black', null, 3, 'Acte III accompli', 'Les Docks des Nuages sont tombés.'],
    ['vid', 'c3a', 5, 'Les cales s\'ouvrent', 'Le vaisseau amiral s\'échoue, et des dizaines d\'esprits s\'envolent.', { kb: KB[0], flash: 1, shake: 1 }],
    ['img', 'c3b', 4.5, 'Commandante Ìjì', 'Vaincue, mais pas soumise. Sombre-Lune saura qu\'Amara arrive.', { kb: KB[1] }],
    ['img', 'c3c', 4.5, 'Le journal de bord', 'Une destination revient sans cesse : les Bassins d\'Ọ̀ṣun, sous la cité.', { kb: KB[2] }],
    ['vid', 'c3d', 5, 'Prochaine étape', 'Le vieux cargo de Kofi plonge vers les eaux sacrées.', { kb: KB[3] }]
  ]),
  mkCine([
    ['black', null, 3, 'Acte IV accompli', 'L\'eau chante de nouveau.'],
    ['vid', 'c4a', 5, 'Ọ̀ṣun', 'Le poison se dissout. Les bassins redeviennent clairs et dorés.', { kb: KB[0], flash: 1 }],
    ['img', 'c4b', 4.5, 'La perle de rivière', 'Ọ̀ṣun confie à Amara une perle : « Elle te montrera le vrai chemin. »', { kb: KB[1] }],
    ['vid', 'c4c', 5, 'Nova-Kemet', 'Dans toute la cité, les fontaines retrouvent leur couleur.', { kb: KB[2] }],
    ['img', 'c4d', 4.5, 'Prochaine étape', 'Zuri attend aux Archives d\'Ifá… où quelqu\'un s\'amuse avec les reflets.', { kb: KB[3] }]
  ]),
  mkCine([
    ['black', null, 3, 'Acte V accompli', 'Tous les chemins disent enfin la vérité.'],
    ['vid', 'c5a', 5, 'La salle des miroirs', 'Les miroirs se brisent, et chaque éclat montre la même route.', { kb: KB[0], flash: 1, shake: 1 }],
    ['img', 'c5b', 4.5, 'Ẹ̀ṣù', '« Ton ancienne maîtresse t\'attend, Gardienne. Elle croit encore sauver la cité. »', { kb: KB[1] }],
    ['img', 'c5c', 4.5, 'Les héritiers', 'Kofi, Amara et Zuri, ensemble, face à la Flèche d\'Ọ̀run.', { kb: KB[2], names: 1 }],
    ['vid', 'c5d', 5, 'Dernière étape', 'La passerelle monte jusqu\'au sommet. Ce soir, tout se joue.', { kb: KB[3] }]
  ]),
  mkCine([
    ['black', null, 3, 'Le sommet', 'Ọ̀run-Zéro retient tous les esprits de la cité.'],
    ['img', 'c6a', 4.5, 'Le cœur d\'Ọ̀run-Zéro', 'Amara pourrait le détruire. La cité tomberait avec lui.', { kb: KB[0] }],
    ['vid', 'c6b', 5, 'Le geste juste', 'Alors elle coupe toutes les chaînes, d\'un seul geste.', { kb: KB[1], flash: 1, shake: 1, bolt: 1 }],
    ['vid', 'c6c', 5, 'Libres', 'Les esprits s\'envolent au-dessus de Nova-Kemet.', { kb: KB[2] }],
    ['img', 'c6d', 4.5, 'Nyx Adébayo', '« Tu avais raison, Amara. On ne possède pas un esprit… on le porte. »', { kb: KB[3] }],
    ['vid', 'c6e', 5, 'La descente', 'La cité ne tombe pas. Portée par ses esprits, elle se pose doucement sur les nuages.', { kb: KB[0] }],
    ['img', 'c6f', 4.5, 'Les héritiers', 'Kofi, Amara et Zuri. La famille est réunie.', { kb: KB[1], names: 1 }],
    ['vid', 'c6g', 5, 'Nova-Kemet', 'Ce soir, toute la cité danse.', { kb: KB[2] }],
    ['img', 'c6h', 8, '', '', { kb: [1.12, 1.0, 0, -.03], flash: 1, title: 1 }]
  ])
];
function playEndCine(after) {
  const c = CINES[LV]; if (!c) { after(); return; }
  startCine(c, c.len, 'title', after, LV === LEVELS.length - 1 ? 'Fin · Merci d\'avoir joué' : LEVELS[LV + 1].name);
}
$('cskip').addEventListener('click', e => { e.stopPropagation(); endIntro(true); });
addEventListener('resize', () => { if (CN.on) fitCine(); });

/* ---------- Dialogues : radio (sans pause) et scènes (avec pause) ---------- */
const WHO = { amara: ['Amara', 'face_amara.webp', '#f2b23a'], zuri: ['Zuri', 'face_zuri.webp', '#b07cff'], kofi: ['Kofi', 'face_kofi.webp', '#ff9a4d'], ferrum: ['Oba Ferrum', 'face_ferrum.webp', '#ff7a2f'], nyx: ['Voix inconnue', 'face_nyx.webp', '#9a5cff'], yewa: ['Yewa-Nul', 'face_yewa.webp', '#8ef7c4'], ijji: ['Ìjì', 'face_ijji.webp', '#c58cff'], oshun: ['Ọ̀ṣun', 'face_oshun.webp', '#5fe3e0'], eshu: ['Ẹ̀ṣù', 'face_eshu.webp', '#ff5a4a'], nyx2: ['Nyx', 'face_nyx.webp', '#9a5cff'] };
const TALK = {
  start: [['zuri', 'Amara, je te reçois. La milice a bouclé le Marché Haut. Ouvre-toi un chemin jusqu\'au réacteur.'], ['amara', 'Ils ont choisi le mauvais jour.']],
  enc1: [['zuri', 'Des tireuses dans les ruelles. Quand la ligne violette s\'allume, frappe le tir : il repartira à l\'envoyeur.'], ['zuri', 'Et méfie-toi des brutes à bouclier. De face, elles sont des murs.']],
  enc2: [['kofi', 'Le pont des Vents tient encore. Je renforce les câbles : tiens-les loin de moi, petite sœur !'], ['amara', 'Fais vite, Kofi.']],
  enc3: [['zuri', 'Les prêtresses de Sombre-Lune parlent aux machines comme on parle aux esprits.'], ['amara', 'Alors je vais leur couper la parole.']],
  boss: [['ferrum', 'Gardienne… Ils ont mis des chaînes à mon cœur.'], ['amara', 'Je suis venue les briser, Oba.'], ['ferrum', 'Alors frappe vite… avant que leur volonté ne m\'oblige à t\'écraser.']],
  phase2: [['ferrum', 'ILS M\'ARRACHENT LE CŒUR !'], ['zuri', 'Son armure cède ! Garde tes distances quand il charge, Amara !']],
  win: [['ferrum', 'Libre… Merci, fille d\'Ọya. Les Jardins-Turbines… ils y retiennent Yewa.'], ['nyx', 'Belle démonstration, Amara. Tu as toujours eu le geste juste… et le mauvais camp.'], ['amara', '…Nyx ?'], ['zuri', 'Cette voix… Amara, c\'était ta maîtresse d\'armes ?']],
};
const TALK2 = {
  start: [['kofi', 'Amara, ici Kofi. Les serres sont pleines de faucheuses. Elles moissonnent la sève de Yewa pour Sombre-Lune.'], ['amara', 'Alors on va leur couper l\'herbe sous le pied.']],
  enc1: [['kofi', 'Les faucheuses frappent loin avec leur faucille, mais elles sont lentes à se relever. Passe sous leur garde.'], ['kofi', 'Et ne reste pas dans leurs nuages de spores : ça colle aux bottes.']],
  enc2: [['kofi', 'La galerie des turbines ! Le vent s\'est emballé, les rafales vont te pousser. Accroche-toi !'], ['amara', 'Je sens Yewa… elle souffre.']],
  enc3: [['zuri', 'Amara, Zuri sur la fréquence. Le Nul se concentre au sommet. Yewa ne pourra pas se retenir longtemps.'], ['amara', 'J\'arrive.']],
  boss: [['yewa', 'Gardienne… le vent ne m\'écoute plus… il n\'y a que du vide en moi.'], ['amara', 'Je vais te rendre ton souffle, Yewa.'], ['yewa', 'Alors attrape-moi… si le vent te le permet.']],
  phase2: [['yewa', 'LE NUL ME DÉVORE !'], ['kofi', 'Elle déchaîne la tempête ! Frappe-la quand elle redescend, Amara !']],
  win: [['yewa', 'Mon souffle… il revient. Merci, fille d\'Ọya.'], ['yewa', 'Écoute-moi : Ọ̀run-Zéro est presque chargée. Ils ont vidé trop d\'esprits.'], ['nyx', 'Tu ne fais que retarder l\'inévitable, Amara. Rejoins-moi à la Flèche.'], ['kofi', 'Nyx… Elle t\'attend. Alors on y va ensemble, cette fois.']]
};
const TALK3 = {
  start: [['kofi', 'Les Docks des Nuages ! Mon vieux cargo m\'attend au bout des quais. Ouvre-moi la route, petite sœur.'], ['amara', 'Prépare les moteurs. J\'arrive.']],
  enc1: [['kofi', 'Les harponneurs tirent leur chaîne de loin. Quand le harpon s\'allume, change de ligne !'], ['amara', 'Et s\'ils me ratent, je leur rends la monnaie.']],
  enc2: [['zuri', 'Le croissant violet bombarde les quais ! Regarde le sol : les ombres rouges montrent où ça tombe.'], ['amara', 'Ils tirent sur leurs propres docks…']],
  enc3: [['kofi', 'Le vaisseau amiral d\'Ìjì est à quai. Ses cales sont pleines d\'esprits, je les entends d\'ici.'], ['amara', 'Alors on vide les cales.']],
  boss: [['ijji', 'Une Gardienne sur mon pont ? Il y a une prime sur ta tête, Diallo.'], ['amara', 'Tes cales sont pleines d\'esprits. Ouvre-les.'], ['ijji', 'Ce sont des marchandises. Et toi, tu vas passer par-dessus bord.']],
  phase2: [['ijji', 'FEU À VOLONTÉ ! Rasez-moi ce quai !'], ['kofi', 'Elle bombarde tout ! Reste mobile, Amara !']],
  win: [['ijji', 'Mon vaisseau… Sombre-Lune paiera pour ça. Ou toi.'], ['kofi', 'Les cales s\'ouvrent ! Regarde-les s\'envoler, Amara.'], ['zuri', 'Les registres de bord parlent des Bassins d\'Ọ̀ṣun. Ils empoisonnent l\'eau de toute la cité.'], ['amara', 'Alors on descend sous la ville.']]
};
const TALK4 = {
  start: [['zuri', 'Les Bassins d\'Ọ̀ṣun. Tu sens cette odeur de métal ? C\'est le Nul dans l\'eau.'], ['amara', 'Ọ̀ṣun protégeait ma grand-mère. À moi de la protéger.']],
  enc1: [['zuri', 'Des plongeurs ! Ils disparaissent sous l\'eau et ressortent sous tes pieds. Guette les remous.'], ['amara', 'Je les attends.']],
  enc2: [['kofi', 'Les vannes lâchent ! L\'eau monte : reste sur les passerelles, tu iras plus vite.'], ['amara', 'J\'ai de l\'eau jusqu\'aux genoux, Kofi !']],
  enc3: [['zuri', 'Le grand bassin est juste devant. Ọ̀ṣun est là… mais elle ne te reconnaîtra peut-être pas.'], ['amara', 'Elle me reconnaîtra.']],
  boss: [['oshun', 'Mon eau était douce… pourquoi a-t-elle ce goût de vide ?'], ['amara', 'Ils t\'ont empoisonnée, Ọ̀ṣun. Laisse-moi t\'aider.'], ['oshun', 'Personne ne touche à mes eaux. Personne !']],
  phase2: [['oshun', 'LA CRUE EMPORTERA TOUT !'], ['zuri', 'Le bassin déborde ! Elle réduit l\'arène, Amara, ne te laisse pas acculer !']],
  win: [['oshun', 'L\'eau chante de nouveau… Merci, Gardienne.'], ['oshun', 'Prends cette perle. Zuri t\'attend aux Archives d\'Ifá : quelqu\'un y joue avec les reflets.'], ['nyx', 'Encore un esprit rendu à une cité qui tombe. Tu crois sauver qui, Amara ?'], ['amara', 'Tout le monde, Nyx. Même toi.']]
};
const TALK5 = {
  start: [['zuri', 'Bienvenue aux Archives d\'Ifá. Chaque masque ici garde un chemin. Ne touche à rien… enfin, à presque rien.'], ['amara', 'Je ne touche qu\'aux ennemis.']],
  enc1: [['zuri', 'Des spectres d\'archives ! Ils disparaissent et réapparaissent dans ton dos. Écoute le froissement.'], ['amara', 'Des fantômes qui ont peur des coups de pied ?']],
  enc2: [['zuri', 'Les lampes s\'éteignent ! Reste près des braseros : dans le noir, on ne voit que leurs yeux.'], ['amara', 'Alors je frapperai entre les yeux.']],
  enc3: [['zuri', 'La salle des miroirs. Ẹ̀ṣù y est enfermé. Tant qu\'il est captif, tous les chemins mentent.'], ['amara', 'Je vais lui rendre ses routes.']],
  boss: [['eshu', 'Une visiteuse ! Tous les chemins mènent ici, Gardienne. Lequel est le bon ?'], ['amara', 'Celui qui te libère, Ẹ̀ṣù.'], ['eshu', 'Ha ! Alors trouve-moi d\'abord.']],
  phase2: [['eshu', 'MILLE REFLETS, MILLE MENSONGES !'], ['zuri', 'Il se démultiplie ! Les faux tombent en un coup : cherche celui qui ne se brise pas !']],
  win: [['eshu', 'Bien joué. Les miroirs disent enfin la même chose.'], ['eshu', 'La passerelle mène à la Flèche d\'Ọ̀run. Ton ancienne maîtresse t\'y attend. Elle croit encore sauver la cité.'], ['zuri', 'Amara… je viens avec toi. Kofi aussi.'], ['amara', 'Alors on finit ça ensemble.']]
};
const TALK6 = {
  start: [['kofi', 'Je tiens la base de la tour. Zuri brouille leurs défenses. Le reste, c\'est toi, petite sœur.'], ['amara', 'Merci, grand frère. Garde la porte.']],
  enc1: [['zuri', 'Les Lames-Lune, la garde personnelle de Nyx. Elles parent tes coups : attrape-les ou frappe quand elles relèvent leur garde.'], ['amara', 'C\'est Nyx qui leur a appris ça. C\'est elle qui me l\'a appris aussi.']],
  enc2: [['zuri', 'Tu entres dans l\'ascenseur orbital. Attention, des renforts vont sauter sur la plateforme !'], ['amara', 'Qu\'ils viennent.']],
  enc3: [['zuri', 'Le sommet. Ọ̀run-Zéro est à pleine charge. Nyx est devant le cœur.'], ['amara', 'J\'y suis.']],
  boss: [['nyx2', 'Tu as grandi, Amara. Tu as toujours eu le geste juste.'], ['amara', 'Arrête la machine, Nyx. Les esprits ne sont pas à nous.'], ['nyx2', 'La cité tombe depuis des années. J\'ai choisi de sauver ce qui pouvait l\'être. Montre-moi si ton geste suffit.']],
  phase2: [['nyx2', 'ALORS SOUFFRE COMME J\'AI SOUFFERT !'], ['zuri', 'Elle inverse la gravité ! Fuis le cercle violet, Amara !']],
  win: [['nyx2', '…Tu ne détruis pas la machine ?'], ['amara', 'Non. Je coupe toutes les chaînes à la fois. Les esprits porteront la cité.'], ['kofi', 'Elle descend… doucement. Nova-Kemet se pose sur les nuages !'], ['nyx2', 'Tu avais raison, Amara. On ne possède pas un esprit… on le porte.']]
};
const TALKS = [TALK, TALK2, TALK3, TALK4, TALK5, TALK6];
let radioQ = [], radioT = 0, talkCb = null, talkQ = [], talkTyping = 0;
function radio(lines) { radioQ.push(...lines); }
function radioTick(dt) {
  const el = $('radio');
  if (radioT > 0) { radioT -= dt; if (radioT <= 0) el.classList.remove('on'); return; }
  if (!radioQ.length) return;
  const [who, txt] = radioQ.shift(), W = WHO[who];
  el.querySelector('.rf').style.backgroundImage = 'url(' + W[1] + ')'; el.querySelector('.rn').textContent = W[0]; el.querySelector('.rn').style.color = W[2]; el.querySelector('.rt').textContent = txt;
  el.classList.add('on'); radioT = 1.6 + txt.length * .045; sfx.radio && sfx.radio();
}
function cutscene(lines, cb) {
  talkQ = lines.slice(); talkCb = cb; state = 'talk'; document.body.classList.remove('playing');
  $('radio').classList.remove('on'); $('tip').hidden = true; tipT = 0; $('talk').hidden = false; nextTalk();
}
function nextTalk() {
  if (talkTyping) { clearInterval(talkTyping); talkTyping = 0; $('tt').textContent = $('tt').dataset.full; return; }
  if (!talkQ.length) { $('talk').hidden = true; state = 'play'; document.body.classList.add('playing'); const f = talkCb; talkCb = null; if (f) f(); return; }
  const [who, txt] = talkQ.shift(), W = WHO[who];
  $('tf').style.backgroundImage = 'url(' + W[1] + ')'; $('tn').textContent = W[0]; $('tn').style.color = W[2]; $('talk').style.setProperty('--tc', W[2]);
  const el = $('tt'); el.dataset.full = txt; el.textContent = ''; let i = 0; sfx.radio && sfx.radio();
  talkTyping = setInterval(() => { i += 2; el.textContent = txt.slice(0, i); if (i >= txt.length) { clearInterval(talkTyping); talkTyping = 0; } }, 28);
}
$('talk').addEventListener('pointerdown', e => { e.preventDefault(); nextTalk(); });

/* ---------- Lancement ---------- */
const DPR = Math.min(2, window.devicePixelRatio || 1);
window.GAME = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: Math.round(VW * DPR), height: Math.round(VH * DPR), backgroundColor: '#0b0714',
  scale: { mode: Phaser.Scale.NONE },
  render: { antialias: true, powerPreference: 'high-performance' }, fps: { target: 60 },
  scene: [Play]
});
window.__orun = { get G() { return G; }, get state() { return state; }, inp, INP, join() { NPLAYERS = 2; joinPlayer(G.players[1]); }, dbg: { spawn: (...a) => spawn(...a), enemyGrab: (e, p) => enemyGrab(e, p), takeWeapon: (p, k) => takeWeapon(p, k), hurtPlayer: (...a) => hurtPlayer(...a), tryGrab: p => tryGrab(p), victory: () => victory(), probe: (p, e) => ({ pr: prog(p), clip: p.clip, n: p.frames.length, at: p.at, inF: inFront(p, e, 150, 42), hit: e.hitIds.has(p.atkId), id: p.atkId, fs: p.fps }) }, warp(n) { G.checkpoint = n; retry(); }, cine(n, cb) { const c = CINES[n]; startCine(c, c.len, 'title', cb, n === LEVELS.length - 1 ? 'Fin · Merci d\'avoir joué' : LEVELS[n + 1].name); }, cines: () => CINES.map(c => c.map(s => s.t)), level(n) { CARRY = { score: 0, cont: 2, np: NPLAYERS, players: [] }; G = null; setLevel(n); SC.scene.restart(); } };
})();
