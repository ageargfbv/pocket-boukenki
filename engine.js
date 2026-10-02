// ポケット冒険記のエンジン。中身（街・モンスター・技）は data.js。ここは動かす仕組みだけ。
"use strict";
const SAVE_KEY = "pocket-boukenki-v1";
const T = 16, VH = 10;                        // 1マス16ドット。縦は10マス（160ドット）
let SW = 240;                                 // 画面の横幅（縦持ち240、横持ちは端末の比率に合わせて最大400）
const $ = id => document.getElementById(id);
const rnd = n => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
const DIRS = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]};

// ================= 入力 =================
const Input = {held:null, waiter:null};
function press(btn){
  if (Input.waiter) { Input.waiter(btn); return; }
  if (btn === "A") World.interact();
  else if (btn === "START") World.menu();
}
function setupInput(){
  document.querySelectorAll("[data-d]").forEach(b => {
    const d = b.dataset.d;
    b.addEventListener("pointerdown", e => { e.preventDefault(); Input.held = d; press(d); });
    const up = () => { if (Input.held === d) Input.held = null; };
    b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up);
  });
  [["bA","A"],["bB","B"],["bStart","START"]].forEach(([id,k]) =>
    $(id).addEventListener("pointerdown", e => { e.preventDefault(); press(k); }));
  const keys = {ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",z:"A",Z:"A",Enter:"START",x:"B",X:"B"," ":"A"};
  addEventListener("keydown", e => { const k = keys[e.key]; if (!k) return; e.preventDefault();
    if (DIRS[k]) { if (Input.held !== k) { Input.held = k; press(k); } } else if (!e.repeat) press(k); });
  addEventListener("keyup", e => { if (keys[e.key] === Input.held) Input.held = null; });
  $("panel").addEventListener("pointerdown", e => { if (!e.target.closest(".opt")) press("A"); });
  document.addEventListener("gesturestart", e => e.preventDefault());
}

// ================= 文章とメニュー =================
function say(text, {auto = 0} = {}){
  return new Promise(res => {
    $("msg").textContent = text; $("msg").classList.add("more"); $("menu").innerHTML = "";
    let t = null;
    const done = () => { if (t) clearTimeout(t); Input.waiter = null; $("msg").classList.remove("more"); res(); };
    Input.waiter = b => { if (b === "A" || b === "B") done(); };
    if (auto) t = setTimeout(done, auto);
  });
}
async function talk(lines){ for (const l of lines) await say(l); }
// options: 文字列の配列。返り値は選んだ番号（B で -1）
function choose(options, {text = null, cols = 1, cancel = true, start = 0, note = null} = {}){
  return new Promise(res => {
    if (text !== null) $("msg").textContent = text;
    $("msg").classList.remove("more");
    const menu = $("menu"); let cur = clamp(start, 0, options.length - 1);
    menu.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    menu.classList.toggle("short", options.length <= 4 && options.every(o => o.length <= 8));   // 横持ちで1行に並べる
    const draw = () => {
      menu.innerHTML = "";
      options.forEach((o, i) => {
        const d = document.createElement("div"); d.className = "opt" + (i === cur ? " cur" : "");
        d.textContent = o;
        d.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); finish(i); });
        menu.appendChild(d);
      });
      if (note) { const n = document.createElement("div"); n.className = "note"; n.textContent = note(cur) || ""; menu.appendChild(n); }
    };
    const finish = i => { Input.waiter = null; menu.innerHTML = ""; res(i); };
    Input.waiter = b => {
      if (b === "A") finish(cur);
      else if (b === "B") { if (cancel) finish(-1); }
      else if (b === "up") { cur = (cur - cols + options.length) % options.length; draw(); }
      else if (b === "down") { cur = (cur + cols) % options.length; draw(); }
      else if (b === "left" && cols > 1) { cur = (cur - 1 + options.length) % options.length; draw(); }
      else if (b === "right" && cols > 1) { cur = (cur + 1) % options.length; draw(); }
    };
    draw();
  });
}
function clearPanel(){ $("msg").textContent = ""; $("menu").innerHTML = ""; }
async function fade(on){ $("fade").style.opacity = on ? 1 : 0; await wait(180); }

