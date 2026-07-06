import { expect, test, describe } from 'vitest';
import { scoreToStatus } from '../lib/utils/health';

describe('scoreToStatus', () => {
  test('returns unknown for null or undefined', () => {
    expect(scoreToStatus(null)).toBe('unknown');
    // @ts-ignore
    expect(scoreToStatus(undefined)).toBe('unknown');
  });

  test('returns healthy for scores < 33', () => {
    expect(scoreToStatus(0)).toBe('healthy');
    expect(scoreToStatus(32)).toBe('healthy');
  });

  test('returns watch for scores >= 33 and < 66', () => {
    expect(scoreToStatus(33)).toBe('watch');
    expect(scoreToStatus(65)).toBe('watch');
  });

  test('returns alert for scores >= 66', () => {
    expect(scoreToStatus(66)).toBe('alert');
    expect(scoreToStatus(100)).toBe('alert');
  });
});
