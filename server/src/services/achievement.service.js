import { prisma } from '../config/database.js';

const ACHIEVEMENT_DEFINITIONS = [
  {
    key: 'first_step',
    title: 'Primer paso',
    description: 'Guardaste tu primer check-in.',
    category: 'constancia',
    target: 1,
    icon: 'badge_1.png',
    tone: 'mint',
    sortOrder: 1,
  },
  {
    key: 'present_3_days',
    title: '3 dias presente',
    description: 'Completaste 3 check-ins en 7 dias.',
    category: 'constancia',
    target: 3,
    icon: 'badge_10.png',
    tone: 'purple',
    sortOrder: 2,
  },
  {
    key: 'emotional_explorer',
    title: 'Explorador emocional',
    description: 'Completaste 10 dias con check-in.',
    category: 'autoconocimiento',
    target: 10,
    icon: 'badge_9.png',
    tone: 'coral',
    sortOrder: 3,
  },
  {
    key: 'streak_7',
    title: 'Semana encendida',
    description: 'Lograste una racha de 7 dias.',
    category: 'constancia',
    target: 7,
    icon: 'badge_3.png',
    tone: 'yellow',
    sortOrder: 4,
  },
  {
    key: 'know_myself',
    title: 'Me conozco mejor',
    description: 'Hiciste 5 check-ins con nota.',
    category: 'autoconocimiento',
    target: 5,
    icon: 'badge_2.png',
    tone: 'pink',
    sortOrder: 5,
  },
  {
    key: 'calm_kit',
    title: 'Kit de calma',
    description: 'Completaste 3 actividades de bienestar.',
    category: 'bienestar',
    target: 3,
    icon: 'badge_4.png',
    tone: 'mint',
    sortOrder: 6,
  },
  {
    key: 'curious_mind',
    title: 'Mente curiosa',
    description: 'Exploraste 3 recursos.',
    category: 'exploracion',
    target: 3,
    icon: 'badge_6.png',
    tone: 'blue',
    sortOrder: 7,
  },
  {
    key: 'steady_pulse',
    title: 'Pulso estable',
    description: 'Completaste 4 semanas con 3+ check-ins.',
    category: 'constancia',
    target: 4,
    icon: 'badge_8.png',
    tone: 'purple',
    sortOrder: 8,
  },
];

