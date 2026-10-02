// ポケット冒険記のデータ。街・モンスター・技・道具はここに足す（動かす仕組みは engine.js）。
// 数値は第3世代の式に合わせてある（docs\調べ物\…\00_まとめ.md）。

// ---- タイプ（17）。攻撃側 → 防御側 の倍率。書いていない組は 1 倍
const TYPES = ["ノーマル","ほのお","みず","でんき","くさ","こおり","かくとう","どく","じめん","ひこう","エスパー","むし","いわ","ゴースト","ドラゴン","あく","はがね"];
const PHYSICAL = new Set(["ノーマル","かくとう","ひこう","どく","じめん","いわ","むし","ゴースト","はがね"]);
const CHART = {
  "ノーマル": {"いわ":.5,"ゴースト":0,"はがね":.5},
  "ほのお":   {"ほのお":.5,"みず":.5,"くさ":2,"こおり":2,"むし":2,"いわ":.5,"ドラゴン":.5,"はがね":2},
  "みず":     {"ほのお":2,"みず":.5,"くさ":.5,"じめん":2,"いわ":2,"ドラゴン":.5},
  "でんき":   {"みず":2,"でんき":.5,"くさ":.5,"じめん":0,"ひこう":2,"ドラゴン":.5},
  "くさ":     {"ほのお":.5,"みず":2,"くさ":.5,"どく":.5,"じめん":2,"ひこう":.5,"むし":.5,"いわ":2,"ドラゴン":.5,"はがね":.5},
  "こおり":   {"ほのお":.5,"みず":.5,"くさ":2,"こおり":.5,"じめん":2,"ひこう":2,"ドラゴン":2,"はがね":.5},
  "かくとう": {"ノーマル":2,"こおり":2,"どく":.5,"ひこう":.5,"エスパー":.5,"むし":.5,"いわ":2,"ゴースト":0,"あく":2,"はがね":2},
  "どく":     {"くさ":2,"どく":.5,"じめん":.5,"いわ":.5,"ゴースト":.5,"はがね":0},
  "じめん":   {"ほのお":2,"でんき":2,"くさ":.5,"どく":2,"ひこう":0,"むし":.5,"いわ":2,"はがね":2},
  "ひこう":   {"でんき":.5,"くさ":2,"かくとう":2,"むし":2,"いわ":.5,"はがね":.5},
  "エスパー": {"かくとう":2,"どく":2,"エスパー":.5,"あく":0,"はがね":.5},
  "むし":     {"ほのお":.5,"くさ":2,"かくとう":.5,"どく":.5,"ひこう":.5,"エスパー":2,"ゴースト":.5,"あく":2,"はがね":.5},
  "いわ":     {"ほのお":2,"こおり":2,"かくとう":.5,"じめん":.5,"ひこう":2,"むし":2,"はがね":.5},
  "ゴースト": {"ノーマル":0,"エスパー":2,"ゴースト":2,"あく":.5,"はがね":.5},
  "ドラゴン": {"ドラゴン":2,"はがね":.5},
  "あく":     {"かくとう":.5,"エスパー":2,"ゴースト":2,"あく":.5,"はがね":.5},
  "はがね":   {"ほのお":.5,"みず":.5,"でんき":.5,"こおり":2,"いわ":2,"はがね":.5},
};