// ================= 絵 =================
const cv = $("cv"), ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
function fit(){
  const land = innerWidth > innerHeight;
  const w = land ? clamp(Math.round(160 * innerWidth / innerHeight / 2) * 2, 240, 400) : 240;
  if (w !== SW || cv.width !== w) { SW = w; cv.width = w; cv.height = 160; ctx.imageSmoothingEnabled = false; }
  const hs = $("hud").style;                  // 戦闘の表示は中央の240ドットの範囲に置く
  hs.left = ((SW - 240) / 2 / SW * 100) + "%"; hs.width = (240 / SW * 100) + "%";
}
function px(c, col, x, y, w = 1, h = 1){ c.fillStyle = col; c.fillRect(x, y, w, h); }
const tileCache = {};
function tileImg(ch){
  if (tileCache[ch]) return tileCache[ch];
  const o = document.createElement("canvas"); o.width = o.height = T; const c = o.getContext("2d");
  const ground = () => { px(c,"#8fd06a",0,0,16,16); [[3,4],[11,2],[7,11],[13,13],[1,14]].forEach(([x,y]) => px(c,"#7cbf58",x,y)); };
  switch (ch) {
    case ".": ground(); break;
    case ",": px(c,"#5fae4a",0,0,16,16);
      for (const [x,y] of [[1,3],[6,1],[11,4],[3,9],[9,8],[13,11],[6,13]]) { px(c,"#3d7a32",x,y+2,1,3); px(c,"#3d7a32",x+1,y+1,1,2); px(c,"#3d7a32",x+2,y+2,1,3); } break;
    case "=": px(c,"#e3cf95",0,0,16,16); [[2,3],[9,6],[13,12],[5,13]].forEach(([x,y]) => px(c,"#cdb67a",x,y)); break;
    case "f": ground(); [[3,3,"#e85a5a"],[10,5,"#f5d43a"],[5,10,"#f5d43a"],[12,12,"#e85a5a"]].forEach(([x,y,k]) => { px(c,k,x,y,2,2); px(c,"#fff",x,y); }); break;
    case "T": ground(); px(c,"#5a3a1e",6,11,4,5); c.fillStyle="#2f7d32"; c.beginPath(); c.arc(8,7,7,0,7); c.fill();
      c.fillStyle="#3f9a3a"; c.beginPath(); c.arc(6,5,3,0,7); c.fill(); break;
    case "R": px(c,"#c0504d",0,0,16,16); for (let y = 1; y < 16; y += 4) px(c,"#9b3a37",0,y,16,1); break;
    case "#": px(c,"#efe3c2",0,0,16,16); px(c,"#bfae88",0,15,16,1); px(c,"#7fb3e6",5,4,6,5); px(c,"#5a6f9a",5,4,6,1); break;
    case "D": px(c,"#efe3c2",0,0,16,16); px(c,"#7a4a2a",3,3,10,13); px(c,"#5a3418",3,3,10,1); px(c,"#f5d43a",10,10,1,1); break;
    case "~": px(c,"#4a90d9",0,0,16,16); px(c,"#8cc4f0",2,4,5,1); px(c,"#8cc4f0",9,10,5,1); break;
    case "S": ground(); px(c,"#5a3a1e",7,9,2,6); px(c,"#5a3a1e",2,3,12,7); px(c,"#c9a77a",3,4,10,5); break;
    case "F": ground(); px(c,"#c9a77a",0,6,16,2); px(c,"#c9a77a",0,10,16,2); for (const x of [1,7,13]) px(c,"#8a6a45",x,4,2,10); break;
    case "W": px(c,"#c9b48a",0,0,16,16); px(c,"#8a7550",0,13,16,3); break;
    case "_": px(c,"#e8d8b0",0,0,16,16); px(c,"#dccaa0",0,0,8,8); px(c,"#dccaa0",8,8,8,8); break;
    case "C": px(c,"#8a5a3c",0,2,16,14); px(c,"#a8714c",0,2,16,3); break;
    case "M": px(c,"#e8d8b0",0,0,16,16); px(c,"#c0504d",1,2,14,12); break;
    default: px(c,"#000",0,0,16,16);
  }
  return tileCache[ch] = o;
}
const PASS = new Set([".", ",", "=", "f", "_", "M", "D"]);
const spriteCache = {};
function monImg(sp){
  if (spriteCache[sp]) return spriteCache[sp];
  const m = MONS[sp], rows = SPRITES[m.art], o = document.createElement("canvas"); o.width = o.height = 16;
  const c = o.getContext("2d"), col = {k:"#202028", w:"#ffffff", a:m.pal.a, b:m.pal.b};
  rows.forEach((r, y) => [...r.padEnd(16, ".").slice(0, 16)].forEach((ch, x) => { if (col[ch]) px(c, col[ch], x, y); }));
  return spriteCache[sp] = o;
}
function drawPerson(x, y, dir, step, look){
  const K = "#202028", skin = "#f6d3a8", cap = look.cap, shirt = look.shirt;
  const r = (col, a, b, w, h) => px(ctx, col, x + a, y + b, w, h);
  r("rgba(0,0,0,.18)", 3, 14, 10, 2);
  r(K, 3, 0, 10, 10); r(cap, 4, 1, 8, 3);                       // 頭
  if (dir === "up") r(cap, 4, 4, 8, 5); else { r(skin, 4, 4, 8, 5);
    if (dir === "down") { r(K, 5, 6, 1, 2); r(K, 10, 6, 1, 2); }
    else if (dir === "left") { r(K, 5, 6, 1, 2); r(cap, 10, 4, 2, 3); }
    else { r(K, 10, 6, 1, 2); r(cap, 4, 4, 2, 3); } }
  r(K, 3, 9, 10, 5); r(shirt, 4, 10, 8, 3);                      // 体
  const lift = step ? 1 : 0;
  r(K, 4, 13, 3, 3 - lift); r(K, 9, 13, 3, 3 - (step ? 0 : 0) - (lift ? 0 : 0));
  if (step) r("#3a3a48", 9, 13, 3, 2);
}

