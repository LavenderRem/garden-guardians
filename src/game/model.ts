import { BOARD, ENEMIES, PLANTS, cellX, cellY, type EnemyType, type Level, type PlantType } from './content';

export interface Plant { id: number; type: PlantType; row: number; col: number; hp: number; next: number; plantedAt: number }
export interface Enemy { id: number; type: EnemyType; row: number; x: number; hp: number; eating: boolean; nextBite: number }
export interface Projectile { id: number; row: number; x: number; damage: number }
export interface Token { id: number; x: number; y: number; born: number; expires: number; source: 'sky' | 'plant' }
export interface BattleEvent { type: string; x: number; y: number; id?: number }
export type PlantResult = 'ok' | 'invalid' | 'occupied' | 'cooldown' | 'funds' | 'inactive';
const STEP = 1 / 60;

export class Battle {
  time = 0;
  resources: number;
  status: 'playing' | 'won' | 'lost' = 'playing';
  paused = false;
  plants: Plant[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  tokens: Token[] = [];
  rescues = Array<boolean>(5).fill(true);
  carts: { id: number; row: number; x: number }[] = [];
  cooldowns: Record<PlantType, number> = { glow: 0, shooter: 0, wall: 0, bomb: 0 };
  events: BattleEvent[] = [];
  spawned = 0;
  defeated = 0;
  collected = 0;
  private nextId = 1;
  private accumulator = 0;
  private nextSky = 3;
  private skyCount = 0;

  constructor(public readonly level: Level) { this.resources = level.resources; }
  get active() { return this.status === 'playing' && !this.paused; }
  get progress() { return this.spawned / Math.max(1, this.level.spawns.length); }
  remainingCooldown(type: PlantType) { return Math.max(0, this.cooldowns[type] - this.time); }

  canPlant(type: PlantType, row: number, col: number): PlantResult {
    if (!this.active) return 'inactive';
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= BOARD.rows || col < 0 || col >= BOARD.cols) return 'invalid';
    if (this.plants.some(p => p.row === row && p.col === col)) return 'occupied';
    if (this.remainingCooldown(type) > 0.0001) return 'cooldown';
    if (this.resources < PLANTS[type].cost) return 'funds';
    return 'ok';
  }
  plant(type: PlantType, row: number, col: number): PlantResult {
    const result = this.canPlant(type, row, col);
    if (result !== 'ok') return result;
    this.resources -= PLANTS[type].cost;
    this.cooldowns[type] = this.time + PLANTS[type].cooldown;
    this.plants.push({ id: this.nextId++, type, row, col, hp: PLANTS[type].hp, next: this.time + (type === 'glow' ? 8 : type === 'bomb' ? 1 : 0.3), plantedAt: this.time });
    this.emit('plant', cellX(col), cellY(row));
    return 'ok';
  }
  remove(row: number, col: number) {
    if (!this.active) return false;
    const plant = this.plants.find(p => p.row === row && p.col === col);
    if (!plant) return false;
    this.plants = this.plants.filter(p => p !== plant);
    this.emit('remove', cellX(col), cellY(row));
    return true;
  }
  collect(id: number) {
    if (!this.active) return false;
    const token = this.tokens.find(t => t.id === id);
    if (!token) return false;
    this.tokens = this.tokens.filter(t => t !== token);
    this.resources += 25;
    this.collected += 25;
    this.emit('collect', token.x, token.y);
    return true;
  }
  advance(seconds: number) {
    if (!this.active || !Number.isFinite(seconds) || seconds <= 0) return;
    this.accumulator += seconds;
    while (this.accumulator + 1e-9 >= STEP && this.active) {
      this.accumulator -= STEP;
      this.tick();
    }
  }
  drainEvents() { return this.events.splice(0); }
  private emit(type: string, x = 0, y = 0, id?: number) { this.events.push({ type, x, y, id }); }
  private addToken(x: number, y: number, source: Token['source']) {
    this.tokens.push({ id: this.nextId++, x, y, source, born: this.time, expires: this.time + 18 });
  }
  private tick() {
    this.time += STEP;
    while (this.spawned < this.level.spawns.length && this.level.spawns[this.spawned].at <= this.time) {
      const spawn = this.level.spawns[this.spawned++];
      this.enemies.push({ id: this.nextId++, type: spawn.type, row: spawn.row, x: 1150, hp: ENEMIES[spawn.type].hp, eating: false, nextBite: 0 });
      if (this.spawned === 1 || this.spawned === Math.ceil(this.level.spawns.length * 0.55) || this.spawned === this.level.spawns.length) this.emit('wave', 1150, cellY(spawn.row));
    }
    if (this.time >= this.nextSky) {
      this.addToken(cellX((this.skyCount * 5 + 3) % 9), cellY((this.skyCount * 3 + 1) % 5) - 35, 'sky');
      this.skyCount++;
      this.nextSky += 5;
    }
    this.tokens = this.tokens.filter(t => t.expires > this.time);
    for (const plant of this.plants) {
      if (plant.hp <= 0 || plant.next > this.time) continue;
      const x = cellX(plant.col);
      if (plant.type === 'glow') {
        this.addToken(x + 23, cellY(plant.row) - 42, 'plant');
        plant.next = this.time + 8;
      } else if (plant.type === 'shooter') {
        const target = this.enemies.filter(e => e.hp > 0 && e.row === plant.row && e.x > x - 10).sort((a, b) => a.x - b.x)[0];
        if (target) {
          // 贴身目标可能已经越过炮口，出生位置不能跳过目标。
          this.projectiles.push({ id: this.nextId++, row: plant.row, x: Math.min(x + 26, target.x), damage: 25 });
          plant.next = this.time + 1.35;
          this.emit('shoot', x, cellY(plant.row) - 43, plant.id);
        }
      } else if (plant.type === 'bomb') {
        for (const enemy of this.enemies) {
          if (Math.abs(enemy.row - plant.row) <= 1 && Math.abs(enemy.x - x) <= BOARD.cell * 1.5) enemy.hp -= 600;
        }
        plant.hp = 0;
        this.emit('explosion', x, cellY(plant.row) - 30);
      }
    }
    for (const shot of this.projectiles) {
      const nextX = shot.x + 410 * STEP;
      const target = this.enemies.filter(e => e.hp > 0 && e.row === shot.row && e.x + 20 >= shot.x && e.x - 20 <= nextX).sort((a, b) => a.x - b.x)[0];
      if (target) {
        target.hp -= shot.damage;
        shot.damage = 0;
        this.emit(target.type === 'armor' ? 'armor-hit' : 'hit', target.x, cellY(target.row) - 50, target.id);
      }
      shot.x = nextX;
    }
    this.projectiles = this.projectiles.filter(p => p.damage > 0 && p.x < 1220);
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const plant = this.plants.filter(p => p.hp > 0 && p.row === enemy.row && enemy.x >= cellX(p.col) - 20 && enemy.x <= cellX(p.col) + 43).sort((a, b) => b.col - a.col)[0];
      enemy.eating = !!plant;
      if (plant) {
        if (enemy.nextBite <= this.time) {
          plant.hp -= ENEMIES[enemy.type].damage;
          enemy.nextBite = this.time + 0.8;
          this.emit('bite', cellX(plant.col), cellY(plant.row) - 35);
        }
      } else enemy.x -= ENEMIES[enemy.type].speed * STEP;
      if (enemy.x < BOARD.x - 30) {
        if (this.rescues[enemy.row]) {
          this.rescues[enemy.row] = false;
          this.carts.push({ id: this.nextId++, row: enemy.row, x: BOARD.x - 46 });
          this.emit('rescue', BOARD.x - 46, cellY(enemy.row));
        } else if (!this.carts.some(c => c.row === enemy.row && c.x <= enemy.x + 45)) this.status = 'lost';
      }
    }
    for (const cart of this.carts) {
      const oldX = cart.x;
      cart.x += 760 * STEP;
      for (const enemy of this.enemies) {
        if (enemy.row === cart.row && enemy.x >= oldX - 50 && enemy.x <= cart.x + 50) enemy.hp = 0;
      }
    }
    this.carts = this.carts.filter(c => c.x < 1240);
    this.plants = this.plants.filter(p => p.hp > 0);
    for (const enemy of this.enemies.filter(e => e.hp <= 0)) {
      this.defeated++;
      this.emit('defeat', enemy.x, cellY(enemy.row), enemy.id);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.status === 'playing' && this.spawned >= this.level.spawns.length && this.enemies.length === 0) this.status = 'won';
  }
}