const toLocalDateKey = (dateInput) => {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeCurrentStreak = (dateKeys) => {
  if (!dateKeys.length) return 0;
  const set = new Set(dateKeys);
  let cursor = new Date();
  let streak = 0;

  while (set.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const computeWeeksWithThree = (dateKeys) => {
  const counts = new Map();

  dateKeys.forEach((key) => {
    const date = new Date(`${key}T00:00:00`);
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    const weekKey = toLocalDateKey(monday);
    counts.set(weekKey, (counts.get(weekKey) || 0) + 1);
  });

  return [...counts.values()].filter((count) => count >= 3).length;
};

class AchievementService {
  async ensureDefinitions() {
    await Promise.all(
      ACHIEVEMENT_DEFINITIONS.map((definition) =>
        prisma.achievementDefinition.upsert({
          where: { key: definition.key },
          create: definition,
          update: {
            title: definition.title,
            description: definition.description,
            category: definition.category,
            target: definition.target,
            icon: definition.icon,
            tone: definition.tone,
            sortOrder: definition.sortOrder,
            isActive: true,
          },
        })
      )
    );
  }

  async syncUserAchievements(userId) {
    await this.ensureDefinitions();

    const definitions = await prisma.achievementDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const entries = await prisma.dailyEntry.findMany({
      where: { userId },
      select: { date: true, notes: true },
      orderBy: { date: 'desc' },
    });

    const toolEvents = await prisma.userActivityEvent.findMany({
      where: { userId, type: 'TOOL_COMPLETED' },
      select: { eventKey: true },
      distinct: ['eventKey'],
    });

    const resourceEvents = await prisma.userActivityEvent.findMany({
      where: { userId, type: 'RESOURCE_VIEWED' },
      select: { eventKey: true },
      distinct: ['eventKey'],
    });

    const dailyKeys = [...new Set(entries.map((entry) => toLocalDateKey(entry.date)))];
    const entriesWithNotes = entries.filter((entry) => typeof entry.notes === 'string' && entry.notes.trim().length > 0).length;

    const metrics = {
      first_step: dailyKeys.length,
      present_3_days: Math.min(3, dailyKeys.slice(0, 7).length),
      emotional_explorer: dailyKeys.length,
      streak_7: computeCurrentStreak(dailyKeys),
      know_myself: entriesWithNotes,
      calm_kit: toolEvents.length,
      curious_mind: resourceEvents.length,
      steady_pulse: computeWeeksWithThree(dailyKeys),
    };

    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
    const existingByAchievement = new Map(existing.map((item) => [item.achievement.key, item]));

    const now = new Date();
    const unlockedNow = [];

    for (const definition of definitions) {
      const currentRaw = metrics[definition.key] || 0;
      const current = Math.max(0, Math.min(currentRaw, definition.target));
      const status = current >= definition.target ? 'UNLOCKED' : current > 0 ? 'IN_PROGRESS' : 'LOCKED';

      const prev = existingByAchievement.get(definition.key);
      const wasUnlocked = prev?.status === 'UNLOCKED';
      const unlockedAt = status === 'UNLOCKED' ? prev?.unlockedAt || now : null;

      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: definition.id,
          },
        },
        create: {
          userId,
          achievementId: definition.id,
          target: definition.target,
          current,
          status,
          unlockedAt,
          lastProgressAt: current > 0 ? now : null,
        },
        update: {
          target: definition.target,
          current,
          status,
          unlockedAt,
          lastProgressAt: current > 0 ? now : prev?.lastProgressAt,
        },
      });

      if (!wasUnlocked && status === 'UNLOCKED') {
        unlockedNow.push(definition.key);
      }
    }

    return { unlockedNow };
  }

  async recordEvent(userId, { type, key, metadata = null, date = new Date() }) {
    await prisma.userActivityEvent.upsert({
      where: {
        userId_type_eventKey: {
          userId,
          type,
          eventKey: key,
        },
      },
      create: {
        userId,
        type,
        eventKey: key,
        metadata,
        date: new Date(date),
      },
      update: {
        metadata,
        date: new Date(date),
      },
    });

    return this.syncUserAchievements(userId);
  }

  async getUserAchievements(userId) {
    await this.syncUserAchievements(userId);

    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { achievement: { sortOrder: 'asc' } },
    });

    const mapped = achievements.map((item) => ({
      key: item.achievement.key,
      title: item.achievement.title,
      description: item.achievement.description,
      category: item.achievement.category,
      icon: item.achievement.icon,
      tone: item.achievement.tone,
      target: item.target,
      current: item.current,
      status: item.status,
      unlockedAt: item.unlockedAt,
    }));

    const unlocked = mapped
      .filter((item) => item.status === 'UNLOCKED')
      .sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0));
    const inProgress = mapped
      .filter((item) => item.status === 'IN_PROGRESS')
      .sort((a, b) => b.current / b.target - a.current / a.target);

    const highlights = {
      latestUnlocked: unlocked[0] || null,
      inProgress: inProgress.slice(0, 2),
    };

    return { achievements: mapped, highlights };
  }

  async getSummary(userId) {
    const { achievements } = await this.getUserAchievements(userId);

    const unlocked = achievements.filter((item) => item.status === 'UNLOCKED').length;
    const inProgress = achievements.filter((item) => item.status === 'IN_PROGRESS').length;
    const nextToUnlock = achievements
      .filter((item) => item.status !== 'UNLOCKED')
      .sort((a, b) => b.current / b.target - a.current / a.target)[0] || null;

    return {
      unlocked,
      inProgress,
      total: achievements.length,
      nextToUnlock,
    };
  }
}

export default new AchievementService();