// ================= モンスター =================
const NATURES = ["がんばりや","さみしがり","ゆうかん","いじっぱり","やんちゃ","ずぶとい","すなお","のんき","わんぱく","のうてんき","おくびょう","せっかち","まじめ","ようき","むじゃき","ひかえめ","おっとり","れいせい","てれや","うっかりや","おだやか","おとなしい","なまいき","しんちょう","きまぐれ"];
const NAT_STAT = [1, 2, 5, 3, 4];                // 性格表の並び（攻撃・防御・素早さ・特攻・特防）→ 能力の番号
const STAT_NAMES = ["HP","こうげき","ぼうぎょ","とくこう","とくぼう","すばやさ"];
function expAt(g, n){
  if (n <= 1) return 0;
  if (g === "f")  return Math.floor(4 * n ** 3 / 5);
  if (g === "mf") return n ** 3;
  if (g === "ms") return Math.floor(6 * n ** 3 / 5 - 15 * n * n + 100 * n - 140);
  return Math.floor(5 * n ** 3 / 4);
}
function calcStats(m){
  const sp = MONS[m.sp], up = NAT_STAT[Math.floor(m.nat / 5)], dn = NAT_STAT[m.nat % 5];
  return sp.base.map((b, i) => {
    const core = Math.floor((2 * b + m.iv[i] + Math.floor(m.ev[i] / 4)) * m.lv / 100);
    if (i === 0) return core + m.lv + 10;
    const mult = up === dn ? 1 : i === up ? 1.1 : i === dn ? 0.9 : 1;
    return Math.floor((core + 5) * mult);
  });
}
function movesAt(sp, lv){
  const list = [];
  for (const [l, mv] of MONS[sp].learn) if (l <= lv && !list.includes(mv)) list.push(mv);
  return list.slice(-4).map(id => ({id, pp: MOVES[id].pp}));
}
function makeMon(sp, lv){
  const m = {sp, lv, exp: expAt(MONS[sp].grow, lv), iv: Array.from({length:6}, () => rnd(32)), ev:[0,0,0,0,0,0], nat: rnd(25), status:null, moves: movesAt(sp, lv)};
  m.hp = calcStats(m)[0]; return m;
}
const maxHp = m => calcStats(m)[0];
const monName = m => MONS[m.sp].name;
function heal(m){ m.hp = maxHp(m); m.status = null; m.moves.forEach(x => x.pp = MOVES[x.id].pp); }

// ================= 状態とセーブ =================
let S = null;
function newGame(starter){
  S = {map: START.map, x: START.x, y: START.y, dir: START.dir, money: START.money, bag: {...START.bag},
       party: [makeMon(starter, 5)], flags: {}, lastHeal: {map: START.map, x: START.x, y: START.y}, immune: 4};
}
function saveGame(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }
function loadGame(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }

// ================= 世界（歩く・話す） =================
let mode = "title", frame = 0;
const World = {
  moving: 0, busy: false, turnWait: 0, emote: null,
  get map(){ return MAPS[S.map]; },
  tile(x, y){ const r = this.map.rows[y]; return (r && r[x]) || this.map.fill || " "; },
  npcAt(x, y){ return (this.map.npcs || []).find(n => n.x === x && n.y === y); },
  warpAt(x, y){ return (this.map.warps || []).find(w => w[0] === x && w[1] === y); },
  canWalk(x, y){
    const ch = this.tile(x, y);
    if (!PASS.has(ch) || this.npcAt(x, y)) return false;
    if (ch === "D" && !this.warpAt(x, y)) return false;
    return true;
  },
  update(){
    if (this.busy || Input.waiter) return;
    if (this.moving) {
      this.moving += 2;
      if (this.moving >= T) { this.moving = 0; const [dx, dy] = DIRS[S.dir]; S.x += dx; S.y += dy; this.afterStep(); }
      return;
    }
    if (this.turnWait > 0) { this.turnWait--; return; }
    const d = Input.held; if (!d) return;
    if (S.dir !== d) { S.dir = d; this.turnWait = 5; return; }
    const [dx, dy] = DIRS[d];
    if (this.canWalk(S.x + dx, S.y + dy)) this.moving = 1;
  },
  async afterStep(){
    this.busy = true;
    try {
      S.immune = (S.immune || 0) + 1;
      const w = this.warpAt(S.x, S.y);
      if (w) { await this.warp(w[2], w[3], w[4]); return; }
      if (await this.checkTrainers()) return;
      const g = this.map.grass;
      if (g && this.tile(S.x, S.y) === "," && S.immune >= 4 && rnd(2880) < g.rate * 16) {
        const W = [20,20,10,10,10,10,5,5,4,4,1,1]; let r = rnd(100), i = 0;
        while (r >= W[i]) { r -= W[i]; i++; }
        const [sp, lo, hi] = g.slots[i];
        await startBattle([makeMon(sp, lo + rnd(hi - lo + 1))], null);
      }
    } finally { this.busy = false; }
  },
  async warp(map, x, y){
    await fade(true); S.map = map; S.x = x; S.y = y; this.moving = 0; await wait(80); await fade(false);
    $("place").textContent = this.map.name; $("place").classList.add("show"); setTimeout(() => $("place").classList.remove("show"), 1400);
  },
  async checkTrainers(){
    for (const n of this.map.npcs || []) {
      if (!n.trainer || S.flags[n.id] || !n.sight) continue;
      const [dx, dy] = DIRS[n.dir];
      for (let i = 1; i <= n.sight; i++) {
        const x = n.x + dx * i, y = n.y + dy * i;
        if (x === S.x && y === S.y) { await this.trainerBattle(n, true); return true; }
        if (!PASS.has(this.tile(x, y)) || this.npcAt(x, y)) break;
      }
    }
    return false;
  },
  async trainerBattle(n, seen){
    if (seen) { this.emote = {n, until: performance.now() + 700}; await wait(700); this.emote = null; }
    S.dir = {up:"down", down:"up", left:"right", right:"left"}[n.dir];
    const t = n.trainer, cls = TRAINER_CLASS[t.cls];
    await talk(t.intro || ["しょうぶだ！"]);
    const res = await startBattle(t.party.map(([sp, lv]) => makeMon(sp, lv)), {name: `${cls.name}の ${t.name}`, money: cls.money, lose: t.lose});
    if (res === "win") S.flags[n.id] = 1;
  },
  async interact(){
    if (mode !== "world" || this.busy || this.moving) return;
    this.busy = true;
    try {
      const [dx, dy] = DIRS[S.dir]; let x = S.x + dx, y = S.y + dy;
      if (this.tile(x, y) === "C") { x += dx; y += dy; }
      const n = this.npcAt(x, y), sign = (this.map.signs || {})[`${x},${y}`];
      if (n) {
        if (!n.trainer || n.trainer && !n.sight) n.dir = {up:"down", down:"up", left:"right", right:"left"}[S.dir];
        if (n.trainer) { if (S.flags[n.id]) await talk(n.trainer.after); else await this.trainerBattle(n, false); }
        else {
          if (n.talk) await talk(n.talk);
          if (n.heal) { S.party.forEach(heal); S.lastHeal = {map: S.map, x: S.x, y: S.y}; await say("モンスターは みんな げんきに なった！"); }
          if (n.shop) await shop(n.shop);
        }
      } else if (sign) await say(sign);
      clearPanel();
    } finally { this.busy = false; }
  },
  async menu(){
    if (mode !== "world" || this.busy || this.moving) return;
    this.busy = true;
    try {
      while (true) {
        const i = await choose(["なかま", "バッグ", "レポート", "とじる"], {text: `${this.map.name}　おかね ${S.money}円`, cols: 2});
        if (i === 0) await partyMenu(false);
        else if (i === 1) await bagMenu(false);
        else if (i === 2) { await say(saveGame() ? "レポートに しっかり かきのこした！" : "かきこめなかった…"); }
        else break;
      }
      clearPanel();
    } finally { this.busy = false; }
  },
  draw(){
    const off = this.moving ? this.moving : 0, [dx, dy] = DIRS[S.dir];
    const PX = SW / 2 - 8;                      // 主人公を置く横位置（画面の真ん中）
    const camX = S.x * T + dx * off - PX, camY = S.y * T + dy * off - 4 * T - 8;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, SW, 160);
    const x0 = Math.floor(camX / T), y0 = Math.floor(camY / T), VW = Math.ceil(SW / T);
    for (let ty = y0; ty <= y0 + VH + 1; ty++) for (let tx = x0; tx <= x0 + VW + 1; tx++) {
      const ch = this.tile(tx, ty); if (ch === " ") continue;
      ctx.drawImage(tileImg(ch), tx * T - camX, ty * T - camY);
    }
    for (const n of this.map.npcs || []) {
      drawPerson(n.x * T - camX, n.y * T - camY - 4, n.dir, 0, n.look);
      if (this.emote && this.emote.n === n) { const ex = n.x * T - camX + 5, ey = n.y * T - camY - 18;
        px(ctx, "#fff", ex - 1, ey - 1, 7, 12); px(ctx, "#e04848", ex + 2, ey + 1, 2, 6); px(ctx, "#e04848", ex + 2, ey + 8, 2, 2); }
    }
    drawPerson(PX, 4 * T + 8 - 4, S.dir, this.moving && (Math.floor((S.x + S.y) + this.moving / 8) % 2), {cap: "#e04848", shirt: "#3a6fd0"});
  },
};