// ---- 技。pow=威力 acc=命中(0は必中) prio=優先度
// eff: 能力ランク {who:"foe"|"self", stat:"atk|def|spa|spd|spe|acc", n}
// st: 状態異常 {kind:"psn"|"par", chance}   drain: 与えたダメージの割合を回復
const MOVES = {
  tackle:      {name:"たいあたり",     type:"ノーマル", pow:35, acc:95,  pp:35},
  scratch:     {name:"ひっかく",       type:"ノーマル", pow:40, acc:100, pp:35},
  quickattack: {name:"でんこうせっか", type:"ノーマル", pow:40, acc:100, pp:30, prio:1},
  headbutt:    {name:"ずつき",         type:"ノーマル", pow:70, acc:100, pp:15},
  growl:       {name:"なきごえ",       type:"ノーマル", pow:0,  acc:100, pp:40, eff:{who:"foe",stat:"atk",n:-1}},
  tailwhip:    {name:"しっぽをふる",   type:"ノーマル", pow:0,  acc:100, pp:30, eff:{who:"foe",stat:"def",n:-1}},
  leer:        {name:"にらみつける",   type:"ノーマル", pow:0,  acc:100, pp:30, eff:{who:"foe",stat:"def",n:-1}},
  harden:      {name:"かたくなる",     type:"ノーマル", pow:0,  acc:0,   pp:30, eff:{who:"self",stat:"def",n:1}},
  absorb:      {name:"すいとる",       type:"くさ",     pow:20, acc:100, pp:20, drain:.5},
  megadrain:   {name:"メガドレイン",   type:"くさ",     pow:40, acc:100, pp:10, drain:.5},
  razorleaf:   {name:"はっぱカッター", type:"くさ",     pow:55, acc:95,  pp:25},
  ember:       {name:"ひのこ",         type:"ほのお",   pow:40, acc:100, pp:25},
  flamewheel:  {name:"かえんぐるま",   type:"ほのお",   pow:60, acc:100, pp:25},
  watergun:    {name:"みずでっぽう",   type:"みず",     pow:40, acc:100, pp:25},
  bubblebeam:  {name:"バブルこうせん", type:"みず",     pow:65, acc:100, pp:20},
  mudslap:     {name:"どろかけ",       type:"じめん",   pow:20, acc:100, pp:10, eff:{who:"foe",stat:"acc",n:-1}},
  sandattack:  {name:"すなかけ",       type:"じめん",   pow:0,  acc:100, pp:15, eff:{who:"foe",stat:"acc",n:-1}},
  bite:        {name:"かみつく",       type:"あく",     pow:60, acc:100, pp:25},
  poisonsting: {name:"どくばり",       type:"どく",     pow:15, acc:100, pp:35, st:{kind:"psn",chance:30}},
  stringshot:  {name:"いとをはく",     type:"むし",     pow:0,  acc:95,  pp:40, eff:{who:"foe",stat:"spe",n:-1}},
  peck:        {name:"つつく",         type:"ひこう",   pow:35, acc:100, pp:35},
  wingattack:  {name:"つばさでうつ",   type:"ひこう",   pow:60, acc:100, pp:35},
  thundershock:{name:"でんきショック", type:"でんき",   pow:40, acc:100, pp:30, st:{kind:"par",chance:10}},
  thunderwave: {name:"でんじは",       type:"でんき",   pow:0,  acc:100, pp:20, st:{kind:"par",chance:100}},
  struggle:    {name:"わるあがき",     type:"ノーマル", pow:50, acc:0,   pp:1,  recoil:.25},
};

