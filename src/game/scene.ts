import Phaser from 'phaser';
import { BOARD, ENEMIES, PLANTS, cellX, cellY, type PlantType } from './content';
import { Battle, type BattleEvent } from './model';

const asset = (file: string) => `${import.meta.env.BASE_URL}assets/${file}`;

export type Selection = PlantType | 'shovel' | null;
export interface SceneHooks {
  ready(): void;
  failed(): void;
  click(row: number, col: number): void;
  collect(id: number): void;
  update(battle: Battle): void;
  event(event: BattleEvent): void;
}
export class GardenScene extends Phaser.Scene {
  battle: Battle | null = null;
  selection: Selection = null;
  private units = new Map<string, Phaser.GameObjects.Sprite>();
  private floor!: Phaser.GameObjects.Graphics;
  private details!: Phaser.GameObjects.Graphics;
  private hover!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Container;
  private preview!: Phaser.GameObjects.Image;
  private frozen = false;
  private lastHud = 0;
  constructor(private hooks: SceneHooks) { super('garden'); }
  preload() {
    this.load.image('garden', asset('garden.webp'));
    for (const type of ['glow', 'wall', 'bomb', 'shooter']) this.load.image(type, asset(`${type}.png`));
    this.load.image('seed', asset('seed.png'));
    for (const key of ['shooter-idle', 'shooter-shoot', 'enemy-walk']) this.load.spritesheet(key, asset(`${key}.png`), { frameWidth: 256, frameHeight: 256 });
    this.load.on('loaderror', () => this.hooks.failed());
  }
  create() {
    this.add.image(640, 360, 'garden').setDisplaySize(1280, 720);
    this.floor = this.add.graphics().setDepth(1);
    this.hover = this.add.graphics().setDepth(2);
    this.details = this.add.graphics().setDepth(70);
    this.effects = this.add.container().setDepth(90);
    this.preview = this.add.image(0, 0, 'shooter').setOrigin(0.5, 235 / 256).setDisplaySize(108, 108).setAlpha(0.55).setDepth(80).setVisible(false);
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('shooter-idle', { start: 0, end: 31 }), frameRate: 20, repeat: -1 });
    this.anims.create({ key: 'shoot', frames: this.anims.generateFrameNumbers('shooter-shoot', { start: 0, end: 5 }), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('enemy-walk', { start: 0, end: 17 }), frameRate: 20, repeat: -1 });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.battle?.active || pointer.rightButtonDown()) return;
      const token = [...this.battle.tokens].reverse().find(t => Math.hypot(t.x - pointer.x, this.tokenY(t) - pointer.y) < 28);
      if (token) { this.hooks.collect(token.id); return; }
      const col = Math.floor((pointer.x - BOARD.x) / BOARD.cell);
      const row = Math.floor((pointer.y - BOARD.y) / BOARD.cell);
      if (row >= 0 && row < 5 && col >= 0 && col < 9) this.hooks.click(row, col);
    });
    this.game.canvas.setAttribute('aria-label', '庭院棋盘，5 行 9 列。选择植物后点击草坪种植，点击金色光露收集。');
    this.game.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.hooks.ready();
  }
  setBattle(battle: Battle | null) {
    this.freeze(false);
    this.tweens.killAll();
    this.effects.removeAll(true);
    for (const sprite of this.units.values()) sprite.destroy();
    this.units.clear();
    this.battle = battle;
    this.selection = null;
    this.lastHud = 0;
    this.floor.clear(); this.details.clear(); this.hover.clear(); this.preview.setVisible(false);
    if (battle) {
      for (let row = 0; row < 5; row++) for (let col = 0; col < 9; col++) {
        this.floor.fillStyle((row + col) % 2 ? 0x304c23 : 0xffefb0, (row + col) % 2 ? 0.1 : 0.07);
        this.floor.fillRoundedRect(BOARD.x + col * 96 + 1, BOARD.y + row * 96 + 1, 94, 94, 7);
      }
      this.floor.lineStyle(1.5, 0xf1e4a3, 0.24).strokeRoundedRect(BOARD.x, BOARD.y, 864, 480, 9);
    }
  }
  freeze(value: boolean) {
    if (this.frozen === value) return;
    this.frozen = value;
    if (value) { this.anims.pauseAll(); this.tweens.pauseAll(); }
    else { this.anims.resumeAll(); this.tweens.resumeAll(); }
  }
  private tokenY(token: { y: number; source: string; born: number }) {
    return token.y - (token.source === 'sky' ? Math.max(0, 1 - ((this.battle?.time ?? 0) - token.born) / 1.1) * 70 : 0);
  }
  update(_time: number, delta: number) {
    const b = this.battle;
    if (!b) return;
    b.advance(Math.min(delta, 100) / 1000);
    this.freeze(!b.active);
    this.renderBattle(b);
    for (const event of b.drainEvents()) {
      this.showEvent(event);
      this.hooks.event(event);
    }
    if (_time - this.lastHud > 80 || b.status !== 'playing') { this.lastHud = _time; this.hooks.update(b); }
  }
  private sprite(key: string, texture: string, x: number, y: number, size: number, depth: number) {
    let sprite = this.units.get(key);
    if (!sprite) {
      sprite = this.add.sprite(x, y, texture).setOrigin(0.5, 235 / 256).setDisplaySize(size, size).setDepth(depth);
      this.units.set(key, sprite);
      if (texture === 'shooter-idle') sprite.play('idle');
      if (texture === 'enemy-walk') sprite.play('walk');
    }
    sprite.setPosition(x, y);
    return sprite;
  }
  private renderBattle(b: Battle) {
    const live = new Set<string>();
    this.details.clear();
    for (const p of b.plants) {
      const key = `p${p.id}`; live.add(key);
      const x = cellX(p.col), y = cellY(p.row);
      const sprite = this.sprite(key, p.type === 'shooter' ? 'shooter-idle' : p.type, x, y, 108, 10 + p.row * 10);
      if (p.type !== 'shooter') sprite.setAngle(Math.sin(b.time * 2 + p.id) * (p.type === 'wall' ? 1 : 2));
      if (p.type === 'bomb') sprite.setAlpha(0.78 + Math.sin(b.time * 28) * 0.22);
      if (p.hp < PLANTS[p.type].hp) this.health(x, y - 89, p.hp / PLANTS[p.type].hp, 0x91c064);
    }
    for (const e of b.enemies) {
      const key = `e${e.id}`; live.add(key);
      const y = cellY(e.row) + 4;
      const sprite = this.sprite(key, 'enemy-walk', e.x, y, e.type === 'fast' ? 123 : 135, 15 + e.row * 10);
      sprite.anims.timeScale = e.eating ? 0 : e.type === 'fast' ? 1.8 : 1;
      sprite.setAngle(e.eating ? Math.sin(b.time * 11) * 3 : 0);
      if (e.type === 'armor') {
        this.details.fillStyle(0x3e4947).fillRoundedRect(e.x - 12, y - 103, 31, 22, 5);
        this.details.fillStyle(0xa7b4ac).fillRoundedRect(e.x - 9, y - 100, 25, 17, 3);
        this.details.lineStyle(3, 0x566865).lineBetween(e.x - 14, y - 81, e.x + 22, y - 81);
      } else if (e.type === 'fast') {
        this.details.fillStyle(0xdc794b).fillTriangle(e.x + 3, y - 68, e.x + 31, y - 62, e.x + 4, y - 59);
      }
      this.health(e.x, y - 116, e.hp / ENEMIES[e.type].hp, e.type === 'armor' ? 0xa4c8d3 : e.type === 'fast' ? 0xf2ac5d : 0xd4bd76);
    }
    for (const p of b.projectiles) {
      const key = `s${p.id}`; live.add(key);
      this.sprite(key, 'seed', p.x, cellY(p.row) - 37, 21, 66).setOrigin(0.5).setDisplaySize(24, 13);
    }
    for (const [key, sprite] of this.units) if (!live.has(key)) { sprite.destroy(); this.units.delete(key); }
    for (let row = 0; row < 5; row++) if (b.rescues[row]) this.cart(188, cellY(row));
    for (const cart of b.carts) this.cart(cart.x, cellY(cart.row));
    const next = b.level.spawns[b.spawned];
    if (next && next.at - b.time < 5) {
      this.details.fillStyle(0xffd677, 0.65 + Math.sin(b.time * 6) * 0.2).fillTriangle(1131, cellY(next.row) - 20, 1144, cellY(next.row) - 29, 1144, cellY(next.row) - 11);
    }
    for (const token of b.tokens) {
      const x = token.x, y = this.tokenY(token);
      const pulse = 1 + Math.sin(b.time * 4 + token.id) * 0.08;
      const alpha = token.expires - b.time < 3 ? 0.65 + Math.sin(b.time * 10) * 0.25 : 1;
      this.details.fillStyle(0xffda67, 0.15 * alpha).fillCircle(x, y, 27 * pulse);
      this.details.fillStyle(0xae6d2e, alpha).fillCircle(x, y + 2, 17);
      this.details.fillStyle(0xffd45d, alpha).fillCircle(x, y, 17);
      this.details.fillStyle(0xfff0aa, alpha).fillCircle(x - 3, y - 4, 11);
      this.details.fillStyle(0xffffff, 0.8 * alpha).fillCircle(x - 5, y - 7, 4);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + b.time * 0.2;
        this.details.lineStyle(2, 0xffe29a, alpha).lineBetween(x + Math.cos(a) * 21, y + Math.sin(a) * 21, x + Math.cos(a) * 24, y + Math.sin(a) * 24);
      }
    }
    this.hover.clear(); this.preview.setVisible(false);
    const pointer = this.input.activePointer;
    const row = Math.floor((pointer.y - BOARD.y) / 96), col = Math.floor((pointer.x - BOARD.x) / 96);
    if (b.active && this.selection && row >= 0 && row < 5 && col >= 0 && col < 9) {
      const valid = this.selection === 'shovel' ? b.plants.some(p => p.row === row && p.col === col) : b.canPlant(this.selection, row, col) === 'ok';
      this.hover.fillStyle(valid ? 0xfff2b2 : 0xe07960, 0.24).fillRoundedRect(BOARD.x + col * 96 + 2, BOARD.y + row * 96 + 2, 92, 92, 7);
      this.hover.lineStyle(2, valid ? 0xffe4a2 : 0xe07960, 0.8).strokeRoundedRect(BOARD.x + col * 96 + 2, BOARD.y + row * 96 + 2, 92, 92, 7);
      if (this.selection !== 'shovel' && valid) this.preview.setTexture(this.selection).setPosition(cellX(col), cellY(row)).setVisible(true);
    }
  }
  private health(x: number, y: number, value: number, color: number) {
    this.details.fillStyle(0x233d30, 0.8).fillRoundedRect(x - 23, y, 46, 5, 2);
    this.details.fillStyle(color).fillRoundedRect(x - 22, y + 1, Math.max(1, 44 * value), 3, 1);
  }
  private cart(x: number, y: number) {
    this.details.lineStyle(4, 0x514e38).lineBetween(x - 20, y - 24, x - 31, y - 43);
    this.details.fillStyle(0x344936).fillCircle(x - 15, y - 4, 9).fillCircle(x + 14, y - 4, 9);
    this.details.fillStyle(0xba7651).fillRoundedRect(x - 25, y - 26, 48, 20, 6);
    this.details.fillStyle(0xf0c876).fillRoundedRect(x - 20, y - 27, 36, 10, 4);
    this.details.lineStyle(2, 0x638358).lineBetween(x - 9, y - 27, x - 15, y - 40).lineBetween(x, y - 27, x + 4, y - 39);
    this.details.fillStyle(0x759459).fillEllipse(x - 15, y - 37, 14, 7).fillEllipse(x + 5, y - 36, 13, 6);
  }
  private showEvent(event: BattleEvent) {
    if (event.type === 'shoot') {
      const sprite = this.units.get(`p${event.id}`);
      if (sprite) sprite.play('shoot').chain('idle');
      return;
    }
    if (event.type === 'collect') {
      const text = this.add.text(event.x, event.y - 12, '+25', { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '22px', color: '#fff2b6', stroke: '#566333', strokeThickness: 3 }).setOrigin(0.5);
      this.effects.add(text);
      this.tweens.add({ targets: text, y: text.y - 42, alpha: 0, duration: 650, onComplete: () => text.destroy() });
    } else if (['plant', 'remove', 'hit', 'armor-hit', 'explosion', 'defeat'].includes(event.type)) {
      const explosion = event.type === 'explosion';
      for (let i = 0; i < (explosion ? 20 : 5); i++) {
        const a = i * 2.399, r = explosion ? 65 + i * 4 : 12 + i * 4;
        const dot = this.add.circle(event.x, event.y, explosion ? 8 : 3, explosion ? (i % 2 ? 0xffcb60 : 0xe57940) : event.type === 'plant' ? 0xd2e293 : 0xf1d9a1);
        this.effects.add(dot);
        this.tweens.add({ targets: dot, x: event.x + Math.cos(a) * r, y: event.y + Math.sin(a) * r, alpha: 0, scale: 0.3, duration: explosion ? 700 : 420, onComplete: () => dot.destroy() });
      }
      if (explosion) this.cameras.main.shake(150, 0.003);
    }
  }
}