// ================= 戦闘 =================
let B = null;
const STAGE_KEYS = ["atk", "def", "spa", "spd", "spe", "acc"];
const STAGE_NAME = {atk:"こうげき", def:"ぼうぎょ", spa:"とくこう", spd:"とくぼう", spe:"すばやさ", acc:"めいちゅうりつ"};
const ACC_TABLE = [33,36,43,50,60,75,100,133,166,200,250,266,300];
function freshStages(){ return {atk:0, def:0, spa:0, spd:0, spe:0, acc:0}; }
const stageMult = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
function effStat(m, st, key, ignore){            // ignore: 急所のときに無視する向き
  const idx = {atk:1, def:2, spa:3, spd:4, spe:5}[key];
  let s = st[key]; if (ignore === "neg" && s < 0) s = 0; if (ignore === "pos" && s > 0) s = 0;
  let v = Math.floor(calcStats(m)[idx] * stageMult(s));
  if (key === "spe" && m.status === "par") v = Math.floor(v / 4);
  return Math.max(1, v);
}
function typeMult(mtype, defTypes){ return defTypes.reduce((a, t) => a * ((CHART[mtype] || {})[t] ?? 1), 1); }

function foeLabel(){ return (B.trainer ? "あいての " : "やせいの ") + monName(B.foe()); }
function label(side){ return side === "me" ? monName(B.me()) : foeLabel(); }