// ---- モンスター。base = HP/攻撃/防御/特攻/特防/素早さ（第3世代と同じ並び）
// exp=基礎経験値 grow=成長の型(f 80万 / mf 100万 / ms 105万 / s 125万) rate=捕まえやすさ(3〜255)
// ev=倒したときに入る努力値 [能力の番号, 量]  learn=[レベル, 技]  evo=[レベル, 進化先]
// art=絵の名前（SPRITES）  pal=絵の色 {a:体, b:差し色}
const MONS = {
  happamo:  {name:"ハッパモ",   types:["くさ"],   base:[40,45,35,65,55,70],  exp:65,  grow:"ms", rate:45,  ev:[5,1], art:"happamo", pal:{a:"#6cc04a",b:"#2f7d32"},
             learn:[[1,"tackle"],[1,"leer"],[6,"absorb"],[11,"quickattack"],[16,"razorleaf"],[21,"megadrain"]], evo:[16,"moritokage"]},
  moritokage:{name:"モリトカゲ",types:["くさ"],   base:[50,65,45,85,65,95],  exp:141, grow:"ms", rate:45,  ev:[5,2], art:"happamo", pal:{a:"#3f9a3a",b:"#c8e66a"},
             learn:[[1,"tackle"],[1,"leer"],[6,"absorb"],[11,"quickattack"],[16,"razorleaf"],[23,"megadrain"]]},
  hinokoro: {name:"ヒノコロ",   types:["ほのお"], base:[45,60,40,70,50,45],  exp:65,  grow:"ms", rate:45,  ev:[3,1], art:"hinokoro", pal:{a:"#f08a3c",b:"#ffd34d"},
             learn:[[1,"scratch"],[1,"growl"],[7,"ember"],[13,"quickattack"],[19,"flamewheel"]], evo:[16,"homuraio"]},
  homuraio: {name:"ホムライオ", types:["ほのお"], base:[60,85,60,85,60,55],  exp:142, grow:"ms", rate:45,  ev:[1,2], art:"hinokoro", pal:{a:"#d9502b",b:"#ffb02e"},
             learn:[[1,"scratch"],[1,"growl"],[7,"ember"],[13,"quickattack"],[17,"flamewheel"]]},
  mizupyon: {name:"ミズピョン", types:["みず"],   base:[50,70,50,50,50,40],  exp:65,  grow:"ms", rate:45,  ev:[1,1], art:"mizupyon", pal:{a:"#4aa3df",b:"#ffe9a8"},
             learn:[[1,"tackle"],[1,"growl"],[6,"mudslap"],[10,"watergun"],[19,"bubblebeam"]], evo:[16,"numapyon"]},
  numapyon: {name:"ヌマピョン", types:["みず"],   base:[70,85,70,60,70,50],  exp:143, grow:"ms", rate:45,  ev:[1,2], art:"mizupyon", pal:{a:"#2f6fb5",b:"#f2c76b"},
             learn:[[1,"tackle"],[1,"growl"],[6,"mudslap"],[10,"watergun"],[20,"bubblebeam"]]},
  koronezu: {name:"コロネズ",   types:["ノーマル"], base:[38,30,41,30,41,60], exp:60,  grow:"mf", rate:255, ev:[5,1], art:"koronezu", pal:{a:"#c9a77a",b:"#6b4a2b"},
             learn:[[1,"tackle"],[1,"growl"],[5,"tailwhip"],[9,"headbutt"],[13,"sandattack"]], evo:[20,"hashirinezu"]},
  hashirinezu:{name:"ハシリネズ",types:["ノーマル"],base:[78,70,61,50,61,100],exp:128, grow:"mf", rate:90,  ev:[5,2], art:"koronezu", pal:{a:"#e6d7bd",b:"#8a5a2b"},
             learn:[[1,"tackle"],[1,"growl"],[5,"tailwhip"],[9,"headbutt"],[13,"sandattack"]]},
  kurowan:  {name:"クロワン",   types:["あく"],   base:[35,55,35,30,30,35],  exp:55,  grow:"mf", rate:255, ev:[1,1], art:"kurowan", pal:{a:"#55555f",b:"#e04848"},
             learn:[[1,"tackle"],[5,"leer"],[9,"sandattack"],[13,"bite"]]},
  imomu:    {name:"イモムー",   types:["むし"],   base:[45,45,35,20,30,20],  exp:54,  grow:"mf", rate:255, ev:[0,1], art:"imomu", pal:{a:"#9fd35a",b:"#e8c33a"},
             learn:[[1,"tackle"],[1,"stringshot"],[5,"poisonsting"],[9,"harden"]]},
  tsubamecchi:{name:"ツバメッチ",types:["ノーマル","ひこう"],base:[40,55,30,30,30,85],exp:59,grow:"ms",rate:200,ev:[5,1],art:"tsubame",pal:{a:"#3a4f8f",b:"#e04848"},
             learn:[[1,"peck"],[1,"growl"],[8,"quickattack"],[13,"wingattack"]]},
  pirimogu: {name:"ピリモグ",   types:["でんき"], base:[40,45,40,65,40,65],  exp:59,  grow:"mf", rate:120, ev:[5,1], art:"pirimogu", pal:{a:"#f5d43a",b:"#e05a3a"},
             learn:[[1,"tackle"],[4,"thunderwave"],[9,"thundershock"],[13,"quickattack"]]},
};
const STARTERS = ["happamo","hinokoro","mizupyon"];

