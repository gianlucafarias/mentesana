import achievementService from '../services/achievement.service.js';

const mapEventType = (eventType) => {
  switch (eventType) {
    case 'tool_completed':
      return 'TOOL_COMPLETED';
    case 'resource_viewed':
      return 'RESOURCE_VIEWED';
    case 'weekly_summary_viewed':
      return 'WEEKLY_SUMMARY_VIEWED';
    default:
      return null;
  }
};

export const getAchievements = async (req, res) => {
  try {
    const payload = await achievementService.getUserAchievements(req.user.id);
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener logros' });
  }
};

export const getAchievementsSummary = async (req, res) => {
  try {
    const summary = await achievementService.getSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener resumen de logros' });
  }
};

export const registerAchievementEvent = async (req, res) => {
  try {
    const { eventType, toolType, resourceId, date } = req.body;
    const type = mapEventType(eventType);

    if (!type) {
      return res.status(400).json({ message: 'Tipo de evento invalido' });
    }

    let key = null;
    if (type === 'TOOL_COMPLETED') key = `tool:${toolType || 'unknown'}`;
    if (type === 'RESOURCE_VIEWED') key = `resource:${resourceId || 'unknown'}`;
    if (type === 'WEEKLY_SUMMARY_VIEWED') key = `weekly:${new Date(date || Date.now()).toISOString().slice(0, 10)}`;

    const result = await achievementService.recordEvent(req.user.id, {
      type,
      key,
      metadata: { toolType: toolType || null, resourceId: resourceId || null },
      date: date || new Date(),
    });

    const refreshed = await achievementService.getUserAchievements(req.user.id);
    res.status(201).json({
      message: 'Evento registrado',
      unlockedNow: result.unlockedNow,
      ...refreshed,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar evento de logro' });
  }
};