async function startBattle(foes, trainer){
  for (let i = 0; i < 3; i++) { await fade(true); await wait(60); await fade(false); await wait(60); }
  mode = "battle";
  B = {foes, fi: 0, pi: S.party.findIndex(m => m.hp > 0), trainer, runs: 0, part: new Set(), st: {me: freshStages(), foe: freshStages()},
       flash: null, hideFoe: false, ball: 0,
       me(){ return S.party[this.pi]; }, foe(){ return this.foes[this.fi]; }};
  B.part.add(B.pi);
  hud();
  let result;
  try { result = await battleLoop(); } finally {
    mode = "world"; $("hud").innerHTML = ""; clearPanel(); S.immune = 0;
  }
  if (result === "lose") await blackout();
  else await evolutions();
  B = null;
  return result;
}
async function battleLoop(){
  if (B.trainer) { await say(`${B.trainer.name}が しょうぶを しかけてきた！`); await say(`${B.trainer.name}は ${monName(B.foe())}を くりだした！`, {auto: 1200}); }
  else await say(`あっ！ ${foeLabel()}が とびだしてきた！`);
  await say(`ゆけっ！ ${monName(B.me())}！`, {auto: 900});
  while (true) {
    const act = await chooseAction();
    if (act.kind === "run") {
      if (B.trainer) { await say("ダメだ！ しょうぶの さいちゅうに あいてに せなかは みせられない！"); continue; }
      B.runs++;
      const ps = effStat(B.me(), B.st.me, "spe"), fs = effStat(B.foe(), B.st.foe, "spe");
      if (ps >= fs || rnd(256) < (Math.floor(ps * 128 / fs) + 30 * B.runs) % 256) { await say("うまく にげきれた！", {auto: 1000}); return "run"; }
      await say("にげられない！", {auto: 900});
      const r = await doMove("foe", pickFoeMove()); if (r) return r;
    } else if (act.kind === "item") {
      const r = await useItemInBattle(act.id); if (r === "caught") return "caught"; if (r === "back") continue;
      const r2 = await doMove("foe", pickFoeMove()); if (r2) return r2;
    } else if (act.kind === "switch") {
      await say(`もどれ！ ${monName(B.me())}！`, {auto: 700});
      B.pi = act.i; B.st.me = freshStages(); B.part.add(B.pi); hud();
      await say(`ゆけっ！ ${monName(B.me())}！`, {auto: 800});
      const r = await doMove("foe", pickFoeMove()); if (r) return r;
    } else {
      const mine = act.move, theirs = pickFoeMove();
      const pm = MOVES[mine.id].prio || 0, fm = MOVES[theirs.id].prio || 0;
      const ps = effStat(B.me(), B.st.me, "spe"), fs = effStat(B.foe(), B.st.foe, "spe");
      const meFirst = pm !== fm ? pm > fm : ps !== fs ? ps > fs : rnd(2) === 0;
      const order = meFirst ? [["me", mine], ["foe", theirs]] : [["foe", theirs], ["me", mine]];
      let r = null;
      for (const [side, mv] of order) { r = await doMove(side, mv); if (r) return r; if (r === false) break; }
    }
    const r = await endOfTurn(); if (r) return r;
  }
}
async function chooseAction(){
  while (true) {
    const i = await choose(["たたかう", "バッグ", "なかま", "にげる"], {text: `${monName(B.me())}は どうする？`, cols: 2, cancel: false});
    if (i === 0) {
      const ms = B.me().moves;
      if (ms.every(m => m.pp <= 0)) return {kind: "move", move: {id: "struggle", pp: 1}};
      const j = await choose(ms.map(m => MOVES[m.id].name), {text: "", cols: 2,
        note: k => { const m = ms[k], d = MOVES[m.id]; return `PP ${m.pp}/${d.pp}　${d.type}${d.pow ? "　いりょく " + d.pow : ""}`; }});
      if (j < 0) continue;
      if (ms[j].pp <= 0) { await say("その わざは もう つかえない！"); continue; }
      return {kind: "move", move: ms[j]};
    }
    if (i === 1) { const id = await pickItem(true); if (id) return {kind: "item", id}; continue; }
    if (i === 2) { const k = await partyMenu(true); if (k >= 0) return {kind: "switch", i: k}; continue; }
    if (i === 3) return {kind: "run"};
  }
}
function pickFoeMove(){
  const ms = B.foe().moves.filter(m => m.pp > 0);
  return ms.length ? ms[rnd(ms.length)] : {id: "struggle", pp: 1};
}
// 返り値: "win" / "lose" / null（続く） / false（この手番の残りを打ち切り）
async function doMove(side, mv){
  const atk = side === "me" ? B.me() : B.foe(), def = side === "me" ? B.foe() : B.me();
  const as = B.st[side], ds = B.st[side === "me" ? "foe" : "me"], other = side === "me" ? "foe" : "me";
  if (atk.hp <= 0) return null;
  const d = MOVES[mv.id];
  if (atk.status === "par" && rnd(4) === 0) { await say(`${label(side)}は からだが しびれて うごけない！`, {auto: 1100}); return null; }
  if (mv.id !== "struggle") mv.pp = Math.max(0, mv.pp - 1);
  await say(`${label(side)}の ${d.name}！`, {auto: 900});
  if (d.acc) {
    const stg = clamp(as.acc, -6, 6);
    if (rnd(100) >= d.acc * ACC_TABLE[stg + 6] / 100) { await say(`しかし ${label(side)}の こうげきは はずれた！`, {auto: 1100}); return null; }
  }
  const tm = typeMult(d.type, MONS[def.sp].types);
  if (d.pow) {
    if (tm === 0) { await say(`${label(other)}には こうかが ないようだ…`, {auto: 1100}); return null; }
    const phys = PHYSICAL.has(d.type), crit = rnd(16) === 0;
    const A = effStat(atk, as, phys ? "atk" : "spa", crit ? "neg" : null), D = effStat(def, ds, phys ? "def" : "spd", crit ? "pos" : null);
    let dmg = Math.floor(Math.floor(Math.floor(2 * atk.lv / 5 + 2) * d.pow * A / D) / 50) + 2;
    if (crit) dmg *= 2;
    if (MONS[atk.sp].types.includes(d.type)) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor(dmg * tm);
    dmg = Math.max(1, Math.floor(dmg * (85 + rnd(16)) / 100));
    dmg = Math.min(dmg, def.hp);
    B.flash = {side: other, until: performance.now() + 450};
    def.hp -= dmg; hud(); await wait(500);
    if (crit) await say("きゅうしょに あたった！", {auto: 1000});
    if (tm > 1) await say("こうかは ばつぐんだ！", {auto: 1000});
    else if (tm < 1) await say("こうかは いまひとつの ようだ…", {auto: 1000});
    if (d.drain) { const h = Math.max(1, Math.floor(dmg * d.drain)); atk.hp = Math.min(maxHp(atk), atk.hp + h); hud(); await say(`${label(other)}から たいりょくを すいとった！`, {auto: 1000}); }
    if (d.recoil) { atk.hp = Math.max(0, atk.hp - Math.max(1, Math.floor(maxHp(atk) * d.recoil))); hud(); await say(`${label(side)}は はんどうで ダメージを うけた！`, {auto: 1000}); }
  }
  if (def.hp > 0 && d.st && !def.status && rnd(100) < d.st.chance) {
    const immune = (d.st.kind === "psn" && MONS[def.sp].types.some(t => t === "どく" || t === "はがね")) || tm === 0;
    if (!immune) { def.status = d.st.kind; hud();
      await say(d.st.kind === "psn" ? `${label(other)}は どくを あびた！` : `${label(other)}は まひして わざが でにくくなった！`, {auto: 1100}); }
    else if (!d.pow) await say(`${label(other)}には こうかが ないようだ…`, {auto: 1100});
  } else if (!d.pow && d.st && def.status) await say("しかし うまく きまらなかった！", {auto: 1000});
  if (d.eff && (d.eff.who === "self" || def.hp > 0)) {
    const tgtSide = d.eff.who === "self" ? side : other, st = B.st[tgtSide], k = d.eff.stat;
    const nv = clamp(st[k] + d.eff.n, -6, 6);
    if (nv === st[k]) await say(`${label(tgtSide)}の ${STAGE_NAME[k]}は もう ${d.eff.n < 0 ? "さがらない" : "あがらない"}！`, {auto: 1100});
    else { st[k] = nv; await say(`${label(tgtSide)}の ${STAGE_NAME[k]}が ${d.eff.n < 0 ? "さがった" : "あがった"}！`, {auto: 1100}); }
  }
  return await checkFaints();
}
async function checkFaints(){
  if (B.foe().hp <= 0) {
    B.hideFoe = true; hud();
    await say(`${foeLabel()}は たおれた！`, {auto: 1100});
    await giveExp();
    if (B.trainer && B.fi + 1 < B.foes.length) {
      B.fi++; B.hideFoe = false; B.st.foe = freshStages(); B.part = new Set([B.pi]);
      await say(`${B.trainer.name}は ${monName(B.foe())}を くりだした！`, {auto: 1200}); hud();
      if (B.me().hp > 0) return false;
    } else {
      if (B.trainer) {
        const prize = B.trainer.money * B.foe().lv; S.money += prize;
        await say(`${B.trainer.name}との しょうぶに かった！`);
        if (B.trainer.lose) await say(B.trainer.lose);
        await say(`${prize}円 てにいれた！`);
      }
      return "win";
    }
  }
  if (B.me().hp <= 0) {
    hud(); await say(`${monName(B.me())}は たおれた！`, {auto: 1100});
    if (!S.party.some(m => m.hp > 0)) return "lose";
    let k = -1; while (k < 0) k = await partyMenu(true, true);
    B.pi = k; B.st.me = freshStages(); B.part.add(B.pi); hud();
    await say(`ゆけっ！ ${monName(B.me())}！`, {auto: 800});
    return false;
  }
  return null;
}
async function endOfTurn(){
  for (const side of ["me", "foe"]) {
    const m = side === "me" ? B.me() : B.foe();
    if (m.hp > 0 && m.status === "psn") {
      m.hp = Math.max(0, m.hp - Math.max(1, Math.floor(maxHp(m) / 8))); hud();
      await say(`${label(side)}は どくの ダメージを うけている！`, {auto: 1000});
      const r = await checkFaints(); if (r && r !== false) return r;
    }
  }
  return null;
}
async function giveExp(){
  const f = B.foe(), sp = MONS[f.sp];
  const ids = [...B.part].filter(i => S.party[i].hp > 0); if (!ids.length) return;
  let e = Math.floor(Math.floor(sp.exp * f.lv / 7) / ids.length);
  if (B.trainer) e = Math.floor(e * 1.5);
  for (const i of ids) {
    const m = S.party[i]; if (m.lv >= 100) continue;
    const [k, n] = sp.ev; if (m.ev.reduce((a, b) => a + b, 0) + n <= 510) m.ev[k] = Math.min(255, m.ev[k] + n);
    m.exp += e; hud();
    await say(`${monName(m)}は ${e}けいけんちを もらった！`, {auto: 1100});
    while (m.lv < 100 && m.exp >= expAt(MONS[m.sp].grow, m.lv + 1)) {
      const before = maxHp(m); m.lv++; m.hp += maxHp(m) - before; hud();
      await say(`${monName(m)}は レベル${m.lv}に あがった！`);
      for (const [l, mv] of MONS[m.sp].learn) if (l === m.lv) await learnMove(m, mv);
    }
  }
}
async function learnMove(m, id){
  if (m.moves.some(x => x.id === id)) return;
  const nm = MOVES[id].name;
  if (m.moves.length < 4) { m.moves.push({id, pp: MOVES[id].pp}); await say(`${monName(m)}は あたらしく ${nm}を おぼえた！`); return; }
  await say(`${monName(m)}は ${nm}を おぼえようとしている…　しかし わざを 4つ おぼえるので せいいっぱいだ！`);
  while (true) {
    const i = await choose(["ほかの わざを わすれさせる", "おぼえるのを あきらめる"], {text: `${nm}の かわりに ほかの わざを わすれさせますか？`, cancel: false});
    if (i === 0) {
      const j = await choose(m.moves.map(x => MOVES[x.id].name), {text: "どの わざを わすれさせる？"});
      if (j < 0) continue;
      const old = MOVES[m.moves[j].id].name; m.moves[j] = {id, pp: MOVES[id].pp};
      await say(`1 2の…　ポカン！　${monName(m)}は ${old}の つかいかたを きれいに わすれた！　そして… ${nm}を おぼえた！`);
      return;
    }
    await say(`${monName(m)}は ${nm}を おぼえずに おわった！`); return;
  }
}
async function evolutions(){
  for (const m of S.party) {
    const evo = MONS[m.sp].evo;
    if (!evo || m.lv < evo[0] || m.hp <= 0) continue;
    const before = monName(m);
    await say(`おや！？ ${before}の ようすが……！`);
    for (let i = 0; i < 4; i++) { await fade(true); await wait(80); await fade(false); await wait(80); }
    const hpBefore = maxHp(m); m.sp = evo[1]; m.hp += maxHp(m) - hpBefore;
    await say(`おめでとう！ ${before}は ${monName(m)}に しんかした！`);
    for (const [l, mv] of MONS[m.sp].learn) if (l === m.lv) await learnMove(m, mv);
  }
  clearPanel();
}
async function blackout(){
  await say("めのまえが まっくらに なった！");
  S.money = Math.floor(S.money / 2);
  S.party.forEach(heal);
  await fade(true); S.map = S.lastHeal.map; S.x = S.lastHeal.x; S.y = S.lastHeal.y; S.dir = "down"; await wait(300); await fade(false);
  await say("さいごに やすんだ ところに もどった。おかねが はんぶんに なった…");
  clearPanel();
}
async function useItemInBattle(id){
  const it = ITEMS[id];
  if (it.ball) {
    if (B.trainer) { await say("ひとの モンスターを とったら ドロボウ！"); return "back"; }
    S.bag[id]--;
    await say(`${it.name}を なげた！`, {auto: 800});
    const f = B.foe(), M = maxHp(f), rate = MONS[f.sp].rate;
    let a = Math.floor((3 * M - 2 * f.hp) * rate * it.ball / (3 * M));
    if (f.status === "par" || f.status === "psn") a = Math.floor(a * 1.5);
    let shakes = 4;
    if (a < 255) { const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / Math.max(1, a)))))));
      shakes = 0; while (shakes < 4 && rnd(65536) < b) shakes++; }
    B.hideFoe = true; B.ball = 1; hud();
    for (let i = 0; i < Math.min(shakes, 3); i++) { B.ball = 2 + (i % 2); await wait(450); B.ball = 1; await wait(250); }
    if (shakes >= 4) {
      await say(`やったー！ ${monName(f)}を つかまえたぞ！`);
      if (S.party.length < 6) { f.status = f.status; S.party.push(f); await say(`${monName(f)}が なかまに くわわった！`); }
      else await say("てもちが いっぱいなので にがした…");
      return "caught";
    }
    B.ball = 0; B.hideFoe = false; hud();
    await say(["ああっ！ モンスターが ボールから でてしまった！", "ああ！ つかまえたと おもったのに！", "おしい！ もうすこしで つかまえられたのに！", "ざんねん！ もうすこしだった！"][shakes]);
    return null;
  }
  const k = await partyMenu(true, false, "どの なかまに つかう？");
  if (k < 0) return "back";
  const m = S.party[k];
  if (m.hp <= 0 || m.hp >= maxHp(m)) { await say("つかっても こうかが ないよ。"); return "back"; }
  S.bag[id]--; const h = Math.min(it.heal, maxHp(m) - m.hp); m.hp += h; hud();
  await say(`${monName(m)}の HPが ${h} かいふくした！`);
  return null;
}

