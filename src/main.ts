import Phaser from 'phaser';
import './style.css';
import { GardenScene, type Selection } from './game/scene';
import { Battle, type PlantResult } from './game/model';
import { LEVELS, PLANTS, type PlantType } from './game/content';
import { readSave, writeSave, completeLevel } from './save';
import { GardenAudio } from './audio';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const types = Object.keys(PLANTS) as PlantType[];
let save = readSave();
const audio = new GardenAudio();
audio.setVolume(save.volume);
let ready = false, loadFailed = false, battle: Battle | null = null, selected: Selection = null, resultShown = false;
let overlayMode: 'menu' | 'pause' | 'help' | 'result' | null = 'menu';
let helpReturn: 'menu' | 'pause' = 'menu';
let toastTimer: ReturnType<typeof setTimeout>;
const sunIcon = '<span class="sun-icon" aria-hidden="true">✦</span>';

$('#app').innerHTML = `
  <div class="page-top"><a href="./" class="wordmark"><span class="brand-leaf">❧</span> 庭院守卫</a><span class="edition">原创庭院塔防 <i></i> 浏览器试玩版</span></div>
  <main id="shell"><div id="stage">
    <div id="canvas"></div>
    <section id="hud" hidden aria-label="战斗控制">
      <div class="hud-top"><span id="level-title"></span><div class="top-actions"><button data-action="help">玩法说明</button><button id="mute" data-action="mute" aria-label="静音">♪</button><button data-action="pause" class="pause-button">Ⅱ <span>暂停</span></button></div></div>
      <div class="resource-panel">${sunIcon}<span class="resource-label">光露</span><strong id="resource">250</strong></div>
      <div class="seed-tray">${types.map((type, index) => `<button class="seed-card" data-plant="${type}" aria-label="${PLANTS[type].name}，${PLANTS[type].cost} 光露" title="${PLANTS[type].description}"><kbd>${index + 1}</kbd><img src="/assets/${type}.png" alt=""/><span class="seed-name">${PLANTS[type].name}</span><span class="seed-price">✦ ${PLANTS[type].cost}</span><span class="cooldown-mask"></span><span class="cooldown-text"></span></button>`).join('')}<button class="shovel" data-action="shovel" title="铲除植物，不返还光露" aria-label="铲除植物"><svg viewBox="0 0 40 56" aria-hidden="true"><path d="M17 6h10v11h-10z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M22 17v20" stroke="#be8655" stroke-width="6"/><path d="M9 34h26v8Q24 59 9 44Z" fill="#829a8a" stroke="#405f50" stroke-width="3"/></svg><span>铲除 <kbd>5</kbd></span></button></div>
      <div class="level-chip"><small>本次来客</small><strong id="enemy-count">0 / 11</strong><span id="time">00:00</span></div>
      <div class="bottom-bar"><div class="hint"><span class="hint-dot"></span><span id="hint">先种灯铃花，收集光露。</span></div><div class="wave"><span id="wave-label">来客进度</span><div class="wave-track"><div id="wave-fill"></div><i></i><i></i><i></i></div></div></div>
    </section>
    <div id="overlay"></div>
    <div id="toast" role="status" aria-live="polite"></div>
  </div></main>
  <footer class="page-footer"><span>种下小小的勇气，守住一整个午后。</span><span>鼠标种植 <b>·</b> 1–4 选卡 <b>·</b> E 收光露 <b>·</b> 空格暂停</span></footer>
`;

const scene = new GardenScene({
  ready() { ready = !loadFailed; if (overlayMode === 'menu') showMenu(); },
  failed() { loadFailed = true; ready = false; toast('部分素材未能加载，请刷新页面重试。'); },
  click(row, col) {
    if (!battle?.active) return;
    if (selected === 'shovel') {
      if (!battle.remove(row, col)) toast('这里还没有植物。');
      select(null); return;
    }
    if (!selected) { toast('先选择上方的植物卡片，再点击草坪。'); return; }
    const result = battle.plant(selected, row, col);
    if (result !== 'ok') { toast(resultMessage(result)); audio.play('error'); }
    updateHud();
  },
  collect(id) { battle?.collect(id); updateHud(); },
  update() { updateHud(); if (battle && battle.status !== 'playing' && !resultShown) showResult(); },
  event(event) {
    audio.play(event.type);
    if (event.type === 'wave' && battle) toast(battle.spawned === battle.level.spawns.length ? '最后一位来客到了，守住庭院！' : battle.spawned === 1 ? '来客出现了！为每一行布置射手。' : '更多来客正在靠近……');
    if (event.type === 'rescue') toast('花车出动！这一行的救场机会已用完。');
  },
});
new Phaser.Game({ type: Phaser.AUTO, width: 1280, height: 720, parent: 'canvas', backgroundColor: '#627245', scene, audio: { noAudio: true }, render: { antialias: true, roundPixels: false }, banner: false });