// ---- 絵（16×16）。k=ふち w=白 a=体 b=差し色 .=透明
const SPRITES = {
  happamo: ["........kk......",".......kbbk.....","......kbbk......","....kkkbkkk.....","...kaaaaaaak....","..kaaaaaaaaak...","..kawkaaawkak...","..kaaaaaaaaak...","..kaaakkkaaak...","...kaaaaaaak....","....kbbbbbk.....","...kabbbbbak....","..kaak...kaak...","..kkk.....kkk...","................","................"],
  hinokoro:[".....k...k......","....kbk.kbk.....","....kbbkbbk.....","...kaaaaaaak....","..kaaaaaaaaak...","..kawkaaawkak...","..kaaaabaaaak...","..kaaabbbaaak...","...kaaaaaaak....","....kaaaaak.....","...kaaaaaaak....","..kaakaaakaak...","..kak.....kak...","..kk.......kk...","................","................"],
  mizupyon:["................","...kkk...kkk....","..kwkkk.kwkkk...","..kaaakkkaaak...",".kaaaaaaaaaaak..",".kaaaaaaaaaaak..",".kaakkkkkkkaak..",".kaaabbbbbaaak..","..kaabbbbbaak...","...kaaaaaaak....","..kaak...kaak...",".kaak.....kaak..",".kkk.......kkk..","................","................","................"],
  koronezu:["................","..kk.......kk...",".kbak.....kabk..",".kaaakkkkkaaak..","..kaaaaaaaaak...","..kawkaaawkak...","..kaaaakaaaak...","...kaawwwaak....","....kaaaaak.....","...kaaaaaaak.kk.","..kaaaaaaaaakbk.","..kaaaaaaaaakk..","...kak...kak....","...kk.....kk....","................","................"],
  kurowan: ["................","..k.........k...","..kak.....kak...","..kaakkkkkaak...","..kaaaaaaaaak...","..kabbkaakbbk...","..kaaaaaaaaak...","...kaawwwaak....","....kaaaaak.....","...kaaaaaaak....","..kaaaaaaaaak...","..kaak...kaak...","..kkk.....kkk...","................","................","................"],
  imomu:   ["................","................","....k...k.......",".....k.k........","....kaaak.......","...kawawak......","...kaaaaak......","...kbaaabkkkk...","....kaaakaaaak..","....kbabkbaabk..","...kaaakaaaaak..","...kbbbkbbbbk...","....kkk.kkkk....","................","................","................"],
  tsubame: ["................","....kkkk........","...kaaaak.......","..kawkaaak......",".kbkaaaaak......","..kkaaaaaakk....","...kawwaaaaak...","...kawwwaaaaakk.","....kawwaaaaaak.",".....kkaaaaakk..",".......kaak.....","......kak.kak...","......kk...kk...","................","................","................"],
  pirimogu:["................","..kk.......kk...",".kbbk.....kbbk..",".kbaak...kaabk..","..kaaakkkaaak...","..kaaaaaaaaak...","..kawkaaawkak...","..kbbaakaabbk...","...kaaaaaaak....","....kaaaaak..kk.","...kaaaaaaakkbk.","..kaaaaaaaaakk..","...kak...kak....","...kk.....kk....","................","................"],
};