// ================= なかま・バッグ・店 =================
function monLine(m){ return `${monName(m)} Lv${m.lv}　HP ${m.hp}/${maxHp(m)}${m.status ? "　" + (m.status === "psn" ? "どく" : "まひ") : ""}`; }
async function partyMenu(inBattle, forced = false, prompt = null){
  while (true) {
    const i = await choose(S.party.map(monLine), {text: prompt || (forced ? "つぎの なかまを えらんでください" : "なかま"), cancel: !forced});
    if (i < 0) return -1;
    if (prompt) return i;
    const m = S.party[i];
    const ops = inBattle ? ["いれかえる", "つよさを みる", "やめる"] : ["つよさを みる", "せんとうに する", "やめる"];
    const j = await choose(ops, {text: monLine(m)});
    const op = ops[j];
    if (op === "つよさを みる") await showStats(m);
    else if (op === "いれかえる") {
      if (m.hp <= 0) await say("たおれていて たたかえない！");
      else if (i === B.pi) await say("もう たたかっている！");
      else return i;
    } else if (op === "せんとうに する" && i > 0) { S.party.splice(i, 1); S.party.unshift(m); }
  }
}
async function showStats(m){
  const s = calcStats(m), sp = MONS[m.sp], next = m.lv < 100 ? expAt(sp.grow, m.lv + 1) - m.exp : 0;
  const lines = [`${sp.name}　Lv${m.lv}　${sp.types.join("・")}　せいかく ${NATURES[m.nat]}`,
    `HP ${m.hp}/${s[0]}　こうげき ${s[1]}　ぼうぎょ ${s[2]}`, `とくこう ${s[3]}　とくぼう ${s[4]}　すばやさ ${s[5]}`,
    `つぎの レベルまで ${next}`, "わざ: " + m.moves.map(x => `${MOVES[x.id].name}(${x.pp})`).join("　")];
  await say(lines.join("\n"));
}
function bagList(){ return Object.keys(S.bag).filter(k => S.bag[k] > 0); }
async function pickItem(inBattle){
  const ids = bagList();
  if (!ids.length) { await say("バッグは からっぽだ。"); return null; }
  const i = await choose(ids.map(k => `${ITEMS[k].name}　×${S.bag[k]}`), {text: "バッグ"});
  return i < 0 ? null : ids[i];
}
async function bagMenu(){
  while (true) {
    const id = await pickItem(false); if (!id) return;
    const it = ITEMS[id];
    if (it.ball) { await say("ここでは つかえない。"); continue; }
    const k = await partyMenu(false, false, "どの なかまに つかう？"); if (k < 0) continue;
    const m = S.party[k];
    if (m.hp <= 0 || m.hp >= maxHp(m)) { await say("つかっても こうかが ないよ。"); continue; }
    S.bag[id]--; const h = Math.min(it.heal, maxHp(m) - m.hp); m.hp += h;
    await say(`${monName(m)}の HPが ${h} かいふくした！`);
  }
}
async function shop(list){
  while (true) {
    const i = await choose(list.map(k => `${ITEMS[k].name}　${ITEMS[k].price}円`), {text: `なにを かいますか？　おかね ${S.money}円`});
    if (i < 0) { await say("またの おこしを！"); return; }
    const id = list[i], it = ITEMS[id];
    const qs = [1, 5, 10], j = await choose(qs.map(q => `${q}こ　${q * it.price}円`), {text: `${it.name}を いくつ？`});
    if (j < 0) continue;
    const cost = qs[j] * it.price;
    if (cost > S.money) { await say("おかねが たりないようです。"); continue; }
    S.money -= cost; S.bag[id] = (S.bag[id] || 0) + qs[j];
    await say(`${it.name}を ${qs[j]}こ かった！`);
  }
}

