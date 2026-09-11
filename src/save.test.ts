import { expect, it } from 'vitest';
import { decodeSave, completeLevel } from './save';
it('空或损坏存档恢复可玩的默认值', () => {
  expect(decodeSave(null)).toEqual({ version: 1, unlocked: 1, completed: [], volume: 0.45 });
  expect(decodeSave('{oops')).toEqual(decodeSave(null));
  expect(decodeSave('null')).toEqual(decodeSave(null));
});
it('范围和类型异常不能导致无效关卡或音量', () => {
  expect(decodeSave('{"version":1,"unlocked":99,"volume":-4,"completed":[1,8,"2"]}')).toEqual({ version: 1, unlocked: 3, completed: [1], volume: 0 });
  expect(decodeSave('{"version":1,"unlocked":"2","volume":"loud"}')).toEqual(decodeSave(null));
});
it('胜利解锁下一关，重复通关不重复记录，第三关不产生第四关', () => {
  const first = completeLevel(decodeSave(null), 1);
  expect(first.unlocked).toBe(2);
  expect(completeLevel(first, 1).completed).toEqual([1]);
  expect(completeLevel(first, 3).unlocked).toBe(3);
});
