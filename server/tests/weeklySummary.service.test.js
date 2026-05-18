import { buildWeeklyStats } from '../src/services/weeklySummary.service.js';

describe('weeklySummary.service', () => {
  test('calcula estadísticas comparativas de semanas', () => {
    const currentWeekEntries = [
      { mood: 4, notes: 'bien' },
      { mood: 3, notes: '' },
      { mood: 5, notes: 'mejor' },
    ];
    const previousWeekEntries = [
      { mood: 2, notes: 'mal' },
      { mood: 3, notes: null },
    ];

    const stats = buildWeeklyStats(currentWeekEntries, previousWeekEntries);
    expect(stats.currentWeek.entries).toBe(3);
    expect(stats.previousWeek.entries).toBe(2);
    expect(stats.currentWeek.avgMood).toBe(4);
    expect(stats.previousWeek.avgMood).toBe(2.5);
    expect(stats.differences.moodDelta).toBe(1.5);
  });

  test('maneja semanas sin entradas', () => {
    const stats = buildWeeklyStats([], []);
    expect(stats.currentWeek.avgMood).toBe(0);
    expect(stats.previousWeek.avgMood).toBe(0);
    expect(stats.differences.moodDelta).toBe(0);
  });
});