// ================= 戦闘の表示 =================
function bar(m){ const r = m.hp / maxHp(m); return `<div class="bar"><i style="width:${r * 100}%;background:${r > .5 ? "#3ccf6a" : r > .2 ? "#f2c23a" : "#e04848"}"></i></div>`; }
function hud(){
  if (!B) return;
  const f = B.foe(), m = B.me(), sp = MONS[m.sp];
  const lo = expAt(sp.grow, m.lv), hi = expAt(sp.grow, m.lv + 1), er = m.lv >= 100 ? 0 : clamp((m.exp - lo) / (hi - lo), 0, 1);
  const stt = x => x.status ? `<b class="st">${x.status === "psn" ? "どく" : "まひ"}</b>` : "";
  $("hud").innerHTML =
    (B.hideFoe ? "" : `<div class="box foe"><div class="nm">${monName(f)}${stt(f)}<span>Lv${f.lv}</span></div>${bar(f)}</div>`) +
    `<div class="box me"><div class="nm">${monName(m)}${stt(m)}<span>Lv${m.lv}</span></div>${bar(m)}<div class="hpn">${m.hp}/${maxHp(m)}</div><div class="exp"><i style="width:${er * 100}%"></i></div></div>`;
}
function drawBattle(){
  const g = ctx.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, "#f4f1d8"); g.addColorStop(1, "#cfe8b0");
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, 160);
  ctx.save(); ctx.translate((SW - 240) / 2, 0); drawBattleScene(); ctx.restore();
}
function drawBattleScene(){
  ctx.fillStyle = "#9ccf7a"; ctx.beginPath(); ctx.ellipse(176, 66, 44, 10, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(64, 140, 54, 12, 0, 0, 7); ctx.fill();
  const now = performance.now(), blink = s => B.flash && B.flash.side === s && now < B.flash.until && Math.floor(now / 70) % 2;
  if (!B.hideFoe && !blink("foe")) ctx.drawImage(monImg(B.foe().sp), 144, 4, 64, 64);
  if (B.ball) { const bx = 170 + (B.ball === 2 ? -3 : B.ball === 3 ? 3 : 0); px(ctx, "#202028", bx - 1, 49, 12, 12); px(ctx, "#e04848", bx, 50, 10, 5); px(ctx, "#fff", bx, 55, 10, 5); px(ctx, "#202028", bx, 54, 10, 1); px(ctx, "#fff", bx + 4, 53, 2, 3); }
  if (!blink("me")) { ctx.save(); ctx.translate(96, 0); ctx.scale(-1, 1); ctx.drawImage(monImg(B.me().sp), 0, 76, 72, 72); ctx.restore(); }
}
function drawTitle(){
  ctx.fillStyle = "#1f3a5f"; ctx.fillRect(0, 0, SW, 160);
  const ox = (SW - 240) / 2;
  ["happamo", "hinokoro", "mizupyon"].forEach((sp, i) => ctx.drawImage(monImg(sp), ox + 36 + i * 60, 70, 48, 48));
  ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("ポケット冒険記", SW / 2, 46);
}

// ================= 起動 =================
function loop(){
  frame++;
  if (mode === "title") drawTitle();
  else if (mode === "world") { World.update(); World.draw(); }
  else if (mode === "battle" && B) drawBattle();
  requestAnimationFrame(loop);
}
async function title(){
  const saved = loadGame();
  const ops = saved ? ["つづきから", "はじめから"] : ["はじめから"];
  const i = await choose(ops, {text: "", cancel: false});
  if (ops[i] === "つづきから") S = saved;
  else {
    await say("ようこそ！ ここは ぬまづ。モンスターと 人が いっしょに くらす まちだ。");
    let k = -1;
    while (k < 0) {
      k = await choose(STARTERS.map(s => `${MONS[s].name}（${MONS[s].types.join("・")}）`), {text: "さいしょの なかまを えらんでください", cancel: false});
      const ok = await choose(["はい", "いいえ"], {text: `${MONS[STARTERS[k]].name}で いいですか？`});
      if (ok !== 0) k = -1;
    }
    newGame(STARTERS[k]);
    await say(`${MONS[STARTERS[k]].name}が なかまに なった！`);
  }
  clearPanel(); mode = "world";
  $("place").textContent = World.map.name; $("place").classList.add("show"); setTimeout(() => $("place").classList.remove("show"), 1400);
}
setupInput();
fit(); addEventListener("resize", fit); addEventListener("orientationchange", () => setTimeout(fit, 200));
requestAnimationFrame(loop);
title();
