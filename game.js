/* Les Héritiers d'Orun — Acte I. Beat 'em up 2.5D (Phaser 3). */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer:coarse)').matches;
document.body.classList.toggle('touch', touch);
if (touch) $('keys').innerHTML = '<span><b>Joystick</b>8 directions</span><span><b>Frappe</b>combo en 3 coups</span><span><b>Saut</b>+ Frappe en l\'air</span><span><b>Tempête</b>jauge turquoise</span><span><b>Esquive</b>ruée invincible</span>';

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
  gong() { tone(110, 2.5, 'sine', .22, -4); tone(220, 1.8, 'sine', .08); tone(331, 1.3, 'sine', .05); }
};
function startMusic() {
  if (!AC || mus) return;
  const g = AC.createGain(); g.gain.value = 0; g.connect(master); g.gain.linearRampToValueAtTime(.42, AC.currentTime + 2.5);
  const dl = AC.createDelay(); dl.delayTime.value = .27; const fb = AC.createGain(); fb.gain.value = .3; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; dl.connect(lp).connect(fb).connect(dl); lp.connect(g);
  mus = { g, next: AC.currentTime + .2, step: 0, boss: false };
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
    const beat = mus.boss ? .118 : .136;
    while (mus.next < AC.currentTime + .3) {
      const t = mus.next, s = mus.step % 16, bar = Math.floor(mus.step / 16);
      if (s % 4 === 0) kick(t, .55); if (mus.boss && s % 4 === 3 && Math.random() < .5) kick(t, .3);
      if (s % 8 === 4) clap(t, .22); hat(t, s % 2 ? .05 : .09);
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
  amara: { h: 200 }, milicien: { h: 204 }, tireuse: { h: 200 }, chien: { h: 112 }, brute: { h: 246 }, pretresse: { h: 214 }, ferrum: { h: 360 }
};
// zones du décor (coordonnées logiques)
const TILE = 1260, OV = 140, STEP = TILE - OV;
const ZFLOOR = [[334, 530], [334, 530], [342, 404], [342, 404], [314, 530]];
function floorAt(x) {
  const k = clamp(Math.floor(x / STEP), 0, 4), f = (x - k * STEP);
  const a = ZFLOOR[k];
  if (k < 4 && f > STEP - 40) { const b = ZFLOOR[k + 1], t = clamp((f - (STEP - 40)) / (OV + 40), 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  return a;
}
const WORLD_W = TILE * 5 - OV * 4;
// rencontres : bord gauche de l'arène + vagues
const ENC = [
  { L: 140, waves: [['milicien', 'milicien'], ['milicien', 'chien']], props: [[620, 0.55, 'crate'], [820, .85, 'barrel']] },
  { L: 1180, waves: [['tireuse', 'milicien'], ['brute', 'milicien']], props: [[1500, .3, 'crate'], [1900, .7, 'cell'], [1620, .9, 'kiosk']] },
  { L: 2480, waves: [['chien', 'chien', 'tireuse'], ['pretresse', 'milicien']], props: [[2900, .5, 'barrel'], [3200, .5, 'crate']] },
  { L: 3560, waves: [['brute', 'pretresse', 'milicien'], ['chien', 'tireuse', 'milicien', 'milicien']], props: [[3900, .3, 'cell'], [4150, .75, 'crate'], [4300, .4, 'barrel']] },
  { L: WORLD_W - VW, boss: true, props: [[WORLD_W - 820, .3, 'barrel'], [WORLD_W - 180, .8, 'barrel'], [WORLD_W - 500, .9, 'crate']] }
];
const STORY = [
  ['Nova-Kemet · 2311', 'Depuis trois siècles, la cité flotte au-dessus des nuages, portée par les Orishas-machines : des esprits anciens liés à ses réacteurs.'],
  ['Sombre-Lune', 'Le conglomérat Sombre-Lune vide les esprits un à un pour alimenter Orun-Zéro, une arme orbitale. Privés de leurs gardiens, les quartiers suspendus commencent à tomber.'],
  ['Amara Diallo', 'Dernière lame-tempête de la lignée des Gardiens, Amara descend vers le Marché Haut. Au cœur du réacteur, Oba Ferrum, protecteur du quartier, a été enchaîné et retourné contre les siens.']
];
const END = ['Acte I terminé', 'Libéré, le cœur d\'Oba Ferrum s\'apaise. Le colosse murmure : « Les Jardins-Turbines… ils y retiennent Yewa. » Kofi et Zuri attendent Amara aux portes de l\'Acte II.'];

/* ---------- Scène principale ---------- */
let SC = null;   // scène
let G = null;    // état de partie
let state = 'loading', paused = false;
const inp = { x: 0, y: 0, kx: 0, ky: 0, jx: 0, jy: 0, gx: 0, gy: 0, atk: 0, jump: 0, pow: 0, dash: 0, runReq: 0 };

class Play extends Phaser.Scene {
  constructor() { super('play'); }
  preload() {
    const bar = $('lbar');
    this.load.on('progress', v => bar.style.width = Math.round(v * 100) + '%');
    // décor d'abord (léger), puis les planches d'animation ; version allégée sur mobile (≈100 Mo de mémoire graphique au lieu de ≈300)
    this.load.json('stage', 'stage.json'); this.load.json('props', 'props.json'); this.load.json('atlas', ATL.main + '.json');
    for (let i = 0; i < 3; i++) this.load.image('st' + i, 'stage_' + i + '.webp');
    this.load.image('sky', 'st_sky.webp'); this.load.image('fg', 'st_fg.webp'); this.load.image('props', 'props.webp');
    for (let i = 0; i < ATL.mainPages; i++) this.load.image('m' + i, ATL.main + '_' + i + '.webp');
    this.load.on('loaderror', f => { LOADERR.push(f.key); });
  }
  create() {
    SC = this;
    const need = ['atlas', 'stage', 'st0', 'st1', 'st2'].concat(Array.from({ length: ATL.mainPages }, (_, i) => 'm' + i));
    const miss = need.filter(k => !(this.textures.exists(k) || this.cache.json.exists(k)));
    if (miss.length) { $('loading').innerHTML = '<div>Chargement incomplet (' + miss.join(', ') + ')<br><br><button class="go" onclick="location.reload()">Réessayer</button></div>'; return; }
    this.META = {}; regAtlas(this, this.cache.json.get('atlas'), 'm');
    // atlas du boss chargé en arrière-plan pendant que l'on joue
    this.load.json('atlasB', ATL.boss + '.json'); this.load.image('b0', ATL.boss + '_0.webp');
    this.load.once('complete', () => { regAtlas(this, this.cache.json.get('atlasB'), 'b'); BOSS_READY = true; });
    this.load.start();
    const P = this.cache.json.get('props'); this.PROPS = P;
    for (const k in P) { const [x, y, w, h] = P[k]; this.textures.get('props').add(k, 0, x, y, w, h); }
    // textures procédurales pour les effets
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 16); g.generateTexture('dot', 32, 32); g.clear();
    for (let r = 32; r > 0; r -= 2) { g.fillStyle(0xffffff, (1 - r / 32) * .22); g.fillCircle(32, 32, r); } g.generateTexture('glow', 64, 64); g.clear();
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 24, 4); g.generateTexture('streak', 24, 4); g.clear();
    g.lineStyle(6, 0xffffff, 1); g.strokeCircle(64, 64, 58); g.generateTexture('ring', 128, 128); g.clear();
    g.fillStyle(0xffffff, 1); g.beginPath(); g.arc(64, 64, 60, -1.3, 1.3, false); g.arc(52, 64, 48, 1.1, -1.1, true); g.closePath(); g.fillPath(); g.generateTexture('crescent', 128, 128); g.clear();
    g.fillStyle(0x000000, 1); g.fillEllipse(32, 10, 64, 20); g.generateTexture('shadow', 64, 20); g.destroy();

    // décor
    const ST = this.cache.json.get('stage'); let x = 0;
    // ciel : une seule image en parallaxe lente (pas de TileSprite, fragile sur iOS)
    if (this.textures.exists('sky')) { const k = Math.max(VH / 960, (VW + WORLD_W * .1 + 20) / 2240); this.add.image(0, -(960 * k - VH) * .4, 'sky').setOrigin(0).setScale(k).setScrollFactor(.1).setDepth(-20); }
    for (let i = 0; i < ST.parts.length; i++) { const im = this.add.image(x, 0, 'st' + i).setOrigin(0).setScale(1 / ST.scale).setDepth(-10); x += im.displayWidth; }
    // premier plan : copies juxtaposées en parallaxe rapide
    if (this.textures.exists('fg')) { const k = VH / 960, w = 2240 * k; for (let i = 0; i * w < WORLD_W * 1.3 + VW; i++) this.add.image(i * w, 0, 'fg').setOrigin(0).setScale(k).setScrollFactor(1.3).setDepth(9000).setAlpha(.9); }
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
    this.scale.on('resize', () => this.applyZoom());
    $('loading').hidden = true; state = 'title';
    $('title').style.backgroundImage = 'linear-gradient(90deg,rgba(11,7,20,.92) 0%,rgba(11,7,20,.55) 46%,rgba(11,7,20,.1) 75%),url(st_sky.webp)';
    $('pFace').style.backgroundImage = 'url(face_amara.webp)'; $('bFace').style.backgroundImage = 'url(face_ferrum.webp)';
    $('best').textContent = best ? 'Record ' + String(best).padStart(6, '0') : '';
    $('title').hidden = false;
    newGame(true);
  }
  applyZoom() { this.cameras.main.setZoom(this.scale.width / VW); }
  update(time, delta) { tick(Math.min(delta, 50) / 1000); }
}

let BOSS_READY = false; const LOADERR = [];
const LITE = touch || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const ATL = LITE ? { main: 'atlas_mmain', mainPages: 2, boss: 'atlas_mboss' } : { main: 'atlas_main', mainPages: 3, boss: 'atlas_boss' };
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
function setClip(a, clip, fps, loop, onEnd) {
  if (a.clip === clip && a.loop && loop) return;
  const C = SC.META[a.kind].clips; if (!C[clip]) clip = C.idle ? 'idle' : Object.keys(C)[0];
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
  a.spr.setPosition(a.x, a.y - a.z - (a.hover || 0)).setDepth(a.y + (a.dz || 0));
  a.sh.setPosition(a.x, a.y + 2).setDepth(3).setScale(a.shW * (1 - Math.min(.5, a.z / 300)), 1).setAlpha(.38 * (1 - Math.min(.6, a.z / 300)));
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
  G = { demo, t: 0, cam: 0, camMin: 0, lock: null, enc: 0, wave: 0, score: 0, combo: 0, comboT: 0, hitstop: 0, ts: 1, tsT: 1, all: [], en: [], props: [], items: [], shots: [], rings: [], beams: [], boss: null, ended: false, checkpoint: 0, kills: 0, tokens: 0, buff: null, buffT: 0, goT: 0, timers: [], lives: 3, cont: 2, zoneTint: 0xffffff };
  const p = actor('amara', 220, 430, 1); p.hp = p.max = 100; p.en = 40; p.st = 'idle'; p.combo = 0; p.buffer = 0; p.dashCd = 0; p.air = false; p.airAtk = false; p.atkId = 0; p.runT = 0; p.run = false; p.grabCd = 0;
  setClip(p, 'idle', 14, true); G.p = p; G.all.push(p);
  for (const e of ENC) for (const [x, f, k] of e.props) addProp(k, x, f);
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
  ferrum: { hp: 660, spd: 55, pts: 10000 }
};
function spawn(kind, side) {
  const cam = G.lock ? G.lock : G.cam, fl = floorAt(cam + VW / 2);
  const x = side > 0 ? cam + VW + 60 : cam - 60, y = rnd(fl[0] + 10, fl[1] - 10);
  const e = actor(kind, x, y, -side); const D = ENEMY[kind];
  e.hp = e.max = D.hp; e.spd = D.spd; e.cd = rnd(.6, 1.4); e.st = 'enter'; e.side = side; e.enterX = side > 0 ? cam + VW - rnd(120, 260) : cam + rnd(120, 260);
  if (kind === 'brute') e.shield = e.shieldMax = 70;
  if (kind === 'pretresse') { e.hover = 14; e.tpT = rnd(3, 5); e.sigilT = rnd(2, 4); }
  setClip(e, kind === 'pretresse' ? 'idle' : kind === 'tireuse' ? 'roll' : 'walk', kind === 'chien' ? 30 : kind === 'tireuse' ? 18 : 24, kind !== 'tireuse');
  G.en.push(e); G.all.push(e); return e;
}
function spawnBoss() {
  const L = G.lock;
  const e = actor('ferrum', L + VW + 140, (floorAt(L + 600)[0] + floorAt(L + 600)[1]) / 2, -1);
  e.hp = e.max = ENEMY.ferrum.hp; e.spd = ENEMY.ferrum.spd; e.st = 'bossEnter'; e.phase = 1; e.cd = 2; e.boss = true; e.dz = 2;
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

/* ---------- Combat ---------- */
// boîte de coup : portée devant, tolérance de profondeur, hauteur
function inFront(a, b, reach, depth, back) {
  const dx = (b.x - a.x) * a.face; return dx > -(back || 20) && dx < reach && Math.abs(b.y - a.y) < depth && Math.abs((b.z || 0) - a.z) < 110;
}
function hitEnemy(e, dmg, kind, src) {
  if (e.dead || e.st === 'tpout' || e.inv > 0) return false;
  const p = G.p, fromFront = Math.sign(src.x - e.x) === e.face;
  // bouclier de la prêtresse
  if (e.sigil > 0) { e.sigil -= dmg; sfx.block(); SC.pViolet.explode(10, e.x, e.y - 120); floatTxt(e.x, e.y - 200, 'SCEAU', '#b07cff'); if (e.sigil <= 0) { e.bub && e.bub.destroy(); e.bub = null; } hitstop(.04); return true; }
  // garde du milicien
  if (e.kind === 'milicien' && e.st === 'block' && fromFront && kind !== 'heavy' && kind !== 'power') { sfx.block(); SC.pSpark.explode(10, e.x + e.face * 30, e.y - 120); floatTxt(e.x, e.y - 210, 'BLOQUÉ', '#ffd36b'); e.x -= e.face * 10; hitstop(.03); return true; }
  // bouclier de la brute
  if (e.kind === 'brute' && e.shield > 0 && fromFront && kind !== 'power') {
    e.shield -= dmg * (kind === 'heavy' ? 1.6 : 1); sfx.block(); SC.pViolet.explode(14, e.x + e.face * 50, e.y - 130); hitstop(.04); e.x -= e.face * 6;
    if (e.shield <= 0) { e.atk = false; e.st = 'break'; e.t = 0; setClip(e, 'break', 16, false, () => knock(e, 0)); sfx.shatter(); shake(220, .008); floatTxt(e.x, e.y - 240, 'BOUCLIER BRISÉ', '#b07cff', true); }
    return true;
  }
  let m = 1;
  if (e.boss) { if (e.phase === 1 && kind !== 'power' && kind !== 'object' && kind !== 'heavy') m = .55; if (e.st === 'kneel') m = 1.6; if (e.phase === 2) m *= 1.1; }
  if (e.kind === 'brute' && e.st === 'down') m = 1.5;
  const d = Math.round(dmg * m * (G.buff === 'spear' ? 1.4 : 1));
  e.hp -= d; e.flash = .09; e.atk = false; G.combo++; G.comboT = 2.2; p.en = Math.min(100, p.en + 4);
  G.score += d * 10 * Math.min(5, 1 + Math.floor(G.combo / 5));
  floatTxt(e.x + rnd(-14, 14), e.y - CHAR[e.kind].h * .9 - e.z, String(d), m > 1 ? '#ffd36b' : '#fff');
  // la prêtresse perd ses sceaux posés quand on la frappe
  if (e.kind === 'pretresse') for (const o of G.en) if (o.sigilFrom === e) { o.sigil = 0; o.bub && o.bub.destroy(); o.bub = null; }
  if (e.hp <= 0) { kill(e, src); return true; }
  if (e.boss) { bossCrack(e); if (e.phase === 1 && e.hp <= e.max * .5) phase2(e); updBoss(); return true; }
  const big = kind === 'heavy' || kind === 'power' || kind === 'object' || G.buff === 'hammer';
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
  e.dead = true; e.atk = false; e.hp = 0; G.kills++; if (G.p.grabE === e) releaseGrab(G.p); const D = ENEMY[e.kind]; G.score += D.pts * Math.min(5, 1 + Math.floor(G.combo / 5)); G.p.en = Math.min(100, G.p.en + 12);
  e.bub && e.bub.destroy();
  if (e.boss) return bossDeath(e);
  e.st = 'dying'; e.t = 0; const dir = Math.sign(e.x - src.x) || 1; e.vx = dir * 300; e.vz = 420; e.z = Math.max(1, e.z);
  setClip(e, 'fall', 22, false); hitstop(.09); shake(160, .006);
  // dernier ennemi de la dernière vague : ralenti
  const left = G.en.filter(o => !o.dead).length;
  if (left === 0 && G.lock && !ENC[G.enc].boss && G.wave >= ENC[G.enc].waves.length - 1) { G.tsT = .25; later(.65, () => G.tsT = 1, true); SC.cameras.main.flash(120, 255, 240, 220); }
}
function hitstop(s) { G.hitstop = Math.max(G.hitstop, s); }
function hurtPlayer(dmg, src, heavy) {
  const p = G.p; if (p.inv > 0 || p.st === 'dead' || p.st === 'power' || p.st === 'dash' || G.ended) return false;
  if (p.st === 'grab') releaseGrab(p);
  p.hp -= dmg; G.combo = 0; sfx.hurt(); sfx.hit(); shake(180, .009); hitstop(.07); p.flash = .1;
  SC.pSpark.explode(12, p.x, p.y - 120 - p.z);
  if (p.hp <= 0) { p.hp = 0; p.st = 'dead'; p.vx = Math.sign(p.x - src.x) * 200; p.vz = 360; p.z = Math.max(1, p.z); setClip(p, 'fall', 20, false); G.tsT = .35; G.lives--; later(1.6, () => { G.tsT = 1; if (G.lives > 0) respawn(p); else showOver(); }, true); updHUD(); return true; }
  if (heavy || p.z > 0) { p.st = 'fall'; p.t = 0; p.vx = (Math.sign(p.x - src.x) || -p.face) * 240; p.vz = 340; p.z = Math.max(p.z, 1); setClip(p, 'fall', 24, false); }
  else { p.st = 'hurt'; p.t = 0; p.inv = Math.max(p.inv, .45); setClip(p, 'hurt', 22, false, () => { if (p.st === 'hurt') toIdle(p); }); p.x += (Math.sign(p.x - src.x) || -p.face) * 14; }
  updHUD(); return true;
}

function respawn(p) {
  p.hp = p.max; p.en = Math.max(p.en, 50); p.z = 0; p.vx = p.vy = 0; p.inv = 2.6; p.st = 'getup'; setClip(p, 'getup', 22, false, () => p.st === 'getup' && toIdle(p));
  sfx.storm(); shake(300, .012); SC.cameras.main.flash(220, 160, 250, 255); ringFx(p.x, p.y, 0x8ef7ff, 320, 600, true); glowFx(p.x, p.y - 100, 0x8ef7ff, 7, 600);
  for (const e of G.en) if (!e.dead && !e.boss && Math.abs(e.x - p.x) < 340) knock(e, Math.sign(e.x - p.x) || 1);
  floatTxt(p.x, p.y - 240, 'AMARA SE RELÈVE', '#8ef7ff', true); updHUD();
}
/* ---------- Joueur ---------- */
function toIdle(p) { p.st = 'idle'; p.combo = 0; setClip(p, 'idle', 14, true); }
const ATK = {
  atk1: { fps: 30, win: [.3, .7], reach: 150, dmg: 9, lunge: 30, kind: 'light' },
  atk2: { fps: 30, win: [.25, .75], reach: 160, dmg: 11, lunge: 40, kind: 'light' },
  atk3: { fps: 30, win: [.45, .85], reach: 190, dmg: 18, lunge: 60, kind: 'heavy' },
  airAtk: { fps: 26, win: [.15, .9], reach: 160, dmg: 15, lunge: 0, kind: 'heavy' },
  dash: { fps: 30, win: [.1, .75], reach: 170, dmg: 13, lunge: 0, kind: 'heavy' }
};
function startAtk(p, clip) {
  if (inp.x && clip !== 'dash') p.face = Math.sign(inp.x); // coup arrière : on se retourne en frappant
  p.st = clip; p.t = 0; p.atkId++; sfx.swing(); const A = ATK[clip];
  setClip(p, clip, A.fps * (G.buff === 'hammer' ? .85 : 1), false, () => { if (p.st === clip) { if (p.buffer && clip !== 'atk3' && clip !== 'airAtk' && clip !== 'dash') { p.buffer = 0; startAtk(p, clip === 'atk1' ? 'atk2' : 'atk3'); } else toIdle(p); } });
  p.fx = false;
}
function playerUpdate(p, dt) {
  const mvx = inp.x, mvy = inp.y;
  p.inv = Math.max(0, p.inv - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.flash = Math.max(0, p.flash - dt); p.grabCd = Math.max(0, p.grabCd - dt);
  if (p.st === 'grab') { grabUpdate(p, dt); return; }
  const fl = floorAt(p.x);
  const grounded = p.z <= 0;
  if (p.st === 'dead') { physics(p, dt); return; }
  // entrées
  if (inp.pow) {
    inp.pow = 0; const ok = grounded && ['idle', 'walk', 'atk1', 'atk2', 'atk3', 'hurt', 'land'].includes(p.st);
    if (ok && p.en >= 50) { p.en -= 50; power(p); }
    else if (ok && p.hp > 20) { p.hp -= 15; floatTxt(p.x, p.y - 250, 'SACRIFICE −15', '#ff5a6e', true); power(p); } // Tempête désespérée : coûte de la vie
    else if (ok) floatTxt(p.x, p.y - 230, 'TROP FAIBLE', '#ff5a6e');
  }
  if (inp.dash) { inp.dash = 0; if (p.dashCd <= 0 && grounded && ['idle', 'walk', 'atk1', 'atk2', 'land'].includes(p.st)) { if (mvx) p.face = Math.sign(mvx); p.st = 'dash'; p.t = 0; p.inv = .35; p.dashCd = .75; p.atkId++; sfx.dash(); setClip(p, 'dash', 30, false, () => p.st === 'dash' && toIdle(p)); } }
  if (inp.jump) { inp.jump = 0; if (grounded && ['idle', 'walk', 'land'].includes(p.st)) { p.st = 'air'; p.vz = 640; p.z = 1; p.airAtk = false; sfx.jump(); SC.pDust.explode(6, p.x, p.y); setClip(p, 'jumpUp', 14, false); } }
  if (inp.atk) {
    inp.atk = 0;
    if (p.st === 'walk' && p.run) { p.st = 'dash'; p.t = 0; p.atkId++; p.run = false; p.runT = 0; sfx.dash(); setClip(p, 'dash', 30, false, () => p.st === 'dash' && toIdle(p)); } // coup en course
    else if (p.st === 'idle' || p.st === 'walk' || p.st === 'land') startAtk(p, 'atk1');
    else if ((p.st === 'atk1' || p.st === 'atk2') && prog(p) > .35) p.buffer = 1;
    else if (p.st === 'air' && !p.airAtk) { p.airAtk = true; p.st = 'airAtk'; p.atkId++; sfx.swing(); setClip(p, 'airAtk', 26, false); }
  }
  // états
  if (p.st === 'idle' || p.st === 'walk') {
    if (mvx || mvy) {
      // course : double tape clavier, ou direction horizontale maintenue 0,5 s
      if (mvx && Math.sign(mvx) === p.face) p.runT += dt; else p.runT = 0;
      if (inp.runReq && mvx) p.run = true; if (p.runT > .5) p.run = true; if (!mvx) p.run = false;
      const sp = p.run ? 1.65 : 1;
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
    p.vx = p.st === 'dash' ? p.face * (pr < .7 ? 720 : 120) : (pr < .4 ? p.face * A.lunge * 3 : 0); p.vy = 0;
    if (p.st === 'dash' && pr < .7 && Math.random() < .6) SC.pBolt.explode(2, p.x - p.face * 30, p.y - 100);
  } else if (p.st === 'hurt' || p.st === 'land' || p.st === 'power' || p.st === 'getup') { p.vx = 0; p.vy = 0; }
  // coups portés
  const A = ATK[p.st];
  if (A) {
    const pr = prog(p);
    if (pr >= A.win[0] && !p.fx) { p.fx = true; slashFx(p.x + p.face * 90, p.y - 115 - p.z, p.face, G.buff === 'hammer' ? 0xffa040 : 0x9ff6ff, p.st === 'atk3' ? 1.25 : .95); if (p.st === 'atk3') { sfx.zap(); SC.pBolt.explode(14, p.x + p.face * 100, p.y - 100); } }
    if (pr >= A.win[0] && pr <= A.win[1]) {
      const reach = A.reach * (G.buff === 'spear' ? 1.4 : 1);
      for (const e of G.en) if (!e.dead && !e.hitIds.has(p.atkId) && inFront(p, e, reach + (e.boss ? 60 : 0), e.boss ? 70 : 42)) {
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
  if (a.z > 0 || a.vz > 0) { a.vz -= 1900 * dt; a.z += a.vz * dt; if (a.z <= 0) { a.z = 0; a.vz = 0; if (a.st === 'fall' || a.st === 'dying' || a.st === 'dead') a.vx *= .35; } }
  else if (a.st === 'fall' || a.st === 'dying' || a.st === 'dead') a.vx *= Math.pow(.02, dt);
}
function power(p) {
  p.st = 'power'; p.t = 0; p.inv = 1.2; p.vx = p.vy = 0; sfx.charge(); updHUD();
  setClip(p, 'power', 24, false, () => p.st === 'power' && toIdle(p));
  later(.56, () => {
    if (G.p !== p) return;
    sfx.storm(); shake(380, .014); SC.cameras.main.flash(160, 160, 250, 255); hitstop(.12);
    ringFx(p.x, p.y, 0x8ef7ff, 300, 520, true); ringFx(p.x, p.y - 110, 0xffffff, 160, 320); glowFx(p.x, p.y - 100, 0x8ef7ff, 7, 500);
    SC.pBolt.explode(60, p.x, p.y - 100);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; bolt(p.x, p.y - 110, p.x + Math.cos(a) * 280, p.y - 110 + Math.sin(a) * 140); }
    for (const e of G.en) if (!e.dead && Math.abs(e.x - p.x) < 300 && Math.abs(e.y - p.y) < 120) { hitEnemy(e, 34, 'power', p); SC.pBolt.explode(10, e.x, e.y - 100); }
    for (const o of G.props) if (!o.dead && Math.abs(o.x - p.x) < 300 && Math.abs(o.y - p.y) < 120) hitProp(o, p, 'power');
  });
}

/* ---------- Prise & projection ---------- */
const GRABBABLE = { milicien: 1, tireuse: 1, brute: 1 };
function tryGrab(p) {
  if (p.grabCd > 0 || p.z > 0 || !inp.x) return;
  for (const e of G.en) {
    if (e.dead || !GRABBABLE[e.kind] || e.z > 0 || e.inv > 0 || e.sigil > 0) continue;
    if (!['think', 'hurt', 'block', 'enter'].includes(e.st)) continue;
    if (e.kind === 'brute' && e.shield > 0) continue;
    const dx = (e.x - p.x) * p.face;
    if (dx > 20 && dx < 78 && Math.abs(e.y - p.y) < 18) {
      p.st = 'grab'; p.t = 0; p.knees = 0; p.grabE = e; p.vx = p.vy = 0; p.run = false;
      e.st = 'grabbed'; e.atk = false; e.vx = e.vy = 0; e.face = -p.face; e.t = 0;
      setClip(e, 'hurt', .001, false); setClip(p, 'atk1', .001, false); p.at = 1;
      sfx.block(); floatTxt(p.x, p.y - 230, 'PRISE', '#ffd36b'); tip('grab');
      return;
    }
  }
}
function releaseGrab(p) {
  const e = p.grabE; p.grabE = null; p.grabCd = .5;
  if (e && !e.dead && e.st === 'grabbed') { e.st = 'think'; e.cd = .5; e.x -= e.face * 0; setClip(e, 'idle', 10, true); }
  if (p.st === 'grab') toIdle(p);
}
function grabUpdate(p, dt) {
  const e = p.grabE; p.t += dt; p.vx = p.vy = 0; inp.pow = inp.dash = 0;
  if (!e || e.dead) { releaseGrab(p); return; }
  e.x = p.x + p.face * 62; e.y = p.y + 1; e.z = 0;
  if (p.t > 1.8) { floatTxt(e.x, e.y - 220, 'DÉGAGÉ', '#ff5a6e'); e.x += p.face * 30; releaseGrab(p); return; }
  if (inp.jump || (inp.atk && inp.x && Math.sign(inp.x) !== p.face)) { inp.jump = inp.atk = 0; throwE(p, e, inp.x && Math.sign(inp.x) !== p.face ? -p.face : p.face); return; }
  if (inp.atk) {
    inp.atk = 0; p.knees++; p.t = Math.min(p.t, .9); sfx.swing();
    const last = p.knees >= 3;
    setClip(p, last ? 'atk3' : 'atk2', last ? 34 : 44, false, () => { if (p.st === 'grab') { setClip(p, 'atk1', .001, false); p.at = 1; } });
    later(.08, () => {
      if (p.st !== 'grab' || p.grabE !== e || e.dead) return;
      e.inv = 0; const wasSt = e.st; e.st = 'think';
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
  setClip(p, 'atk3', 32, false, () => p.st === 'grab' && toIdle(p));
  e.st = 'thrown'; e.t = 0; e.face = -dir; e.vx = dir * 600; e.vz = 420; e.z = 30; e.thrHit = new Set();
  setClip(e, 'fall', 22, false); floatTxt(p.x, p.y - 230, 'PROJECTION', '#ffd36b');
  later(.25, () => p.st === 'grab' && toIdle(p));
}
function thrownUpdate(e, dt) {
  physics(e, dt);
  for (const o of G.en) if (o !== e && !o.dead && !o.boss && !e.thrHit.has(o.id) && Math.abs(o.x - e.x) < 70 && Math.abs(o.y - e.y) < 34) {
    e.thrHit.add(o.id); hitEnemy(o, 18, 'object', e); SC.pSpark.explode(14, o.x, o.y - 100); sfx.heavy(); shake(140, .008);
  }
  if (G.boss && !G.boss.dead && !e.thrHit.has('b') && Math.abs(G.boss.x - e.x) < 110 && Math.abs(G.boss.y - e.y) < 50) { e.thrHit.add('b'); hitEnemy(G.boss, 22, 'object', e); }
  const L = G.lock != null ? G.lock : G.cam; e.x = clamp(e.x, L + 30, L + VW - 30);
  if (e.z <= 0 && e.t > .15) {
    e.hp -= 16; e.flash = .1; shake(200, .01); sfx.boom(); SC.pDust.explode(14, e.x, e.y); floatTxt(e.x, e.y - 120, '16', '#ffd36b'); G.score += 300;
    if (e.hp <= 0) kill(e, { x: e.x - e.vx }); else { e.st = 'down'; e.t = 0; e.vx = 0; setClip(e, 'down', 8, true); }
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
    if (kind === 'heavy' || kind === 'power') { o.rolling = 1.4; o.vx = dir * 820; o.armed = 0; sfx.heavy(); floatTxt(o.x, o.y - 120, 'BOULET !', '#8ef7ff'); }
    else { o.x += dir * 18; o.spr.x = o.x; sfx.block(); }
    return;
  }
  if (o.kind === 'cell') { if (!o.armed) { o.armed = 1.1; sfx.charge(); floatTxt(o.x, o.y - 120, 'SURCHARGE', '#8ef7ff'); } return; }
  o.hp--; sfx.break(); SC.pSpark.explode(8, o.x, o.y - 50); o.spr.x += dir * 4;
  if (o.hp <= 0) breakProp(o);
}
function breakProp(o) {
  o.dead = true; SC.pFire.explode(12, o.x, o.y - 40); SC.pDust.explode(10, o.x, o.y);
  SC.tweens.add({ targets: o.spr, alpha: 0, scaleY: o.spr.scaleY * .3, duration: 220, onComplete: () => o.spr.destroy() });
  if (o.kind === 'kiosk') { G.score += 500; floatTxt(o.x, o.y - 150, '+500', '#ffd36b'); return; }
  const roll = Math.random(), it = roll < .4 ? 'plate' : roll < .7 ? 'fruit' : roll < .85 ? 'spear' : 'hammer';
  const spr = SC.add.image(o.x, o.y, 'props', it).setOrigin(.5, .9).setScale(it === 'plate' ? .28 : it === 'fruit' ? .2 : .32).setDepth(o.y);
  G.items.push({ kind: it, x: o.x, y: o.y, spr, t: 0 });
}
function explode(x, y, r, dmg) {
  sfx.boom(); shake(320, .016); SC.cameras.main.flash(100, 255, 220, 160);
  ringFx(x, y, 0xffb347, r, 450, true); glowFx(x, y - 60, 0xff8a3d, 6, 420); SC.pFire.explode(40, x, y - 40);
  for (const e of G.en) if (!e.dead && Math.abs(e.x - x) < r && Math.abs(e.y - y) < r * .45) hitEnemy(e, dmg, 'object', { x, face: 1 });
  const p = G.p; if (Math.abs(p.x - x) < r * .8 && Math.abs(p.y - y) < r * .4) hurtPlayer(Math.round(dmg * .5), { x }, true);
  for (const o of G.props) if (!o.dead && o.kind !== 'barrel' && Math.abs(o.x - x) < r && Math.abs(o.y - y) < r * .45) breakProp(o);
}
function propsUpdate(dt) {
  for (const o of G.props) {
    if (o.dead) continue;
    if (o.armed > 0) { o.armed -= dt; o.spr.setTint(Math.floor(o.armed * 12) % 2 ? 0xffffff : 0x8ef7ff); if (o.armed <= 0) { o.dead = true; o.spr.destroy(); explode(o.x, o.y, 210, 40); } }
    if (o.rolling > 0) {
      o.rolling -= dt; o.x += o.vx * dt; o.spr.x = o.x; o.spr.angle += o.vx * dt * .6;
      if (Math.random() < .5) SC.pDust.explode(1, o.x, o.y);
      for (const e of G.en) if (!e.dead && Math.abs(e.x - o.x) < 60 && Math.abs(e.y - o.y) < 40) { hitEnemy(e, 26, 'object', { x: o.x - o.vx, face: Math.sign(o.vx) }); o.rolling = 0; }
      const L = G.lock != null ? G.lock : G.cam;
      if (o.rolling <= 0 || o.x < L - 40 || o.x > L + VW + 40) { o.dead = true; o.spr.destroy(); explode(o.x, o.y, 150, 24); }
    }
  }
  const p = G.p;
  for (const it of G.items) {
    if (it.dead) continue; it.t += dt; it.spr.y = it.y - 6 - Math.sin(it.t * 4) * 5;
    if (Math.abs(it.x - p.x) < 50 && Math.abs(it.y - p.y) < 34 && p.z < 30) {
      it.dead = true; it.spr.destroy(); sfx.pick(); glowFx(it.x, it.y - 40, 0xffd36b, 3, 300);
      if (it.kind === 'plate') { p.hp = Math.min(p.max, p.hp + 40); floatTxt(p.x, p.y - 220, '+40 VIE', '#7dffa8'); }
      if (it.kind === 'fruit') { p.en = Math.min(100, p.en + 50); floatTxt(p.x, p.y - 220, '+50 ÉNERGIE', '#8ef7ff'); }
      if (it.kind === 'spear') { G.buff = 'spear'; G.buffT = 14; floatTxt(p.x, p.y - 220, 'LANCE D\'ORUN', '#8ef7ff', true); }
      if (it.kind === 'hammer') { G.buff = 'hammer'; G.buffT = 14; floatTxt(p.x, p.y - 220, 'MARTEAU-FORGE', '#ffb347', true); }
      updHUD();
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
  const p = G.p; e.t += dt; e.cd -= dt; e.flash = Math.max(0, e.flash - dt); e.inv = Math.max(0, e.inv - dt);
  if (e.sigil > 0) { e.sigilT2 -= dt; if (e.sigilT2 <= 0) { e.sigil = 0; e.bub && e.bub.destroy(); e.bub = null; } }
  if (e.bub) e.bub.setPosition(e.x, e.y - CHAR[e.kind].h * .5 - e.z).setDepth(e.y + 1);
  if (e.boss) { bossUpdate(e, dt); physics(e, dt); if (e.st !== 'bossEnter' && G.lock != null) { e.x = clamp(e.x, G.lock + 105, G.lock + VW - 105); const f = floorAt(e.x); e.y = clamp(e.y, f[0] + 10, f[1]); } return; }
  const fl = floorAt(e.x);
  if (e.st === 'dying') { physics(e, dt); if (e.z <= 0 && e.t > .3) { e.st = 'gone'; e.t = 0; if (e.kind !== 'pretresse') setClip(e, 'down', 8, true); } return; }
  if (e.st === 'grabbed') { e.vx = e.vy = 0; return; }
  if (e.st === 'thrown') { thrownUpdate(e, dt); return; }
  if (e.st === 'gone') { e.spr.setAlpha(Math.max(0, 1 - e.t / .9)); if (Math.floor(e.t * 14) % 2) e.spr.setAlpha(.2); if (e.t > .9) { e.remove = true; } return; }
  if (e.st === 'fall') { physics(e, dt); if (e.z <= 0 && e.t > .25) { e.st = 'down'; e.t = 0; shake(90, .004); SC.pDust.explode(8, e.x, e.y); setClip(e, 'down', 8, true); } return; }
  if (e.st === 'down') {
    e.vx = 0; if (e.t > (e.kind === 'brute' ? 2.2 : 1)) {
      if (e.kind === 'milicien') { e.st = 'getup'; e.inv = .5; setClip(e, 'getup', 14, false, () => { e.st = 'think'; e.cd = .5; }); }
      else if (e.kind === 'tireuse') { e.st = 'getup'; e.inv = .5; setClip(e, 'rise', 18, false, () => { e.st = 'think'; e.cd = .4; }); }
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
  milicien(e, p, dt) {
    if (e.st === 'atk') { e.vx = e.vy = 0; return; }
    if (e.st === 'block') { e.vx = e.vy = 0; if (e.t > .7) { e.st = 'think'; e.cd = .2; } return; }
    face(e, p);
    // parade si le joueur frappe de face
    if (['atk1', 'atk2'].includes(p.st) && Math.abs(p.x - e.x) < 190 && Math.abs(p.y - e.y) < 50 && Math.random() < dt * 2.2 && e.cd < .6) { e.st = 'block'; e.t = 0; e.vx = e.vy = 0; setClip(e, 'block', 18, false); return; }
    const want = canAttack(e) || e.atk;
    const tx = p.x - e.face * (want ? 110 : 240 + (e.slot || 0)), ty = p.y + (want ? 0 : (e.side || 1) * 40);
    const arrived = moveTo(e, tx, ty, e.spd, dt); walkAnim(e, !arrived, 24);
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
    if (e.st === 'aim') { e.vx = e.vy = 0; e.aimT -= dt; e.aimY = e.y; if (e.aimT <= 0) { e.st = 'fire'; setClip(e, 'fire', 20, false, () => { e.st = 'think'; e.atk = false; e.cd = rnd(1.6, 2.4); }); sfx.laser(); G.shots.push({ x: e.x + e.face * 120, y: e.y, z: 118, vx: e.face * 900, from: e, dmg: 14, life: 1.4 }); SC.pViolet.explode(10, e.x + e.face * 120, e.y - 118); } return; }
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
    if (e.st === 'pounce') { if (!e.hitDone && Math.abs(p.x - e.x) < 80 && Math.abs(p.y - e.y) < 34 && Math.abs(p.z - e.z) < 80) { e.hitDone = true; hurtPlayer(12, e, false); } if (e.z <= 0 && e.t > .2) { e.st = 'think'; e.atk = false; e.vx = 0; e.cd = rnd(1, 1.6); setClip(e, 'idle', 12, true); SC.pDust.explode(6, e.x, e.y); } return; }
    face(e, p);
    const want = canAttack(e) || e.atk, ang = e.t * 1.3 + (e.slot || 0);
    const tx = want ? p.x - e.face * 260 : p.x + Math.cos(ang) * 300, ty = want ? p.y : p.y + Math.sin(ang) * 60;
    const arrived = moveTo(e, tx, ty, e.spd, dt); walkAnim(e, !arrived, 32);
    if (want && Math.abs(p.x - e.x) < 300 && Math.abs(p.y - e.y) < 30 && e.cd <= 0) { e.st = 'crouch'; e.t = 0; e.atk = true; setClip(e, 'crouch', 14, false); e.vx = e.vy = 0; }
  },
  brute(e, p, dt) {
    if (e.st === 'bash') { const pr = prog(e); e.vx = pr > .2 && pr < .8 ? e.face * 520 : 0; e.vy = 0; if (!e.hitDone && pr > .2 && inFront(e, p, 120, 40)) { e.hitDone = true; hurtPlayer(16, e, true); } return; }
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
        later(.7, () => { if (e.dead || e.st !== 'slam') return; sfx.boom(); shake(240, .01); G.rings.push({ x: e.x + e.face * 60, y: e.y, r: 20, max: 330, spd: 620, dmg: 14, col: 0xb07cff, hit: false }); SC.pViolet.explode(20, e.x + e.face * 60, e.y); });
      } else e.atk = false;
    }
  },
  pretresse(e, p, dt) {
    face(e, p); e.vx = e.vy = 0;
    if (e.st === 'beamWind' || e.st === 'beam' || e.st === 'tpout' || e.st === 'tpin' || e.st === 'sigil') {
      if (e.st === 'beam') { e.beamT -= dt; if (Math.abs(p.y - e.y) < 32 && (p.x - e.x) * e.face > 0 && (p.x - e.x) * e.face < 760 && p.z < 120) { e.beamTick -= dt; if (e.beamTick <= 0) { e.beamTick = .22; hurtPlayer(4, e, false); } } }
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
    if (e.dead) return; const L = G.lock != null ? G.lock : G.cam, p = G.p;
    let nx = p.x + (Math.random() < .5 ? -1 : 1) * rnd(340, 460); nx = clamp(nx, L + 80, L + VW - 80); const f = floorAt(nx);
    e.x = nx; e.y = clamp(p.y + rnd(-50, 50), f[0], f[1]); face(e, p); e.st = 'tpin'; SC.pViolet.explode(18, e.x, e.y - 100);
    setClip(e, 'tpin', 14, false, () => { e.st = 'think'; e.tpT = rnd(3.5, 5); e.cd = Math.min(e.cd, .6); setClip(e, 'idle', 10, true); });
  });
}
// coups de mêlée des miliciens (fenêtre active au milieu du clip)
function meleeCheck(e) {
  if (e.kind === 'milicien' && e.st === 'atk' && !e.hitDone && e.clip === e.hitClip && prog(e) > .45 && prog(e) < .8) {
    if (inFront(e, G.p, 150, 34)) { e.hitDone = true; hurtPlayer(e.hitDmg, e, e.hitClip === 'atk2'); }
  }
}

/* ---------- Boss : Oba Ferrum ---------- */
function bossUpdate(e, dt) {
  const p = G.p;
  if (e.st === 'bossEnter') { e.vx = -90; setClip(e, 'idle', 12, true); if (e.x < G.lock + VW - 220) { e.vx = 0; e.st = 'think'; e.cd = 1.4; sfx.roar(); shake(500, .012); } return; }
  if (e.st === 'dyingBoss') { e.vx = 0; return; }
  if (['smashWind', 'smash', 'recover', 'backhand', 'burst', 'roar', 'chargeWind', 'charge', 'kneel'].includes(e.st)) {
    if (e.st === 'charge') {
      e.vx = e.face * 760; if (Math.random() < .6) { SC.pFire.explode(2, e.x - e.face * 80, e.y - 60); SC.pDust.explode(2, e.x, e.y); }
      if (!e.hitDone && Math.abs(p.x - e.x) < 110 && Math.abs(p.y - e.y) < 44 && p.z < 150) { e.hitDone = true; hurtPlayer(26, e, true); }
      if ((e.face > 0 && e.x > G.lock + VW - 110) || (e.face < 0 && e.x < G.lock + 110)) { e.vx = 0; e.st = 'kneel'; e.t = 0; sfx.boom(); shake(420, .016); SC.pFire.explode(30, e.x + e.face * 60, e.y - 100); setClip(e, 'kneel', 10, false); floatTxt(e.x, e.y - 380, 'SONNÉ !', '#ffd36b', true); }
    } else e.vx = 0;
    if (e.st === 'kneel' && e.t > 2) { e.st = 'think'; e.cd = .8; setClip(e, 'idle2', 12, true); }
    if (e.st === 'backhand' && !e.hitDone && prog(e) > .3 && prog(e) < .6 && inFront(e, p, 230, 60)) { e.hitDone = true; hurtPlayer(18, e, true); }
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
    e.st = 'chargeWind'; e.t = 0; sfx.roar(); setClip(e, 'roar', 12, false, () => { if (e.st !== 'chargeWind') return; e.st = 'charge'; e.hitDone = false; setClip(e, 'charge', 14, true); });
  } else if (dx < 240 && dy < 70 && r < .75) {
    e.st = 'backhand'; setClip(e, 'backhand', 18, false, () => { e.st = 'think'; e.cd = rnd(1, 1.6) / e.phase; setClip(e, e.phase === 2 ? 'idle2' : 'idle', 12, true); }); sfx.swing();
  } else {
    e.st = 'smashWind'; sfx.charge();
    setClip(e, 'smashWind', e.phase === 2 ? 20 : 15, false, () => {
      e.st = 'smash'; sfx.boom(); shake(450, .02); SC.cameras.main.flash(90, 255, 180, 90); SC.pFire.explode(40, e.x + e.face * 40, e.y - 20);
      const direct = Math.abs(p.x - (e.x + e.face * 40)) < 170 && Math.abs(p.y - e.y) < 60 && p.z < 40; if (direct) hurtPlayer(24, e, true);
      G.rings.push({ x: e.x + e.face * 40, y: e.y, r: 40, max: 620, spd: 700, dmg: 18, col: 0xffa040, hit: direct });
      if (e.phase === 2) later(.42, () => { if (!e.dead) G.rings.push({ x: e.x + e.face * 40, y: e.y, r: 40, max: 620, spd: 760, dmg: 18, col: 0xffa040, hit: false }); });
      setClip(e, 'smash', 14, false, () => { e.st = 'recover'; setClip(e, 'recover', 10, false, () => { e.st = 'think'; e.cd = rnd(1.2, 1.9) / (e.phase === 2 ? 1.4 : 1); setClip(e, e.phase === 2 ? 'idle2' : 'idle', 12, true); }); });
    });
  }
}
function phase2(e) {
  e.phase = 2; e.st = 'burst'; e.inv = 2.2; e.vx = 0; sfx.roar(); sfx.boom(); shake(800, .018); SC.cameras.main.flash(300, 255, 160, 60);
  $('bPhase').textContent = 'Cœur à nu · Rage';
  for (let i = 0; i < 3; i++) later(i * .2, () => SC.pFire.explode(30, e.x + rnd(-60, 60), e.y - rnd(100, 300)));
  ringFx(e.x, e.y, 0xffa040, 420, 700, true);
  const p = G.p; if (Math.abs(p.x - e.x) < 260) { p.vx = Math.sign(p.x - e.x) * 500; hurtPlayer(10, e, true); }
  setClip(e, 'burst', 12, false, () => { e.st = 'roar'; setClip(e, 'roar', 12, false, () => { e.st = 'think'; e.cd = 1; setClip(e, 'idle2', 12, true); }); });
  later(2.5, () => { if (G.boss === e && !e.dead) { spawn('milicien', 1); spawn('milicien', -1); tip('throwBoss'); } });
  updBoss();
}
// fissures d'armure à chaque palier de 10 % : retour visible des coups sur le colosse
function bossCrack(e) {
  const step = Math.floor(e.hp / e.max * 10); if (e.crack == null) e.crack = 10;
  if (step < e.crack) {
    e.crack = step; hitstop(.1); shake(220, .01); sfx.shatter(); e.flash = .14;
    SC.pFire.explode(26, e.x + rnd(-40, 40), e.y - rnd(150, 280)); SC.pSpark.explode(20, e.x, e.y - 220);
    floatTxt(e.x, e.y - 400, 'ARMURE FISSURÉE', '#ffb347'); e.x += e.face * -10;
  }
}
function bossDeath(e) {
  e.st = 'dyingBoss'; G.tsT = .22; sfx.roar(); shake(1400, .02); updBoss(); $('boss').hidden = true;
  for (const o of G.en) if (o !== e && !o.dead) kill(o, e);
  setClip(e, 'kneel', 6, false);
  for (let i = 0; i < 8; i++) later(i * .16, () => { SC.pFire.explode(26, e.x + rnd(-80, 80), e.y - rnd(60, 320)); sfx.boom(); });
  later(1.5, () => { G.tsT = 1; SC.cameras.main.flash(600, 255, 240, 220); glowFx(e.x, e.y - 180, 0xffd36b, 14, 1200); SC.tweens.add({ targets: e.spr, alpha: 0, duration: 1200 }); });
  later(3.2, victory, true);
}

/* ---------- Projectiles & ondes ---------- */
function shotsUpdate(dt) {
  const p = G.p, g = SC.fxg;
  for (const s of G.shots) {
    s.life -= dt; s.x += s.vx * dt;
    g.lineStyle(6, 0xb07cff, .9); g.beginPath(); g.moveTo(s.x - Math.sign(s.vx) * 60, s.y - s.z); g.lineTo(s.x, s.y - s.z); g.strokePath();
    g.lineStyle(2, 0xffffff, 1); g.beginPath(); g.moveTo(s.x - Math.sign(s.vx) * 40, s.y - s.z); g.lineTo(s.x, s.y - s.z); g.strokePath();
    if (Math.abs(s.x - p.x) < 34 && Math.abs(s.y - p.y) < 26 && p.z < 150) {
      if (['atk1', 'atk2', 'atk3'].includes(p.st) && Math.sign(s.x - p.x) === p.face) { s.vx *= -1.2; s.dmg = 24; s.reflected = true; sfx.block(); floatTxt(p.x, p.y - 220, 'RENVOYÉ !', '#8ef7ff'); hitstop(.05); }
      else if (!s.reflected) { s.life = 0; hurtPlayer(s.dmg, { x: s.x - s.vx }, false); }
    }
    if (s.reflected) for (const e of G.en) if (!e.dead && Math.abs(s.x - e.x) < 40 && Math.abs(s.y - e.y) < 30) { hitEnemy(e, s.dmg, 'heavy', { x: s.x - s.vx, face: Math.sign(s.vx) }); s.life = 0; }
  }
  G.shots = G.shots.filter(s => s.life > 0);
  for (const r of G.rings) {
    r.r += r.spd * dt; const a = 1 - r.r / r.max;
    g.lineStyle(10 * a + 2, r.col, Math.max(0, a)); g.strokeEllipse(r.x, r.y, r.r * 2, r.r * .7);
    const dx = (p.x - r.x), dy = (p.y - r.y) / .35, d = Math.hypot(dx, dy);
    if (!r.hit && Math.abs(d - r.r) < 30 && p.z < 18) { r.hit = true; hurtPlayer(r.dmg, { x: r.x }, true); }
  }
  G.rings = G.rings.filter(r => r.r < r.max);
}
function telegraphs() {
  const g = SC.tele, p = G.p; g.clear();
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
  const p = G.p;
  if (G.lock == null && G.enc < ENC.length) {
    const E = ENC[G.enc];
    if (G.cam >= E.L - 2) { G.lock = E.L; G.wave = -1; G.waveT = .4; G.checkpoint = G.enc; $('go').hidden = true; if (E.boss) bossIntro(); }
  }
  if (G.lock != null && !G.ended) {
    const E = ENC[G.enc]; if (E.boss) return;
    const alive = G.en.filter(e => !e.dead).length;
    if (alive === 0) {
      G.waveT -= dt;
      if (G.waveT <= 0) {
        if (G.wave + 1 < E.waves.length) { G.wave++; G.waveT = 1.2; E.waves[G.wave].forEach((k, i) => { const e = spawn(k, i % 2 ? -1 : 1); e.slot = i * 40; }); }
        else { G.lock = null; G.camMin = E.L; G.enc++; $('go').hidden = false; G.goT = 2.5; sfx.pick(); }
      }
    }
  }
}
function camera(dt) {
  const p = G.p, cam = SC.cameras.main;
  let target = p.x - VW * .42 + p.face * 40;
  if (G.lock != null) target = G.lock; else target = clamp(target, G.camMin, Math.min(WORLD_W - VW, G.enc < ENC.length ? ENC[G.enc].L : WORLD_W));
  G.cam += (target - G.cam) * Math.min(1, dt * (G.lock != null ? 3 : 5));
  G.cam = Math.max(G.cam, G.camMin);
  cam.setScroll(Math.round(G.cam * 100) / 100, 0);
  if (G.goT > 0) { G.goT -= dt; if (G.goT <= 0) $('go').hidden = true; }
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
  inp.x = clamp(inp.kx + inp.jx + inp.gx, -1, 1); inp.y = clamp(inp.ky + inp.jy + inp.gy, -1, 1);
  runTimers(dt, rdt);
  const p = G.p;
  animStep(p, dt); playerUpdate(p, dt);
  for (const e of G.en) { animStep(e, dt); if (!e.dead || e.st === 'dying' || e.st === 'gone' || e.st === 'dyingBoss') enemyUpdate(e, dt); meleeCheck(e); }
  separate();
  for (const e of G.en) if (e.remove) { e.spr.destroy(); e.sh.destroy(); }
  G.all = G.all.filter(a => !a.remove); G.en = G.en.filter(e => !e.remove);
  propsUpdate(dt); shotsUpdate(dt); telegraphs(); encounters(dt); camera(rdt);
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  if (G.buffT > 0) { G.buffT -= dt; if (G.buffT <= 0) G.buff = null; }
  if (G.buff && Math.random() < .5) (G.buff === 'spear' ? SC.pBolt : SC.pFire).explode(1, p.x + rnd(-30, 30), p.y - rnd(40, 180) - p.z);
  zoneTint(); tipsTick(); drawAll(); hudTick();
}
// teinte d'ambiance par zone : marché chaud, pont froid, réacteur incandescent
const ZTINT = [[255, 242, 224], [255, 238, 222], [226, 234, 255], [226, 234, 255], [255, 226, 206]];
function zoneTint() {
  const f = G.p.x / STEP, k = clamp(Math.floor(f), 0, 4), k2 = clamp(k + 1, 0, 4), t = clamp((f - k - .85) / .15, 0, 1);
  const c = ZTINT[k].map((v, i) => Math.round(v + (ZTINT[k2][i] - v) * t)); G.zoneTint = (c[0] << 16) | (c[1] << 8) | c[2];
}
function drawAll() {
  for (const a of G.all) {
    if (a.fi < 0) animStep(a, 0);
    draw(a);
    if (a.flash > 0) a.spr.setTintFill(0xffffff); else if (a.boss && a.phase === 2) a.spr.setTint(0xffd0b0); else if (a.st === 'grabbed') a.spr.setTint(0xffe0c8); else a.spr.setTint(G.zoneTint || 0xffffff);
    if (a.inv > 0 && a === G.p && a.st !== 'dash' && a.st !== 'power') a.spr.setAlpha(Math.floor(a.inv * 16) % 2 ? .45 : 1); else if (a.st !== 'gone' && !a.boss) a.spr.setAlpha(1);
    // petites barres de vie ennemies
    if (a !== G.p && !a.boss && !a.dead && a.hp < a.max) { const w = 60, x = a.x - w / 2, y = a.y - CHAR[a.kind].h - a.z - 18; SC.bars.fillStyle(0x0b0714, .8).fillRect(x - 1, y - 1, w + 2, 6).fillStyle(0xff3d5a, 1).fillRect(x, y, w * a.hp / a.max, 4); if (a.shield > 0) SC.bars.fillStyle(0xb07cff, 1).fillRect(x, y + 6, w * a.shield / a.shieldMax, 3); }
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
  grab: () => 'Prise ! <b>' + (touch ? 'Frappe' : 'J') + '</b> = coups de genou · <b>' + (touch ? 'Saut' : 'K') + '</b> = projection sur les autres.',
  milicien: () => 'Le milicien <b>pare</b> de face : le 3ᵉ coup du combo, l\'esquive ou une <b>prise</b> brisent sa garde.',
  chien: () => 'Le chien s\'accroupit avant de bondir : <b>change de ligne</b> ou saute.',
  tireuse: () => 'Ligne violette = tir imminent. <b>Frappe au bon moment</b> pour le renvoyer.',
  brute: () => 'Bouclier frontal : contourne-la, <b>Tempête</b>, ou combo jusqu\'à le briser. <b>Saute</b> l\'onde au sol.',
  pretresse: () => 'La prêtresse protège ses alliés d\'un sceau : <b>frappe-la</b> pour le dissiper.',
  power: () => '<b>Tempête prête</b> (' + (touch ? 'bouton turquoise' : 'L') + '). Sans énergie, elle coûte de la vie.',
  boss: () => 'Oba Ferrum est blindé : <b>Tempête, tonneaux, projections</b> et finishers passent l\'armure. Saute ses ondes.',
  throwBoss: () => 'Renforts ! <b>Projette</b> un milicien sur le colosse.',
};
let tipQ = [], tipT = 0;
function tip(k) { if (tipSeen[k] || !TIPS[k] || G.demo) return; tipSeen[k] = 1; try { localStorage.setItem('orun-tips', JSON.stringify(tipSeen)); } catch (e) {} tipQ.push(TIPS[k]()); }
function tipsTick() {
  const el = $('tip');
  if (tipT > 0) { tipT -= 1 / 60; if (tipT <= 0) el.hidden = true; return; }
  if (tipQ.length) { el.innerHTML = tipQ.shift(); el.hidden = false; tipT = 4.2; }
  if (G.t > 1 && G.t < 1.1) tip('move');
  if (G.p.en >= 50) tip('power');
  for (const e of G.en) if (!e.dead && e.st !== 'enter') tip(e.kind);
}
/* ---------- HUD ---------- */
let lastHud = '';
function updHUD() {
  if (!G) return; const p = G.p;
  $('hpBar').querySelector('i').style.width = (p.hp / p.max * 100) + '%'; $('hpBar').querySelector('b').style.width = (p.hp / p.max * 100) + '%';
  $('enBar').querySelector('i').style.width = p.en + '%'; $('enBar').classList.toggle('full', p.en >= 50);
  const lv = G.demo ? '' : '◆'.repeat(Math.max(0, G.lives)); if ($('lives').textContent !== lv) $('lives').textContent = lv;
}
function updBoss() { const b = G.boss; if (!b) return; const f = Math.max(0, b.hp / b.max * 100); $('bossBar').querySelector('i').style.width = f + '%'; $('bossBar').querySelector('b').style.width = f + '%'; }
function hudTick() {
  const sc = String(Math.floor(G.score)).padStart(6, '0'); if (sc !== lastHud) { lastHud = sc; $('score').textContent = sc; }
  const c = $('combo'); if (G.combo >= 3) { c.style.opacity = 1; $('comboN').textContent = G.combo; } else c.style.opacity = 0;
  updHUD();
  const bf = $('buff'); if (G.buff) { bf.hidden = false; bf.textContent = (G.buff === 'spear' ? 'LANCE D\'ORUN' : 'MARTEAU-FORGE') + ' · ' + Math.ceil(G.buffT) + ' s'; } else bf.hidden = true;
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
  $('bNext').textContent = storyMode === 'end' ? 'Retour au menu' : storyI < list.length - 1 ? 'Continuer' : 'Combattre';
  $('bSkip').hidden = storyMode === 'end';
}
$('bNext').addEventListener('click', () => { const list = storyMode === 'intro' ? STORY : [END]; if (storyI < list.length - 1) { storyI++; renderStory(); } else if (storyMode === 'intro') begin(); else toMenu(); });
$('bSkip').addEventListener('click', begin);
function begin() {
  audio(); startMusic(); $('story').hidden = true; newGame(false); state = 'play'; paused = false;
  $('hud').hidden = false; $('bPause').hidden = false; document.body.classList.add('playing'); sfx.gong();
}
function bossIntro() {
  $('bossIntro').hidden = false; if (mus) mus.boss = true; sfx.gong(); G.tsT = .3;
  const go = () => { if (!BOSS_READY) { later(.3, go, true); return; } G.tsT = 1; $('bossIntro').hidden = true; spawnBoss(); tip('boss'); };
  later(2.4, go, true);
}
function showOver() {
  if (state !== 'play') return; state = 'over'; document.body.classList.remove('playing');
  $('ovEy').textContent = 'Amara est tombée'; $('ovScore').textContent = String(Math.floor(G.score)).padStart(6, '0');
  $('ovSub').textContent = G.kills + ' ennemis vaincus · zone ' + (G.checkpoint + 1) + ' sur ' + ENC.length + (G.cont > 0 ? ' · ' + G.cont + ' crédit' + (G.cont > 1 ? 's' : '') + ' restant' + (G.cont > 1 ? 's' : '') : ' · plus de crédit');
  $('bRetry').hidden = G.cont <= 0; $('bRetry').textContent = 'Continuer (' + G.cont + ')'; $('ovEy').textContent = G.cont > 0 ? 'Amara est tombée' : 'Fin de partie';
  $('over').hidden = false; saveBest();
}
function victory() {
  state = 'end'; G.ended = true; document.body.classList.remove('playing'); saveBest(); if (mus) mus.boss = false;
  $('hud').hidden = true; $('boss').hidden = true; $('bPause').hidden = true; showStory('end');
  $('stEy').textContent = END[0] + ' · Score ' + String(Math.floor(G.score)).padStart(6, '0');
}
function clearCombo() { $('combo').style.opacity = 0; $('buff').hidden = true; }
function saveBest() { clearCombo(); const s = Math.floor(G.score); if (s > best) { best = s; try { localStorage.setItem('orun-best', String(best)); } catch (e) {} } }
function toMenu() {
  try { SC.scene.resume(); } catch (e) {} $('tip').hidden = true; tipQ = []; tipT = 0;
  for (const id of ['story', 'over', 'pause', 'bossIntro']) $(id).hidden = true; $('hud').hidden = true; $('boss').hidden = true; $('bPause').hidden = true; $('go').hidden = true;
  document.body.classList.remove('playing'); clearCombo(); paused = false; state = 'title'; if (mus) mus.boss = false; newGame(true); $('title').hidden = false;
  $('best').textContent = best ? 'Record ' + String(best).padStart(6, '0') : '';
}
function retry() {
  // reprise au dernier point de contrôle
  const cp = G.checkpoint, sc = Math.floor(G.score * .5), cont = G.cont - 1;
  $('over').hidden = true; newGame(false); G.score = sc; G.cont = cont; state = 'play'; document.body.classList.add('playing');
  if (cp > 0) { G.enc = cp; G.camMin = ENC[cp].L - 20; G.cam = ENC[cp].L - 300; G.p.x = ENC[cp].L + 120; for (const pr of G.props) if (pr.x < ENC[cp].L) { pr.dead = true; pr.spr.destroy(); } }
  if (ENC[cp] && ENC[cp].boss) { G.cam = ENC[cp].L; }
  $('hud').hidden = false; $('bPause').hidden = false; $('boss').hidden = true;
}
$('bStart').addEventListener('click', () => { audio(); showStory('intro'); });
$('bRetry').addEventListener('click', retry);
$('bMenu').addEventListener('click', toMenu);
$('bQuit').addEventListener('click', toMenu);
$('bResume').addEventListener('click', () => setPause(false));
$('bPause').addEventListener('click', () => setPause(true));
function setPause(v) { if (state !== 'play') return; paused = v; try { v ? SC.scene.pause() : SC.scene.resume(); } catch (e) {} $('pause').hidden = !v; document.body.classList.toggle('playing', !v); if (AC) v ? AC.suspend() : AC.resume(); }
$('bMute').addEventListener('click', () => { audio(); muted = !muted; if (master) master.gain.value = muted ? 0 : .9; $('wave').style.opacity = muted ? .15 : 1; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setPause(true); });

/* ---------- Entrées ---------- */
const KEYS = { arrowleft: 'l', q: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', z: 'u', w: 'u', arrowdown: 'd', s: 'd' };
const held = new Set();
function keyDir() { inp.kx = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0); inp.ky = (held.has('d') ? 1 : 0) - (held.has('u') ? 1 : 0); }
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'escape' || k === 'p') { setPause(!paused); return; }
  if (state === 'title' && k === 'enter') { audio(); showStory('intro'); return; }
  if (state === 'story' && (k === 'enter' || k === ' ')) { e.preventDefault(); $('bNext').click(); return; }
  if (state !== 'play' || paused) return;
  if (KEYS[k]) {
    const d = KEYS[k]; e.preventDefault();
    if (!e.repeat && (d === 'l' || d === 'r')) { const now = performance.now(); if (lastTap.d === d && now - lastTap.t < 260) inp.runReq = 1; lastTap = { d, t: now }; }
    held.add(d); keyDir(); return;
  }
  if (e.repeat) return;
  if (k === 'j' || k === 'x') inp.atk = 1;
  else if (k === 'k' || k === ' ' || k === 'c') { inp.jump = 1; e.preventDefault(); }
  else if (k === 'l' || k === 'v') inp.pow = 1;
  else if (k === 'shift' || k === 'u' || k === 'b') inp.dash = 1;
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (KEYS[k]) { held.delete(KEYS[k]); keyDir(); if (!held.has('l') && !held.has('r')) inp.runReq = 0; } });
let lastTap = { d: '', t: 0 };
// manette (API Gamepad) : stick/croix, A saut, X frappe, B esquive, Y/RB Tempête, Start pause
let padPrev = [];
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null;
  for (const g of pads) if (g && g.connected) { gp = g; break; }
  if (!gp) { inp.gx = inp.gy = 0; return; }
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), edge = i => b(i) && !padPrev[i];
  let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
  inp.gx = Math.abs(ax) > .35 ? Math.sign(ax) : 0; inp.gy = Math.abs(ay) > .35 ? Math.sign(ay) : 0;
  if (state === 'play' && !paused) { if (edge(0)) inp.jump = 1; if (edge(2)) inp.atk = 1; if (edge(1)) inp.dash = 1; if (edge(3) || edge(5)) inp.pow = 1; }
  if (edge(9)) { if (state === 'play') setPause(!paused); else if (state === 'title') { audio(); showStory('intro'); } }
  if (edge(0) && state === 'story') $('bNext').click();
  if (edge(0) && state === 'over' && !$('bRetry').hidden) retry();
  padPrev = gp.buttons.map(x => x.pressed);
}
// la manette doit aussi répondre en pause et sur les menus
setInterval(() => { if (state !== 'play' || paused) pollPad(); }, 50);
function bindBtn(id, key) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); audio(); b.classList.add('on'); if (state === 'play' && !paused) inp[key] = 1; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('on'));
}
bindBtn('bAtk', 'atk'); bindBtn('bJump', 'jump'); bindBtn('bPow', 'pow'); bindBtn('bDash', 'dash');
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

/* ---------- Lancement ---------- */
const DPR = Math.min(2, window.devicePixelRatio || 1);
window.GAME = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: Math.round(VW * DPR), height: Math.round(VH * DPR), backgroundColor: '#0b0714',
  scale: { mode: Phaser.Scale.NONE },
  render: { antialias: true, powerPreference: 'high-performance' }, fps: { target: 60 },
  scene: [Play]
});
window.__orun = { get G() { return G; }, get state() { return state; }, inp, warp(n) { G.checkpoint = n; retry(); } };
})();
