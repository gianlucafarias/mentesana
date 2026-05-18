import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const WEEKLY_AI_MODEL = process.env.OPENAI_WEEKLY_MODEL || 'gpt-5.4-nano';
export const WEEKLY_PROMPT_VERSION = '2026-05-14.v1';

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfWeek = (weekStart) => {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getCurrentWeekRange = () => {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(weekStart);
  return { weekStart, weekEnd };
};

export const buildWeeklyStats = (currentWeekEntries, previousWeekEntries) => {
  const avg = (entries) => entries.length === 0
    ? 0
    : entries.reduce((acc, entry) => acc + entry.mood, 0) / entries.length;

  const currentAvgMood = avg(currentWeekEntries);
  const previousAvgMood = avg(previousWeekEntries);
  const currentNotesCount = currentWeekEntries.filter((entry) => entry.notes && entry.notes.trim().length > 0).length;
  const previousNotesCount = previousWeekEntries.filter((entry) => entry.notes && entry.notes.trim().length > 0).length;

  return {
    currentWeek: {
      entries: currentWeekEntries.length,
      avgMood: Number(currentAvgMood.toFixed(2)),
      notesCount: currentNotesCount,
    },
    previousWeek: {
      entries: previousWeekEntries.length,
      avgMood: Number(previousAvgMood.toFixed(2)),
      notesCount: previousNotesCount,
    },
    differences: {
      moodDelta: Number((currentAvgMood - previousAvgMood).toFixed(2)),
      entriesDelta: currentWeekEntries.length - previousWeekEntries.length,
      notesDelta: currentNotesCount - previousNotesCount,
    }
  };
};

const buildWeeklySystemPrompt = () => `Eres MenteSana, asistente de apoyo emocional para adolescentes.
Debes crear un resumen semanal comparativo seguro y útil.

Reglas:
- No diagnosticar.
- No dar consejos médicos/farmacológicos.
- No sugerir conductas riesgosas.
- Si detectas señales de riesgo, prioriza pedir apoyo adulto/profesional.
- Respuesta en español rioplatense, clara y breve.

Devuelve SOLO JSON:
{
  "summary": "resumen comparativo en máximo 90 palabras",
  "advice": "2 a 3 consejos concretos y seguros para la próxima semana, máximo 90 palabras",
  "riskLevel": "low|medium|high|critical",
  "safetyFlags": []
}`;

const buildWeeklyUserPrompt = (stats) => `Datos comparativos:
- Semana actual: ${stats.currentWeek.entries} entradas, ánimo promedio ${stats.currentWeek.avgMood}/5, notas ${stats.currentWeek.notesCount}
- Semana anterior: ${stats.previousWeek.entries} entradas, ánimo promedio ${stats.previousWeek.avgMood}/5, notas ${stats.previousWeek.notesCount}
- Diferencias: cambio ánimo ${stats.differences.moodDelta}, cambio entradas ${stats.differences.entriesDelta}, cambio notas ${stats.differences.notesDelta}

Genera resumen y consejos accionables para la próxima semana.`;

export const generateWeeklySummaryWithAI = async (stats) => {
  try {
    const completion = await openai.chat.completions.create({
      model: WEEKLY_AI_MODEL,
      messages: [
        { role: 'system', content: buildWeeklySystemPrompt() },
        { role: 'user', content: buildWeeklyUserPrompt(stats) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_completion_tokens: 420,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : 'Esta semana hubo cambios en tu registro emocional. Revisar tus hábitos diarios puede ayudarte a estabilizarte.',
      advice: typeof parsed.advice === 'string' && parsed.advice.trim() ? parsed.advice.trim() : 'Elegí dos momentos fijos para registrar cómo te sentís. Sumá una actividad breve de autocuidado y hablá con alguien de confianza cuando notes que bajás varios días seguidos.',
      riskLevel: ['low', 'medium', 'high', 'critical'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low',
      safetyFlags: Array.isArray(parsed.safetyFlags) ? parsed.safetyFlags : [],
      model: WEEKLY_AI_MODEL,
      promptVersion: WEEKLY_PROMPT_VERSION,
    };
  } catch (error) {
    console.error('Error generando resumen semanal con IA:', error);
    return {
      summary: 'Esta semana hubo variaciones en tu estado de ánimo. Seguir registrando diariamente ayuda a entender mejor tus patrones.',
      advice: 'Definí una rutina simple: dormir en horario estable, registrar cómo te sentís y pedir apoyo temprano a un adulto de confianza cuando tengas varios días difíciles.',
      riskLevel: 'low',
      safetyFlags: ['other'],
      model: WEEKLY_AI_MODEL,
      promptVersion: WEEKLY_PROMPT_VERSION,
    };
  }
};