function resize() {
  const width = Math.min(window.innerWidth - (window.innerWidth < 700 ? 16 : 48), 1440);
  const availableHeight = Math.max(280, window.innerHeight - 128);
  const scale = Math.min(width / 1280, availableHeight / 720);
  $('#shell').style.width = `${1280 * scale}px`;
  $('#shell').style.height = `${720 * scale}px`;
  $('#stage').style.transform = `scale(${scale})`;
}
window.addEventListener('resize', resize); resize();

function toast(message: string) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
}
function resultMessage(result: PlantResult) {
  return ({ funds: '光露不够啦，先收集金色光露。', occupied: '这块草坪已经有植物了。', cooldown: '这颗种子还在准备，稍等一会儿。', invalid: '请种在草坪格子里。', inactive: '请先继续游戏。', ok: '' })[result];
}
function persist() { if (!writeSave(save)) toast('浏览器未允许保存进度，本次游戏仍可继续。'); }
function volumeControl() { return `<label class="volume-control"><span>♪ 庭院音量</span><input aria-label="音量" type="range" min="0" max="100" value="${Math.round(save.volume * 100)}"/><output>${Math.round(save.volume * 100)}%</output></label>`; }
function openOverlay(html: string, mode: typeof overlayMode) {
  overlayMode = mode; $('#overlay').hidden = false; $('#overlay').innerHTML = html;
  $('#hud').inert = true;
  requestAnimationFrame(() => $('#overlay').querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true }));
}
function hideOverlay() { overlayMode = null; $('#overlay').hidden = true; $('#overlay').innerHTML = ''; $('#hud').inert = false; }
function showMenu() {
  battle = null; selected = null;
  if (ready) scene.setBattle(null);
  audio.stopMusic(); $('#hud').hidden = true;
  openOverlay(`<section class="menu" aria-label="庭院主菜单">
    <div class="menu-copy"><div class="eyebrow"><span></span> 欢迎来到你的庭院</div><h1>庭院<span>守卫</span><em>GARDEN GUARDIANS</em></h1><p class="menu-intro">阳光正好，来客有点多。<br/>种下你的植物伙伴，守住这片小小天地。</p>
      <button class="primary start-button" data-start="${save.unlocked}" ${!ready ? 'disabled' : ''}>${loadFailed ? '加载失败，请刷新' : !ready ? '正在准备庭院…' : save.completed.length ? '继续守护' : '开启第一天'}<span>→</span></button>
      <button class="text-button" data-action="help">第一次来？看看怎么玩 <span>↗</span></button>
    </div>
    <div class="menu-art" aria-hidden="true"><div class="art-sun"></div><img class="hero-glow" src="/assets/glow.png" alt=""/><img class="hero-shooter" src="/assets/shooter.png" alt=""/><img class="hero-wall" src="/assets/wall.png" alt=""/><div class="garden-note"><span>今日花园手记</span><strong>每一株，都有自己的勇气。</strong><i>四位伙伴 · 三段庭院冒险</i></div></div>
    <div class="chapters">${LEVELS.map(level => `<button class="chapter ${level.id > save.unlocked ? 'locked' : ''}" data-start="${level.id}" ${level.id > save.unlocked || !ready ? 'disabled' : ''}><span class="chapter-number">0${level.id}</span><span><small>${save.completed.includes(level.id) ? '已守护 ✓' : level.id > save.unlocked ? '通关前一关解锁' : level.id === 1 ? '初来庭院' : '等待你的守护'}</small><strong>${level.name}</strong></span><span class="chapter-arrow">${level.id > save.unlocked ? '◇' : '↗'}</span></button>`).join('')}</div>
  </section>`, 'menu');
}
function start(levelId: number) {
  if (!ready || levelId > save.unlocked || !LEVELS[levelId - 1]) return;
  audio.unlock(); audio.startMusic(levelId === 3);
  battle = new Battle(LEVELS[levelId - 1]); resultShown = false;
  scene.setBattle(battle); select('glow');
  hideOverlay(); $('#hud').hidden = false;
  $('#level-title').innerHTML = `<span>0${levelId}</span> ${battle.level.name}`;
  updateHud(); toast(battle.level.description);
}
function select(type: Selection) {
  selected = type; scene.selection = type;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-plant]')) {
    button.classList.toggle('selected', button.dataset.plant === type);
    button.setAttribute('aria-pressed', String(button.dataset.plant === type));
  }
  $('.shovel').classList.toggle('selected', type === 'shovel');
  $('.shovel').setAttribute('aria-pressed', String(type === 'shovel'));
  if (type && battle?.active) audio.play('select');
  updateHud();
}
function updateHud() {
  if (!battle) return;
  $('#resource').textContent = String(battle.resources);
  $('#enemy-count').textContent = `${battle.defeated} / ${battle.level.spawns.length}`;
  $('#time').textContent = `${Math.floor(battle.time / 60).toString().padStart(2, '0')}:${Math.floor(battle.time % 60).toString().padStart(2, '0')}`;
  $('#wave-fill').style.width = `${battle.progress * 100}%`;
  $('#wave-label').textContent = battle.progress === 1 ? `清理剩余来客 · ${battle.enemies.length}` : '来客进度';
  const next = battle.level.spawns[battle.spawned];
  $('#hint').textContent = selected === 'shovel' ? '点击植物铲除，不返还光露。' : selected ? `${PLANTS[selected].name} · ${PLANTS[selected].description}` : next && next.at - battle.time <= 5 ? `第 ${next.row + 1} 行有来客靠近，准备好了吗？` : '点击金色光露收集 · 每行花车可救场一次';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-plant]')) {
    const type = button.dataset.plant as PlantType;
    const cooldown = battle.remainingCooldown(type);
    button.classList.toggle('unavailable', cooldown > 0 || battle.resources < PLANTS[type].cost);
    button.querySelector<HTMLElement>('.cooldown-mask')!.style.height = `${cooldown / PLANTS[type].cooldown * 100}%`;
    button.querySelector<HTMLElement>('.cooldown-text')!.textContent = cooldown > 0 ? `${Math.ceil(cooldown)}s` : '';
  }
  $('#mute').textContent = save.volume === 0 ? '♪̸' : '♪';
  $('#mute').setAttribute('aria-label', save.volume === 0 ? '开启声音' : '静音');
}
function pause() {
  if (!battle || battle.status !== 'playing') return;
  battle.paused = true; scene.freeze(true); audio.pause(); audio.play('pause');
  openOverlay(`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><span class="modal-ornament">❧</span><p class="eyebrow">让庭院歇一会儿</p><h2 id="modal-title">风也慢了下来</h2><p>你的植物伙伴正在等你回来。</p><button class="primary" data-action="resume">继续守护 <span>→</span></button><div class="modal-row"><button class="secondary" data-action="restart">重新开始</button><button class="secondary" data-action="menu">返回庭院</button></div>${volumeControl()}<button class="text-button" data-action="help">查看玩法说明</button></section>`, 'pause');
}
function resume() {
  if (!battle || battle.status !== 'playing') return;
  hideOverlay(); battle.paused = false; scene.freeze(false); audio.resume();
}
function showHelp() {
  helpReturn = battle ? 'pause' : 'menu';
  if (battle) { battle.paused = true; scene.freeze(true); audio.pause(); }
  openOverlay(`<section class="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><p class="eyebrow">一份简单的庭院指南</p><h2 id="modal-title">把勇气，种在草坪上。</h2><div class="help-steps"><p><b>01</b><span><strong>收集光露</strong>点击草坪上的金色光球，每颗增加 25 光露。灯铃花能持续生产。</span></p><p><b>02</b><span><strong>布置防线</strong>选择上方卡片，再点草坪种植。射手攻击本行，栗壳挡在前面。</span></p><p><b>03</b><span><strong>守到最后</strong>击退所有来客即可过关。花车每行救场一次，再被突破就会失败。</span></p></div><div class="plant-guide">${types.map(type => `<div><img src="/assets/${type}.png" alt=""/><strong>${PLANTS[type].name}</strong><span>${PLANTS[type].role} · ${PLANTS[type].cost} 光露</span></div>`).join('')}</div><p class="keyboard-tip">1–4 选卡　5 铲除　E 收光露　空格 / Esc 暂停</p><button class="primary" data-action="help-close">记住了，去守护 <span>→</span></button>${volumeControl()}</section>`, 'help');
}
function showResult() {
  if (!battle) return;
  resultShown = true; audio.stopMusic(); scene.freeze(true);
  const won = battle.status === 'won';
  if (won) { save = completeLevel(save, battle.level.id); persist(); }
  audio.play(won ? 'win' : 'lose');
  const last = battle.level.id === 3;
  openOverlay(`<section class="modal result-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><span class="modal-ornament">${won ? '❧' : '☂'}</span><p class="eyebrow">${battle.level.name} · ${won ? '守护成功' : '本次守护结束'}</p><h2 id="modal-title">${won ? last ? '整个午后，都守住了。' : '又是安静的一天。' : '庭院需要再一点勇气。'}</h2><p>${won ? last ? '三段冒险全部完成。谢谢你和植物伙伴们。' : '植物伙伴们做得很好，下一片晨光已经亮起。' : '试试先种两株灯铃花，再给每行安排射手。'}</p><div class="result-stats"><div><strong>${battle.defeated}</strong><span>击退来客</span></div><div><strong>${battle.collected}</strong><span>收集光露</span></div><div><strong>${Math.floor(battle.time)}<small> 秒</small></strong><span>守护时间</span></div></div><button class="primary" ${won && !last ? `data-start="${battle.level.id + 1}"` : 'data-action="restart"'}>${won && !last ? '前往下一关' : '再守护一次'} <span>→</span></button><button class="text-button" data-action="menu">返回庭院</button></section>`, 'result');
}