// ---- 道具。heal=回復量 ball=捕獲の倍率
const ITEMS = {
  potion:      {name:"きずぐすり",     price:300, heal:20},
  superpotion: {name:"いいきずぐすり", price:700, heal:50},
  ball:        {name:"ボール",         price:200, ball:1},
  greatball:   {name:"いいボール",     price:600, ball:1.5},
};

// ---- トレーナーの種類。money=基本額（賞金 = 基本額 × 最後のモンスターのレベル）
const TRAINER_CLASS = {
  tanpan: {name:"たんパンこぞう", money:16},
  mini:   {name:"ミニスカート",   money:16},
};

// ---- マップ。1文字=1マス
// .地面 ,草むら =道 f花 T木 R屋根 #壁 D扉 ~水 S看板 s砂浜の看板 F柵 b砂浜 K瓦屋根 J旅館の壁 h生け垣 P松 L灯籠 o岩
// 屋内: _床 t畳 W壁 C台 M出口 H階段   edge:{left:"~"} 地図の外の左側を海に見せる
// warps: [x, y, 行き先, x, y]   npcs: look={cap,shirt} talk=台詞の配列
//   heal:true 回復  shop:[道具] 店  trainer:{cls,name,party:[[種,Lv]],after:[台詞]} sight=見える距離
// grass: {rate: 出会いやすさ(草むら20), slots: 12枠 [種, 最低Lv, 最高Lv]（枠の確率は 20/20/10/10/10/10/5/5/4/4/1/1）}
const MAPS = {
  // 内浦・三津。OpenStreetMap の配置（tools\osm_preview.py の下敷き）を元に、遊びやすく縮めた。北が上。
  // 本物との違い：安田屋旅館の玄関は本物は道（西）向き → 絵の都合で南向きにし、前を庭にした。
  mito: {
    name:"内浦・三津", fill:"T", edge:{left:"~"},
    rows:[
      "~~~~~~~~~bbbrrTTTTTTTTTTTTTTTT",
      "~~~~~~~~~bbbrr..RRRRR...TTTTTT",
      "~~~~~~~~~bbbrr..RRRRR...TTTTTT",
      "~~~~~~~~~bbbrr..##D##..S.TTTTT",
      "~~~~~~~~bbbbrr.........f.TTTTT",
      "~~~~~~~~bbbbrr..RRRR......TTTT",
      "~~~~~~~~bbbbrr..#D##.......TTT",
      "~~~~~~~bbbbbrr.............TTT",
      "~~~~~~~bbsbbrrhhhhhhhhhhh.f.TT",
      "~~~~~~obbbbbrrhKKKKKKKKKh..fTT",
      "~~~~~~obbbbbrrhKKKKKKKKKh...TT",
      "~~~~~~obbbbbrrhKKKKKKKKKh....T",
      "~~~~~~~bbbbbrrhJJJJDJJJJh....T",
      "~~~~~~~bbbbbrrhP...=..PLh....T",
      "~~~~~~~bbbbbrrS.~~.=..f.h...TT",
      "~~~~~~~bbbbbrr======..P.h..TTT",
      "~~~~~~~bbbbbrrhP..f...ffh..TTT",
      "~~~~~~~bbbbbrrhhhhhhhhhhh..TTT",
      "~~~~~~~~bbbbrr............TTTT",
      "~~~~~~~~bbbbrr..RRRR..RRR..TTT",
      "~~~~~~~~~bbbrr..#D##..#D#..TTT",
      "~~~~~~~~~bbbrr.S..........TTTT",
      "~~~~~~~~~~bbrr.......TTTTTTTTT",
      "~~~~~~~~~~~bSSTTTTTTTTTTTTTTTT",
    ],
    warps:[[12,0,"route1",8,17],[13,0,"route1",9,17],[19,12,"yasudaya1",6,6]],
    signs:{
      "9,8":"三津海水浴場　すきとおった 海の むこうに 富士山が 見える",
      "14,14":"安田屋旅館",
      "23,3":"千鳥海館",
      "15,21":"↓ 伊豆・三津シーパラダイス",
      "12,23":"この先は まだ 通れない。（じゅんびちゅう）", "13,23":"この先は まだ 通れない。（じゅんびちゅう）",
      "18,3":"カギが かかっている。", "17,6":"カギが かかっている。", "17,20":"カギが かかっている。", "23,20":"カギが かかっている。",
    },
    npcs:[
      {id:"mitoFisher", x:8, y:12, dir:"right", look:{cap:"#2f6fb5",shirt:"#d9d2b8"}, talk:["三津の 海は おだやかで いいぞ。","なみのりが できれば 淡島まで すぐなんだがなあ。"]},
      {id:"mitoGirl", x:15, y:4, dir:"down", look:{cap:"#e98c2a",shirt:"#f5d43a"}, talk:["北に いくと 松月が あるよ。","みかんの どら焼きが おいしいんだ！"]},
      {id:"mitoOld", x:18, y:18, dir:"left", look:{cap:"#888888",shirt:"#6b8e5a"}, talk:["南の シーパラは まだ じゅんびちゅう だそうじゃ。"]},
    ],
  },
  yasudaya1: {
    name:"安田屋旅館", fill:"",
    rows:[
      "WWWWWWWWWWWWWW",
      "WttttW_____H_W",
      "WttttW_______W",
      "Wtttt________W",
      "WttttW__CCC__W",
      "WWWWWW_______W",
      "W____________W",
      "WWWWWWMMWWWWWW",
    ],
    warps:[[6,7,"mito",19,13],[7,7,"mito",19,13],[11,1,"yasudaya2",11,2]],
    npcs:[
      {id:"okami", x:9, y:3, dir:"down", look:{cap:"#3a2a2a",shirt:"#c0504d"}, heal:true, talk:["おかえりなさい。すこし やすんで いきなさいな。"]},
      {id:"nakai", x:2, y:2, dir:"right", look:{cap:"#3a2a2a",shirt:"#6b8e5a"}, talk:["大広間の そうじちゅう です。","2階の おへやからは 海が よく 見えますよ。"]},
      {id:"guest", x:2, y:6, dir:"right", look:{cap:"#333333",shirt:"#5a6f9a"}, talk:["文豪も とまったという 旅館なんだって。","いい ところだねえ。"]},
    ],
  },
  yasudaya2: {
    name:"安田屋旅館 2かい", fill:"",
    rows:[
      "WWWWWWWWWWWWWW",
      "WttttttW___H_W",
      "WttttttW_____W",
      "Wtttttt______W",
      "WttttttW_____W",
      "WttttttW_____W",
      "WWWWWWWWWWWWWW",
    ],
    warps:[[11,1,"yasudaya1",11,2]],
    signs:{"2,0":"まどの 外に 内浦の 海と 淡島が 見える。","3,0":"まどの 外に 内浦の 海と 淡島が 見える。","4,0":"まどの 外に 内浦の 海と 淡島が 見える。"},
  },
  route1: {
    name:"1ばんどうろ", fill:"T",
    rows:[
      "TTTTTTT==TTTTTTT",
      "T,,,,,,==.....TT",
      "T,,,,,,==......T",
      "T,,,,,...,,,,..T",
      "T.....,,,,,,,..T",
      "T..TT..,,,,,...T",
      "T..TT.......S..T",
      "T.......==.....T",
      "TFFFFF..==..FFFT",
      "T,,,,,..==.....T",
      "T,,,,,,.==..,,,T",
      "T,,,,,,.==..,,,T",
      "T.......==..,,,T",
      "T..ff...==.....T",
      "TTTT....==..TTTT",
      "T,,,,,,,==,,,,,T",
      "T,,,,,,,==,,,,,T",
      "T.......==.....T",
      "TTTTTTTT==TTTTTT",
    ],
    warps:[[8,18,"mito",12,1],[9,18,"mito",13,1],[7,0,"town2",10,11],[8,0,"town2",11,11]],
    signs:{"12,6":"1ばんどうろ　↑ ヒダマリ町　↓ コモレビ町"},
    grass:{rate:20, slots:[["koronezu",2,3],["kurowan",2,3],["koronezu",3,4],["imomu",2,3],["kurowan",3,4],["imomu",3,3],
                           ["tsubamecchi",3,4],["tsubamecchi",4,4],["koronezu",4,4],["kurowan",4,4],["pirimogu",4,4],["pirimogu",5,5]]},
    npcs:[
      {id:"r1ken", x:12, y:9, dir:"left", sight:4, look:{cap:"#2f6fb5",shirt:"#f5d43a"},
       trainer:{cls:"tanpan", name:"ケン", party:[["koronezu",3],["imomu",4]], intro:["目と目が あったら しょうぶだ！"], lose:"くそー まけた！", after:["草むらで きたえると つよくなるよ。"]}},
      {id:"r1old", x:4, y:13, dir:"down", look:{cap:"#888888",shirt:"#6b8e5a"}, talk:["草むらでは 1歩ごとに 出会うかどうかが きまるんじゃ。","たたかった あとは すこしの あいだ 出てこんぞ。"]},
    ],
  },
  town2: {
    name:"ヒダマリ町", fill:"T",
    rows:[
      "TTTTTTTTTTTTTTTTTTTT",
      "T..................T",
      "T.RRRRR....RRRR....T",
      "T.#####....####....T",
      "T.##D##....##D#....T",
      "T.........==.......T",
      "T..ff.....==...S...T",
      "T.........==.......T",
      "T~~~......==....ff.T",
      "T~~~......==.......T",
      "T.........==.......T",
      "T.........==.......T",
      "TTTTTTTTTT==TTTTTTTT",
    ],
    warps:[[10,12,"route1",7,1],[11,12,"route1",8,1],[4,4,"center",4,5],[13,4,"shop",4,5]],
    signs:{"15,6":"ヒダマリ町　ひだまりの あたたかい 町"},
    npcs:[
      {id:"t2boy", x:7, y:9, dir:"down", look:{cap:"#3a8f5a",shirt:"#ffffff"}, talk:["左の たてものは かいふくじょ。","右は どうぐやさんだよ。"]},
    ],
  },
  center: {
    name:"かいふくじょ", fill:"",
    rows:[
      "WWWWWWWWWW",
      "W________W",
      "W___CC___W",
      "W________W",
      "W________W",
      "W________W",
      "WWWWMMWWWW",
    ],
    warps:[[4,6,"town2",4,5],[5,6,"town2",4,5]],
    npcs:[
      {id:"nurse", x:4, y:1, dir:"down", look:{cap:"#ffffff",shirt:"#f3a6c8"}, heal:true, talk:["いらっしゃいませ！ モンスターを げんきに しますね。"]},
    ],
  },
  shop: {
    name:"どうぐや", fill:"",
    rows:[
      "WWWWWWWWWW",
      "W________W",
      "W___CC___W",
      "W________W",
      "W________W",
      "W________W",
      "WWWWMMWWWW",
    ],
    warps:[[4,6,"town2",13,5],[5,6,"town2",13,5]],
    npcs:[
      {id:"clerk", x:4, y:1, dir:"down", look:{cap:"#2f6fb5",shirt:"#7fb3e6"}, shop:["ball","greatball","potion","superpotion"], talk:["いらっしゃいませ！"]},
    ],
  },
};
const START = {map:"yasudaya2", x:3, y:3, dir:"down", money:3000, bag:{potion:3, ball:5}};
