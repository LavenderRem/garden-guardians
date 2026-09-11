export const BOARD = { x: 232, y: 136, cell: 96, rows: 5, cols: 9 };
export const cellX = (col: number) => BOARD.x + col * BOARD.cell + BOARD.cell / 2;
export const cellY = (row: number) => BOARD.y + row * BOARD.cell + 80;
export const PLANTS = {
  glow: { name: '灯铃花', role: '生产光露', cost: 50, cooldown: 5, hp: 100, description: '每 8 秒产出 25 光露，先种在后排。' },
  shooter: { name: '种荚射手', role: '远程攻击', cost: 100, cooldown: 4, hp: 130, description: '向本行发射种子，守住每一条小路。' },
  wall: { name: '栗壳卫士', role: '坚实阻挡', cost: 75, cooldown: 9, hp: 700, description: '耐心挡住来客，为射手争取时间。' },
  bomb: { name: '火椒果', role: '范围爆破', cost: 125, cooldown: 18, hp: 150, description: '栽下 1 秒后炸开，清理周围 3 × 3 格。' },
} as const;
export type PlantType = keyof typeof PLANTS;
export const ENEMIES = {
  normal: { name: '苔帽园丁', hp: 125, speed: 18, damage: 22 },
  armor: { name: '铁帽园丁', hp: 310, speed: 15, damage: 26 },
  fast: { name: '疾步园丁', hp: 95, speed: 32, damage: 18 },
} as const;
export type EnemyType = keyof typeof ENEMIES;
export interface Spawn { at: number; row: number; type: EnemyType }
export interface Level { id: number; name: string; subtitle: string; description: string; resources: number; spawns: Spawn[] }
const schedule = (entries: [number, number, EnemyType][]): Spawn[] => entries.map(([at, row, type]) => ({ at, row, type }));
export const LEVELS: Level[] = [
  { id: 1, name: '第一缕晨光', subtitle: '01 / 学会守护', description: '种下灯铃花，收集光露，让每一行都有射手。', resources: 250, spawns: schedule([
    [14, 2, 'normal'], [24, 1, 'normal'], [34, 3, 'normal'], [44, 0, 'normal'], [54, 4, 'normal'],
    [64, 2, 'normal'], [68, 1, 'normal'], [72, 3, 'normal'], [78, 0, 'normal'], [82, 4, 'normal'], [87, 2, 'normal'],
  ]) },
  { id: 2, name: '花园里的铁帽', subtitle: '02 / 稳固防线', description: '铁帽来客更耐打。栗壳卫士能为双射手争取时间。', resources: 300, spawns: schedule([
    [10, 1, 'normal'], [18, 3, 'normal'], [26, 0, 'normal'], [32, 4, 'normal'], [38, 2, 'armor'],
    [45, 1, 'armor'], [50, 3, 'normal'], [55, 0, 'normal'], [60, 4, 'armor'], [66, 2, 'normal'],
    [72, 0, 'armor'], [76, 3, 'armor'], [81, 1, 'normal'], [85, 4, 'normal'], [89, 2, 'armor'],
  ]) },
  { id: 3, name: '午后的不速之客', subtitle: '03 / 全力以赴', description: '疾步来客冲进庭院，留一些光露给火椒果。', resources: 350, spawns: schedule([
    [10, 2, 'normal'], [17, 0, 'normal'], [23, 4, 'normal'], [29, 1, 'fast'], [35, 3, 'fast'],
    [40, 2, 'armor'], [46, 0, 'fast'], [50, 4, 'armor'], [55, 1, 'normal'], [59, 3, 'armor'],
    [64, 2, 'fast'], [68, 0, 'armor'], [72, 4, 'fast'], [76, 1, 'armor'], [80, 3, 'fast'],
    [84, 0, 'fast'], [87, 2, 'armor'], [90, 4, 'fast'], [94, 1, 'fast'], [98, 3, 'armor'],
  ]) },
];