$('#app').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  audio.unlock();
  if (button.dataset.start) { start(Number(button.dataset.start)); return; }
  if (button.dataset.plant && battle?.active && !overlayMode) { select(selected === button.dataset.plant ? null : button.dataset.plant as PlantType); return; }
  switch (button.dataset.action) {
    case 'pause': pause(); break;
    case 'resume': resume(); break;
    case 'help': showHelp(); break;
    case 'help-close': helpReturn === 'menu' ? showMenu() : resume(); break;
    case 'menu': showMenu(); break;
    case 'restart': if (battle) start(battle.level.id); break;
    case 'shovel': if (battle?.active) select(selected === 'shovel' ? null : 'shovel'); break;
    case 'mute': save.volume = save.volume === 0 ? 0.45 : 0; audio.setVolume(save.volume); persist(); updateHud(); break;
  }
});
$('#app').addEventListener('input', event => {
  const input = event.target as HTMLInputElement;
  if (input.type !== 'range') return;
  save.volume = Number(input.value) / 100;
  audio.setVolume(save.volume); input.nextElementSibling!.textContent = `${input.value}%`; persist(); updateHud();
});
document.addEventListener('keydown', event => {
  if ((event.target as HTMLElement).matches('input')) return;
  if (event.key === 'Tab' && overlayMode) {
    const focusable = [...$('#overlay').querySelectorAll<HTMLElement>('button:not(:disabled), input')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (event.repeat) return;
  if (event.code === 'Space' || event.key === 'Escape') {
    if (event.code === 'Space' && overlayMode && (event.target as HTMLElement).matches('button')) return;
    event.preventDefault();
    if (overlayMode === 'help') helpReturn === 'menu' ? showMenu() : resume();
    else if (overlayMode === 'pause') resume();
    else if (!overlayMode) pause();
  }
  if (!battle?.active || overlayMode) return;
  if ('1234'.includes(event.key) && event.key.length === 1) select(types[Number(event.key) - 1]);
  if (event.key === '5') select('shovel');
  if (event.key.toLowerCase() === 'e') for (const token of [...battle.tokens]) battle.collect(token.id);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && battle?.active) pause(); });
showMenu();
