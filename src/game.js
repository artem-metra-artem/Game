(() => {
  const ROUND_COUNT = 15;
  const STORAGE_KEY = 'mathquest_v05_save';
  const SHOP_AFTER_DEFEATS = new Set([2, 4]);

  const SPRITE_DIR = 'assets/sprites';
  const spritePath = (name) => `${SPRITE_DIR}/${name}.png`;

  const HERO_SPRITES = {
    hero_hp3: spritePath('hero_high_hp'),
    hero_hp2: spritePath('hero_mid_hp'),
    hero_hp1: spritePath('hero_low_hp'),
    hero_attack: spritePath('hero_attack'),
    hero_hurt: spritePath('hero_damaged'),
    hero_dead: spritePath('hero_defeated'),
    hero_win: spritePath('hero_victorious')
  };

  const SLUG_SPRITES = {
    idle: spritePath('slug_idle'),
    attack: spritePath('slug_attack'),
    hit: spritePath('slug_damage'),
    defeated: spritePath('slug_defeated')
  };

  const MONSTERS = [
    { emoji: '👾', name: 'Математичний слиз', hp: 100, bg1: '#071126', bg2: '#173c67', slug: true },
    { emoji: '👹', name: 'Лінійний гоблін', hp: 110, bg1: '#21101d', bg2: '#5a2248' },
    { emoji: '🐲', name: 'Дробовий дракон', hp: 125, bg1: '#0e1f18', bg2: '#1b5c45' },
    { emoji: '🧠', name: 'Нерівний мозок', hp: 115, bg1: '#161123', bg2: '#502a70' },
    { emoji: '💀', name: 'Фінальний бос', hp: 150, bg1: '#1a1110', bg2: '#63302b' }
  ];

  const TYPES = ['add','sub','mul','div','frac_add','frac_sub','frac_mul','frac_div','prop','expand','eq','ineq','percent'];

  function heroFrameForLife(life) {
    if (life <= 0) return 'hero_dead';
    if (life === 1) return 'hero_hp1';
    if (life === 2) return 'hero_hp2';
    return 'hero_hp3';
  }

  function renderHeroFrame(frame) {
    const src = HERO_SPRITES[frame];
    if (!src) return;
    for (const el of [els.heroSprite, els.heroSpriteMenu].filter(Boolean)) {
      el.innerHTML = `<img src="${src}" alt="hero sprite" draggable="false">`;
    }
  }

  function setHeroState(frame, revert = null, delay = 0) {
    window.clearTimeout(STATE.heroTimer);
    STATE.heroTimer = null;
    renderHeroFrame(frame);
    if (revert) {
      STATE.heroTimer = window.setTimeout(() => {
        if (STATE.heroTimer) {
          // timer still active; allow revert
        }
        renderHeroFrame(revert);
      }, delay);
    }
  }const STATE = {
    screen: 'menu',
    lifeMax: 3,
    life: 3,
    coins: 0,
    xp: 0,
    score: 0,
    question: 1,
    combo: 0,
    bestCombo: 0,
    correctCount: 0,
    monsterIndex: 0,
    monsterMaxHp: 100,
    monsterHp: 100,
    damageBoostTurns: 0,
    hintActive: false,
    used: new Set(),
    current: null,
    locked: false,
    savedBestScore: 0,
    savedWins: 0,
    pendingAdvance: false,
    pendingFinal: false,
    defeatedMonsters: 0,
    soundsEnabled: true,
    heroTimer: null
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    menuScreen: $('menuScreen'),
    gameScreen: $('gameScreen'),
    shopScreen: $('shopScreen'),
    endScreen: $('endScreen'),
    startBtn: $('startBtn'),
    restartBtn: $('restartBtn'),
    closeShopBtn: $('closeShopBtn'),
    arena: $('arena'),
    battlePanel: $('battlePanel'),
    sword: $('sword'),
    critBanner: $('critBanner'),
    heroSprite: $('heroSprite'),
    heroSpriteMenu: $('heroSpriteMenu'),
    monsterSprite: $('monsterSprite'),
    monsterName: $('monsterName'),
    menuMonsterName: $('menuMonsterName'),
    menuMonsterSprite: $('menuMonsterSprite'),
    question: $('question'),
    subnote: $('subnote'),
    answers: $('answers'),
    feedback: $('feedback'),
    nextBtn: $('nextBtn'),
    typeLabel: $('typeLabel'),
    enemyBar: $('enemyBar'),
    playerBar: $('playerBar'),
    uiLife: $('uiLife'),
    uiCoins: $('uiCoins'),
    uiXp: $('uiXp'),
    uiCombo: $('uiCombo'),
    uiCombo2: $('uiCombo2'),
    uiLevel: $('uiLevel'),
    uiLevel2: $('uiLevel2'),
    uiRound: $('uiRound'),
    uiRound2: $('uiRound2'),
    uiRank: $('uiRank'),
    uiDmg: $('uiDmg'),
    uiDmg2: $('uiDmg2'),
    uiEnemyHpText: $('uiEnemyHpText'),
    uiPlayerHpText: $('uiPlayerHpText'),
    shopMsg: $('shopMsg'),
    shopGrid: $('shopGrid'),
    endTitle: $('endTitle'),
    endRank: $('endRank'),
    endDesc: $('endDesc'),
    questChest: $('questChest'),
    finalScore: $('finalScore'),
    finalCoins: $('finalCoins'),
    finalCorrect: $('finalCorrect'),
    finalBestCombo: $('finalBestCombo'),
    finalBestScore: $('finalBestScore'),
    finalSaved: $('finalSaved'),
  };

  function setScreen(name) {
    STATE.screen = name;
    els.menuScreen.classList.toggle('active', name === 'menu');
    els.gameScreen.classList.toggle('active', name === 'game');
    els.shopScreen.classList.toggle('active', name === 'shop');
    els.endScreen.classList.toggle('active', name === 'end');
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(a) {
    return [...a].sort(() => Math.random() - 0.5);
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function simplifyFraction(n, d) {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function frac(n, d) {
    const s = simplifyFraction(n, d);
    if (s.d === 1) return `${s.n}`;
    return `<span class="frac"><span class="top">${s.n}</span><span class="bottom">${s.d}</span></span>`;
  }

  function typeLabel(type) {
    const map = {
      add:'Додавання', sub:'Віднімання', mul:'Множення', div:'Ділення',
      frac_add:'Дроби', frac_sub:'Дроби', frac_mul:'Дроби', frac_div:'Дроби',
      prop:'Пропорції', expand:'Дужки', eq:'Рівняння', ineq:'Нерівності', percent:'Відсотки'
    };
    return map[type] || type;
  }

  function currentMonster() {
    return MONSTERS[Math.min(STATE.monsterIndex, MONSTERS.length - 1)];
  }

  function isFinalMonster() {
    return STATE.monsterIndex >= MONSTERS.length - 1;
  }

  function updateTheme() {
    const m = currentMonster();
    document.body.style.background = `linear-gradient(180deg, ${m.bg1}, ${m.bg2})`;
  }

  function rankFor(score, accuracy, life, bestCombo) {
    const composite = score + Math.floor(accuracy * 40) + life * 10 + bestCombo * 4;
    if (composite >= 250) return 'S';
    if (composite >= 190) return 'A';
    if (composite >= 135) return 'B';
    return 'C';
  }

  function currentDamagePreview() {
    const base = 20;
    const comboBonus = Math.min(STATE.combo, 6) * 3;
    const boost = STATE.damageBoostTurns > 0 ? 12 : 0;
    return base + comboBonus + boost;
  }

  function uiRankPreview() {
    const accuracy = STATE.question > 1 ? STATE.correctCount / (STATE.question - 1) : 0;
    return rankFor(STATE.score, accuracy, STATE.life, STATE.bestCombo);
  }

  function playTone(freq = 440, duration = 0.12, type = 'sine', vol = 0.06, slide = 0) {
    if (!STATE.soundsEnabled) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = playTone.ctx || (playTone.ctx = new AC());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + duration);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration + 0.02);
  }

  function saveLocal() {
    const data = {
      bestScore: Math.max(STATE.savedBestScore, STATE.score),
      wins: STATE.savedWins + (STATE.pendingFinal ? 1 : 0)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    STATE.savedBestScore = data.bestScore;
    STATE.savedWins = data.wins;
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      STATE.savedBestScore = Number(data.bestScore || 0);
      STATE.savedWins = Number(data.wins || 0);
    } catch {}
  }

  function updateUI() {
    els.uiLife.textContent = STATE.life;
    els.uiCoins.textContent = STATE.coins;
    els.uiXp.textContent = STATE.xp;
    els.uiCombo.textContent = STATE.combo;
    els.uiCombo2.textContent = STATE.combo;
    els.uiLevel.textContent = STATE.defeatedMonsters + 1;
    els.uiLevel2.textContent = STATE.defeatedMonsters + 1;
    els.uiRound.textContent = `${Math.min(STATE.question, ROUND_COUNT)}/${ROUND_COUNT}`;
    els.uiRound2.textContent = `${Math.min(STATE.question, ROUND_COUNT)}/${ROUND_COUNT}`;
    els.uiRank.textContent = uiRankPreview();
    els.uiDmg.textContent = currentDamagePreview();
    els.uiDmg2.textContent = currentDamagePreview();

    const enemyPct = Math.max(0, Math.min(100, (STATE.monsterHp / STATE.monsterMaxHp) * 100));
    const playerPct = Math.max(0, Math.min(100, (STATE.life / STATE.lifeMax) * 100));
    els.enemyBar.style.width = `${enemyPct}%`;
    els.playerBar.style.width = `${playerPct}%`;
    els.uiEnemyHpText.textContent = `${Math.max(0, STATE.monsterHp)}/${STATE.monsterMaxHp}`;
    els.uiPlayerHpText.textContent = `${STATE.life}/${STATE.lifeMax}`;

    const m = currentMonster();
    if (!els.monsterSprite.classList.contains('hit') && !els.monsterSprite.classList.contains('dead') && !els.monsterSprite.classList.contains('attack')) {
      renderMonsterFrame('idle');
    }
    els.monsterName.textContent = m.name;
    els.menuMonsterName.textContent = currentMonster().name;
    els.finalBestScore.textContent = STATE.savedBestScore;
  }

  function renderMonsterFrame(frame = 'idle') {
    const m = currentMonster();
    const targets = [els.monsterSprite, els.menuMonsterSprite].filter(Boolean);
    targets.forEach(el => {
      if (m.slug) {
        el.classList.remove('emojiMonster');
        el.innerHTML = `<img src="${SLUG_SPRITES[frame] || SLUG_SPRITES.idle}" alt="${m.name}: ${frame}" draggable="false">`;
      } else {
        el.classList.add('emojiMonster');
        el.textContent = m.emoji;
      }
    });
  }

  function setMonsterVisual() {
    els.monsterSprite.classList.remove('hit', 'dead', 'attack');
    els.monsterSprite.style.opacity = '1';
    els.monsterSprite.style.transform = '';
    renderMonsterFrame('idle');
    updateTheme();
  }

  function animateHeroAttack(crit) {
    els.heroSprite.classList.remove('attack');
    void els.heroSprite.offsetWidth;
    els.heroSprite.classList.add('attack');

    els.sword.classList.remove('active');
    void els.sword.offsetWidth;
    els.sword.classList.add('active');

    setTimeout(() => {
      renderMonsterFrame('hit');
      els.monsterSprite.classList.add('hit');
      setTimeout(() => {
        if (STATE.monsterHp > 0) renderMonsterFrame('idle');
      }, 360);
      playTone(crit ? 660 : 520, 0.11, crit ? 'triangle' : 'sine', crit ? 0.08 : 0.06, crit ? -180 : -80);
      if (crit) {
        els.critBanner.classList.remove('show');
        void els.critBanner.offsetWidth;
        els.critBanner.classList.add('show');
      }
    }, 200);
  }

  function animateMiss() {
    els.heroSprite.classList.remove('attack');
    void els.heroSprite.offsetWidth;
    els.heroSprite.classList.add('attack');
    renderMonsterFrame('attack');
    els.monsterSprite.classList.remove('attack');
    void els.monsterSprite.offsetWidth;
    els.monsterSprite.classList.add('attack');
    setTimeout(() => renderMonsterFrame('idle'), 420);
    playTone(180, 0.12, 'square', 0.05, -60);
  }

  function animateMonsterDeath() {
    renderMonsterFrame('defeated');
    els.monsterSprite.classList.remove('dead');
    void els.monsterSprite.offsetWidth;
    els.monsterSprite.classList.add('dead');
    spawnFloat(els.arena, 'KO', '#ff8f8f');
    playTone(120, 0.18, 'sawtooth', 0.05, -70);
  }

  function animateShake() {
    els.arena.classList.remove('shake');
    els.battlePanel.classList.remove('shake');
    void els.arena.offsetWidth;
    els.arena.classList.add('shake');
    els.battlePanel.classList.add('shake');
  }

  function spawnFloat(parent, text, color) {
    const el = document.createElement('div');
    el.className = 'float';
    el.textContent = text;
    el.style.color = color;
    const w = parent.clientWidth || 300;
    el.style.left = `${randInt(55, Math.max(75, w - 80))}px`;
    el.style.top = `${randInt(55, 190)}px`;
    parent.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  function resolveDamage() {
    const base = 20;
    const comboBonus = Math.min(STATE.combo, 6) * 3;
    const boostBonus = STATE.damageBoostTurns > 0 ? 12 : 0;
    const critBonus = STATE.combo >= 5 ? 15 : 0;
    return base + comboBonus + boostBonus + critBonus;
  }

  function startGame() {
    STATE.lifeMax = 3;
    STATE.life = 3;
    STATE.coins = 0;
    STATE.xp = 0;
    STATE.score = 0;
    STATE.question = 1;
    STATE.combo = 0;
    STATE.bestCombo = 0;
    STATE.correctCount = 0;
    STATE.monsterIndex = 0;
    STATE.monsterMaxHp = currentMonster().hp;
    STATE.monsterHp = STATE.monsterMaxHp;
    STATE.damageBoostTurns = 0;
    STATE.hintActive = false;
    STATE.used = new Set();
    STATE.current = null;
    STATE.locked = false;
    STATE.pendingAdvance = false;
    STATE.pendingFinal = false;
    STATE.defeatedMonsters = 0;

    setScreen('game');
    setMonsterVisual();
    renderHeroFrame(heroFrameForLife(STATE.life));
    initQuestion();
    updateUI();
    playTone(520, 0.08, 'sine', 0.04, 80);
  }

  function initQuestion() {
    if (STATE.life <= 0) return finish(false);
    if (STATE.question > ROUND_COUNT) return finish(false);
    const q = generateQuestion();
    STATE.current = q;
    renderQuestion(q);
  }

  function generateQuestion() {
    let q;
    let tries = 0;
    do {
      const type = TYPES[randInt(0, TYPES.length - 1)];
      q = buildQuestion(type);
      tries++;
    } while (STATE.used.has(q.key) && tries < 70);
    STATE.used.add(q.key);
    return q;
  }

  function buildQuestion(type) {
    if (type === 'add') {
      const a = randInt(12, 99), b = randInt(12, 99);
      return { type, key:`add:${a}:${b}`, prompt:`${a} + ${b} = ?`, correct:a+b, kind:'number', subnote:'Додавання двох цілих чисел.' };
    }
    if (type === 'sub') {
      const a = randInt(30, 160), b = randInt(10, a - 1);
      return { type, key:`sub:${a}:${b}`, prompt:`${a} − ${b} = ?`, correct:a-b, kind:'number', subnote:'Віднімання без від'ємного результату.' };
    }
    if (type === 'mul') {
      const a = randInt(4, 18), b = randInt(4, 18);
      return { type, key:`mul:${a}:${b}`, prompt:`${a} × ${b} = ?`, correct:a*b, kind:'number', subnote:'Множення цілих чисел.' };
    }
    if (type === 'div') {
      const b = randInt(2, 12), x = randInt(2, 12), a = b * x;
      return { type, key:`div:${a}:${b}`, prompt:`${a} ÷ ${b} = ?`, correct:x, kind:'number', subnote:'Ділення з цілим результатом.' };
    }
    if (type === 'frac_add') {
      const d = randInt(2, 9), n1 = randInt(1, d - 1), n2 = randInt(1, d - 1);
      const r = simplifyFraction(n1 + n2, d);
      return { type, key:`fa:${n1}:${n2}:${d}`, prompt:`${frac(n1,d)} + ${frac(n2,d)} = ?`, correct:frac(r.n, r.d), kind:'fraction', subnote:'Складаємо дроби з однаковим знаменником.' };
    }
    if (type === 'frac_sub') {
      const d = randInt(2, 9), n1 = randInt(2, d - 1), n2 = randInt(1, n1 - 1);
      const r = simplifyFraction(n1 - n2, d);
      return { type, key:`fs:${n1}:${n2}:${d}`, prompt:`${frac(n1,d)} − ${frac(n2,d)} = ?`, correct:frac(r.n, r.d), kind:'fraction', subnote:'Віднімаємо дроби з однаковим знаменником.' };
    }
    if (type === 'frac_mul') {
      const a = randInt(1, 7), b = randInt(2, 9), c = randInt(1, 7), d = randInt(2, 9);
      const r = simplifyFraction(a * c, b * d);
      return { type, key:`fm:${a}:${b}:${c}:${d}`, prompt:`${frac(a,b)} × ${frac(c,d)} = ?`, correct:frac(r.n, r.d), kind:'fraction', subnote:'Множимо чисельники та знаменники.' };
    }
    if (type === 'frac_div') {
      const a = randInt(1, 7), b = randInt(2, 9), c = randInt(1, 7), d = randInt(2, 9);
      const r = simplifyFraction(a * d, b * c);
      return { type, key:`fd:${a}:${b}:${c}:${d}`, prompt:`${frac(a,b)} ÷ ${frac(c,d)} = ?`, correct:frac(r.n, r.d), kind:'fraction', subnote:'Ділення дробів — множимо на обернений дріб.' };
    }
    if (type === 'prop') {
      const a = randInt(2, 9), c = randInt(2, 9), x = randInt(2, 15);
      const b = (a * x) / c;
      if (!Number.isInteger(b)) return buildQuestion(type);
      return { type, key:`prop:${a}:${b}:${c}:${x}`, prompt:`${a}:${b} = ${c}:x`, correct:x, kind:'number', subnote:'Знаходимо невідомий член пропорції.' };
    }
    if (type === 'expand') {
      const k = randInt(2, 9);
      const sign = Math.random() < 0.5 ? '+' : '−';
      const b = randInt(2, 12);
      const right = sign === '+' ? `${k}x + ${k * b}` : `${k}x − ${k * b}`;
      return { type, key:`exp:${k}:${sign}:${b}`, prompt:`${k}(x ${sign} ${b}) = ?`, correct:right, kind:'text', subnote:'Розкриваємо дужки за розподільною властивістю.' };
    }
    if (type === 'eq') {
      const x = randInt(1, 12);
      const a = randInt(1, 9), c = randInt(0, 8);
      const b = randInt(-12, 12);
      if (a === c) return buildQuestion(type);
      const d = a * x + b - c * x;
      const left = `${a === 1 ? '' : a}x${b >= 0 ? ' + ' + b : ' − ' + Math.abs(b)}`;
      const right = `${c === 0 ? d : `${c === 1 ? '' : c}x${d >= 0 ? ' + ' + d : ' − ' + Math.abs(d)}`}`;
      return { type, key:`eq:${x}:${a}:${b}:${c}:${d}`, prompt:`${left} = ${right}`, correct:x, kind:'number', subnote:'Лінійне рівняння з однією змінною.' };
    }
    if (type === 'ineq') {
      const x = randInt(1, 10);
      const a = randInt(1, 8), c = randInt(0, 7);
      const b = randInt(-10, 10);
      if (a === c) return buildQuestion(type);
      const d = a * x + b - c * x;
      const left = `${a === 1 ? '' : a}x${b >= 0 ? ' + ' + b : ' − ' + Math.abs(b)}`;
      const right = `${c === 0 ? d : `${c === 1 ? '' : c}x${d >= 0 ? ' + ' + d : ' − ' + Math.abs(d)}`}`;
      const op = Math.random() < 0.5 ? '<' : '>';
      const sign = (a - c > 0) ? op : (op === '<' ? '>' : '<');
      return { type, key:`ineq:${x}:${a}:${b}:${c}:${d}:${op}`, prompt:`${left} ${op} ${right}`, correct:`x ${sign} ${x}`, kind:'text', subnote:'Для нерівності важливий знак після перенесення.' };
    }
    const p = randInt(10, 45);
    const factor = 100 / gcd(100, p);
    const base = factor * randInt(2, 8);
    const correct = (base * p) / 100;
    return { type:'percent', key:`percent:${p}:${base}`, prompt:`${p}% від ${base} = ?`, correct, kind:'number', subnote:'Підбираємо числа так, щоб відповідь була цілим числом.' };
  }

  function makeWrong(q) {
    const correct = String(q.correct);
    if (q.kind === 'number') {
      const n = Number(correct);
      const deltas = [1,2,3,4,5,6,7,8];
      const d = deltas[randInt(0, deltas.length - 1)];
      return String(n + (Math.random() < 0.5 ? -d : d));
    }
    if (q.kind === 'fraction') {
      const m = correct.match(/<span class="frac"><span class="top">(-?\d+)<\/span><span class="bottom">(-?\d+)<\/span><\/span>/);
      if (m) {
        const n = Number(m[1]), d = Number(m[2]);
        const cands = [
          simplifyFraction(n + randInt(1,2), d),
          simplifyFraction(n, d + randInt(1,3)),
          simplifyFraction(n + randInt(1,3), d + randInt(1,2))
        ];
        const pick = cands[randInt(0, cands.length - 1)];
        return frac(pick.n, pick.d);
      }
      return frac(randInt(1,9), randInt(2,10));
    }
    if (/^x\s*[<>]=?\s*-?\d+$/.test(correct)) {
      const m = correct.match(/^x\s*([<>]=?)\s*(-?\d+)$/);
      if (m) {
        const sign = m[1] === '<' ? '>' : '<';
        return `x ${sign} ${Number(m[2]) + randInt(1, 3)}`;
      }
    }
    if (/^[+-]?\d+x/.test(correct) || /x\s*[+\-]/.test(correct)) {
      const tweak = randInt(1, 4);
      return correct.replace(/\d+/, x => String(Number(x) + tweak));
    }
    return correct + (Math.random() < 0.5 ? ' + 1' : ' − 1');
  }

  function makeChoices(q) {
    const opts = new Set([String(q.correct)]);
    let loops = 0;
    while (opts.size < 4 && loops < 90) {
      loops++;
      opts.add(String(makeWrong(q)));
    }
    return shuffle([...opts]).slice(0, 4);
  }

  function renderQuestion(q) {
    els.typeLabel.textContent = typeLabel(q.type);
    els.question.innerHTML = q.prompt;
    els.subnote.textContent = q.subnote || '';
    els.answers.innerHTML = '';
    els.feedback.innerHTML = '';
    els.nextBtn.style.display = 'none';
    STATE.locked = false;

    makeChoices(q).forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'opt';
      btn.innerHTML = choice;
      btn.addEventListener('click', () => answer(choice, btn));
      els.answers.appendChild(btn);
    });

    if (STATE.hintActive) {
      els.feedback.innerHTML = `<span class="goodtxt">💡 Підказка:</span> правильна відповідь може бути <b>${q.correct}</b>`;
      STATE.hintActive = false;
    }
    updateUI();
  }

  function answer(choice, btn) {
    if (STATE.locked) return;
    STATE.locked = true;
    [...els.answers.children].forEach(b => b.disabled = true);

    const right = String(choice) === String(STATE.current.correct);
    if (right) {
      btn.classList.add('good');
      STATE.combo++;
      STATE.bestCombo = Math.max(STATE.bestCombo, STATE.combo);
      STATE.correctCount++;

      const crit = STATE.combo >= 5;
      const dmg = resolveDamage();
      STATE.monsterHp -= dmg;
      STATE.xp += 10 + Math.min(STATE.combo, 6) + (crit ? 8 : 0);
      STATE.coins += 5 + (crit ? 3 : 0);
      STATE.score += 10 + Math.min(STATE.combo, 6) + (crit ? 10 : 0);

      setHeroState('hero_attack', heroFrameForLife(STATE.life), 340);
      animateHeroAttack(crit);
      spawnFloat(els.arena, `-${dmg}`, crit ? '#ffd66b' : '#ffffff');
      spawnFloat(els.battlePanel, `+${10 + Math.min(STATE.combo, 6) + (crit ? 8 : 0)} XP`, '#91f0aa');
      spawnFloat(els.battlePanel, `+${5 + (crit ? 3 : 0)} 🪙`, '#ffd66b');
      els.feedback.innerHTML = `<span class="goodtxt">✅ Правильно!</span> ${crit ? '<b>CRITICAL HIT!</b> ' : ''}Комбо ×${STATE.combo}.`;
      playTone(crit ? 740 : 560, 0.09, crit ? 'triangle' : 'sine', crit ? 0.08 : 0.06, crit ? -220 : -70);

      if (STATE.damageBoostTurns > 0) STATE.damageBoostTurns--;

      if (STATE.monsterHp <= 0) {
        animateMonsterDeath();
        STATE.pendingAdvance = true;
        STATE.pendingFinal = isFinalMonster();
        setHeroState('hero_win');
      } else {
        STATE.pendingAdvance = false;
        STATE.pendingFinal = false;
      }
    } else {
      btn.classList.add('bad');
      const rightBtn = [...els.answers.children].find(b => String(b.innerHTML) === String(STATE.current.correct));
      if (rightBtn) rightBtn.classList.add('good');
      STATE.life--;
      STATE.combo = 0;
      STATE.score = Math.max(0, STATE.score - 4);
      animateMiss();
      animateShake();
      setHeroState('hero_hurt', heroFrameForLife(STATE.life), 320);
      spawnFloat(els.arena, '−1 ❤️', '#ff9a9a');
      els.feedback.innerHTML = `<span class="badtxt">❌ Неправильно.</span> <span class="warning">Правильна відповідь:</span> ${STATE.current.correct}`;
      playTone(170, 0.11, 'square', 0.05, -40);
      STATE.pendingAdvance = false;
      STATE.pendingFinal = false;
      if (STATE.life <= 0) {
        setHeroState('hero_dead');
        setTimeout(() => finish(false), 400);
      }
    }

    updateUI();
    els.nextBtn.style.display = 'inline-block';
    els.nextBtn.onclick = onNext;
  }

  function onNext() {
    if (STATE.life <= 0) return;

    STATE.question++;

    if (STATE.pendingAdvance) {
      STATE.pendingAdvance = false;

      if (STATE.pendingFinal) {
        STATE.pendingFinal = false;
        setHeroState('hero_win');
        window.setTimeout(() => finish(true), 350);
        return;
      }

      STATE.defeatedMonsters++;
      STATE.monsterIndex = Math.min(STATE.monsterIndex + 1, MONSTERS.length - 1);
      STATE.monsterMaxHp = currentMonster().hp + Math.min(STATE.defeatedMonsters * 4, 30);
      STATE.monsterHp = STATE.monsterMaxHp;
      setMonsterVisual();

      if (SHOP_AFTER_DEFEATS.has(STATE.defeatedMonsters)) {
        openShop();
        return;
      }

      if (STATE.question > ROUND_COUNT) {
        finish(false);
        return;
      }

      renderHeroFrame(heroFrameForLife(STATE.life));
      initQuestion();
      return;
    }

    if (STATE.question > ROUND_COUNT) {
      finish(false);
      return;
    }

    initQuestion();
  }

  function openShop() {
    els.shopMsg.innerHTML = `<span class="goodtxt">Готово.</span> Обери один предмет або продовжуй далі.`;
    setScreen('shop');
    updateUI();
  }

  function buy(item) {
    const costMap = { life: 12, boost: 18, hint: 10 };
    const cost = costMap[item];
    const card = els.shopGrid.querySelector(`[data-item="${item}"]`);
    const btn = card ? card.querySelector('button[data-buy]') : null;

    if (STATE.coins < cost) {
      els.shopMsg.innerHTML = `<span style="color:#ff4d4d;font-weight:900">❌ Недостатньо монет</span>`;
      playTone(140, 0.16, 'square', 0.045, -20);
      return;
    }

    STATE.coins -= cost;
    if (item === 'life') {
      STATE.life = Math.min(STATE.lifeMax + 1, STATE.life + 1);
      STATE.lifeMax = Math.max(STATE.lifeMax, STATE.life);
      els.shopMsg.innerHTML = `<span class="goodtxt">❤️ Куплено зілля.</span>`;
      playTone(640, 0.12, 'sine', 0.05, 120);
    } else if (item === 'boost') {
      STATE.damageBoostTurns = 3;
      els.shopMsg.innerHTML = `<span class="goodtxt">⚡ Підсилення активовано на 3 правильні відповіді.</span>`;
      playTone(720, 0.12, 'triangle', 0.05, 160);
    } else if (item === 'hint') {
      STATE.hintActive = true;
      els.shopMsg.innerHTML = `<span class="goodtxt">💡 Підказка буде на наступному питанні.</span>`;
      playTone(520, 0.1, 'sine', 0.05, 80);
    }

    if (btn) btn.disabled = true;
    updateUI();
  }

  function finish(won) {
    saveLocal();
    setScreen('end');

    const accuracy = STATE.question > 1 ? STATE.correctCount / Math.min(STATE.question - 1, ROUND_COUNT) : 0;
    const rank = rankFor(STATE.score, accuracy, STATE.life, STATE.bestCombo);

    els.endTitle.textContent = won ? 'Перемога!' : 'Поразка';
    if (!won) setHeroState('hero_dead');
    els.endRank.textContent = rank;
    els.endDesc.textContent = won
      ? 'Фінальний бос переможений. Скарб відкрито.'
      : 'Життя закінчилися, але прогрес уже видно.';

    els.finalScore.textContent = STATE.score;
    els.finalCoins.textContent = STATE.coins;
    els.finalCorrect.textContent = STATE.correctCount;
    els.finalBestCombo.textContent = STATE.bestCombo;
    els.finalBestScore.textContent = STATE.savedBestScore;
    els.finalSaved.textContent = STATE.savedWins > 0 ? `Перемог: ${STATE.savedWins}` : 'Ще немає';

    if (won) {
      els.questChest.classList.remove('show');
      void els.questChest.offsetWidth;
      els.questChest.classList.add('show');
      setHeroState('hero_win');
      playTone(880, 0.14, 'triangle', 0.09, 220);
      setTimeout(() => {
        playTone(660, 0.12, 'triangle', 0.08, 180);
        spawnFloat(els.endScreen, '+СКАРБ', '#ffd66b');
      }, 320);
    } else {
      els.questChest.classList.remove('show');
    }

    updateUI();
  }

  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => buy(btn.dataset.buy));
  });
  els.startBtn.addEventListener('click', startGame);
  els.restartBtn.addEventListener('click', startGame);
  els.closeShopBtn.addEventListener('click', () => {
    setScreen('game');
    renderHeroFrame(heroFrameForLife(STATE.life));
    if (STATE.question > ROUND_COUNT) {
      finish(false);
      return;
    }
    initQuestion();
  });

  loadLocal();
  renderHeroFrame('hero_hp3');
  updateTheme();
  updateUI();
})();