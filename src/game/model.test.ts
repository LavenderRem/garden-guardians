import { describe, expect, it } from 'vitest';
import { Battle } from './model';
import { BOARD, cellX, type Level } from './content';

const level = (overrides: Partial<Level> = {}): Level => ({ id: 1, name: '测试庭院', subtitle: '', description: '', resources: 500, spawns: [{ at: 999, row: 0, type: 'normal' }], ...overrides });

describe('种植与资源', () => {
  it('仅成功种植扣费，拒绝重复格子、越界和冷却中的卡片', () => {
    const b = new Battle(level());
    expect(b.plant('shooter', 2, 0)).toBe('ok');
    expect(b.resources).toBe(400);
    expect(b.plant('wall', 2, 0)).toBe('occupied');
    expect(b.plant('glow', -1, 0)).toBe('invalid');
    expect(b.plant('glow', 0, 9)).toBe('invalid');
    expect(b.plant('glow', 0.5, 1)).toBe('invalid');
    expect(b.plant('shooter', 1, 0)).toBe('cooldown');
    expect(b.resources).toBe(400);
    b.advance(4.1);
    expect(b.plant('shooter', 1, 0)).toBe('ok');
  });
  it('资源不足时不创建植物，铲除不退款', () => {
    const b = new Battle(level({ resources: 50 }));
    expect(b.plant('shooter', 0, 0)).toBe('funds');
    expect(b.plants).toHaveLength(0);
    expect(b.plant('glow', 0, 0)).toBe('ok');
    expect(b.remove(0, 0)).toBe(true);
    expect(b.resources).toBe(0);
    expect(b.remove(0, 0)).toBe(false);
  });
  it('光露只可收集一次，产能植物按模拟时间生产', () => {
    const b = new Battle(level());
    b.plant('glow', 0, 0);
    b.advance(8.1);
    const token = b.tokens.find(t => t.source === 'plant')!;
    expect(token).toBeDefined();
    const before = b.resources;
    expect(b.collect(token.id)).toBe(true);
    expect(b.collect(token.id)).toBe(false);
    expect(b.resources).toBe(before + 25);
  });
  it('暂停冻结模拟且拒绝操作，恢复不补算暂停时间', () => {
    const b = new Battle(level());
    b.advance(2);
    const before = b.time;
    b.paused = true;
    b.advance(20);
    expect(b.time).toBe(before);
    expect(b.plant('glow', 0, 0)).toBe('inactive');
    b.paused = false;
    b.advance(1);
    expect(b.time).toBeCloseTo(before + 1, 4);
  });
});

describe('战斗和波次', () => {
  it('贴近敌人补种射手时，种子也能命中面前目标', () => {
    const b = new Battle(level({ spawns: [{ at: 0, row: 0, type: 'normal' }] }));
    b.advance((1150 - cellX(8)) / 18);
    expect(Math.abs(b.enemies[0].x - cellX(8))).toBeLessThan(1);
    b.plant('shooter', 0, 8);
    b.advance(2);
    expect(b.enemies[0].hp).toBeLessThan(125);
  });
  it('射手只伤害本行敌人，最后一只倒下前不能胜利', () => {
    const b = new Battle(level({ spawns: [{ at: 0, row: 0, type: 'normal' }, { at: 0, row: 1, type: 'normal' }] }));
    b.plant('shooter', 0, 5);
    b.advance(9);
    expect(b.enemies.filter(e => e.row === 0)).toHaveLength(0);
    expect(b.enemies.find(e => e.row === 1)?.hp).toBe(125);
    expect(b.status).toBe('playing');
  });
  it('火椒果伤害相邻行列范围，远处敌人保留', () => {
    const b = new Battle(level({ spawns: [0, 1, 4].map(row => ({ at: 0, row, type: 'armor' as const })) }));
    b.advance(1);
    b.plant('bomb', 0, 8);
    b.advance(1.1);
    expect(b.enemies.map(e => e.row)).toEqual([4]);
    expect(b.plants).toHaveLength(0);
  });
  it('救场装置每行只用一次；后来的敌人突破会失败', () => {
    const b = new Battle(level({ spawns: [{ at: 0, row: 0, type: 'fast' }, { at: 50, row: 0, type: 'fast' }] }));
    b.advance(35);
    expect(b.rescues[0]).toBe(false);
    expect(b.status).toBe('playing');
    b.advance(50);
    expect(b.status).toBe('lost');
  });
  it('所有波次结束并清场后胜利，停止继续生产与出怪', () => {
    const b = new Battle(level({ spawns: [{ at: 0, row: 0, type: 'normal' }] }));
    b.plant('shooter', 0, 5);
    b.advance(12);
    expect(b.status).toBe('won');
    const before = b.time;
    b.advance(30);
    expect(b.time).toBe(before);
  });
  it('遇到栗壳卫士先啃食，不能穿过仍存活的植物', () => {
    const b = new Battle(level({ spawns: [{ at: 0, row: 2, type: 'fast' }] }));
    b.plant('wall', 2, 8);
    b.advance(10);
    expect(b.enemies[0].x).toBeGreaterThan(cellX(8));
    expect(b.enemies[0].x).toBeLessThan(BOARD.x + BOARD.cell * 9 + 30);
    expect(b.enemies[0].eating).toBe(true);
    expect(b.plants[0].hp).toBeLessThan(700);
    expect(b.plants[0].hp).toBeGreaterThan(0);
  });
  it('一次较长推进与多次短推进产生一致战斗结果', () => {
    const a = new Battle(level());
    const b = new Battle(level());
    a.plant('glow', 1, 1); b.plant('glow', 1, 1);
    a.advance(10);
    for (let i = 0; i < 100; i++) b.advance(0.1);
    expect(a.time).toBeCloseTo(b.time, 7);
    expect(a.tokens).toEqual(b.tokens);
  });
});
