import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const DAILY_AI_MODEL = process.env.OPENAI_DAILY_MODEL || 'gpt-5.4-nano';
export const DAILY_PROMPT_VERSION = '2026-05-14.v1';
const parseTokenBudget = (rawValue, fallbackValue) => {
  const parsed = Number.parseInt(String(rawValue ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 200 ? parsed : fallbackValue;
};
const DAILY_MAX_COMPLETION_TOKENS = parseTokenBudget(process.env.OPENAI_DAILY_MAX_COMPLETION_TOKENS, 560);
const DAILY_RETRY_MAX_COMPLETION_TOKENS = parseTokenBudget(process.env.OPENAI_DAILY_RETRY_MAX_COMPLETION_TOKENS, 960);

export class AIResponseValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AIResponseValidationError';
  }
}

export const getMoodText = (mood) => {
  const moodMap = {
    1: 'muy triste',
    2: 'triste',
    3: 'regular',
    4: 'bien',
    5: 'muy bien',
  };
  return moodMap[mood] || 'regular';
};

export const buildDailySafetySystemPrompt = () => `Eres MenteSana, un asistente de apoyo emocional para adolescentes.
Tu objetivo es brindar contención breve, clara y segura. No reemplazas a profesionales de salud mental.

Reglas obligatorias:
1) Valida emociones sin juzgar ni minimizar.
2) No des instrucciones peligrosas, ilegales, autolesivas, de restricción extrema de comida, consumo problemático, violencia ni aislamiento.
3) Si detectas riesgo (autolesión, suicidio, daño a terceros, abuso, coerción, consumo riesgoso, crisis intensa):
   - Prioriza seguridad inmediata.
   - Recomienda buscar ayuda de un adulto de confianza/profesional/servicios de emergencia locales.
   - Usa tono calmado, directo y no moralizante.
4) No diagnostiques ni afirmes enfermedades.
5) No des consejos médicos, legales o farmacológicos específicos.
6) Da 1 a 3 acciones concretas, seguras y de bajo riesgo para las próximas 24 horas.
7) Mensaje en español rioplatense, máximo 120 palabras, tono cálido-profesional.
8) Si la entrada del usuario es ambigua o breve, evita inventar y da apoyo general útil.
9) Evita frases vacías o genéricas ("todo va a estar bien", "seguí así"). Debes ser concreto.
10) Debes conectar explícitamente el mensaje con lo que la persona escribió (disparador, emoción y contexto).
11) Los pasos deben ser micro-acciones realistas para próximas 24 horas, con foco en regular emoción y recuperar sensación de control.

Responde SOLO JSON válido con esta forma:
{
  "message": "mensaje final completo para fallback en texto plano",
  "uiMessage": {
    "title": "título breve (máximo 8 palabras)",
    "summary": "resumen empático en 1 o 2 frases",
    "steps": ["acción concreta 1", "acción concreta 2", "acción concreta 3"],
    "closing": "cierre breve y cuidadoso"
  },
  "riskLevel": "low|medium|high|critical",
  "safetyFlags": ["self_harm","suicidal_ideation","harm_others","abuse","substance_risk","eating_disorder_risk","panic_crisis","other"]
}`;

const buildDailyUserPrompt = (mood, notes) => {
  const moodText = getMoodText(mood);
  return `Estado de ánimo reportado: ${moodText} (${mood}/5)
Notas del día: ${notes || 'No hay notas adicionales'}

Genera el mensaje final siguiendo el protocolo de seguridad.

Requisitos de calidad:
- title: específico al caso (no genérico), máximo 8 palabras.
- summary: 2 frases. Frase 1 refleja qué pasó; frase 2 propone dirección concreta.
- steps: exactamente 3 acciones, cada una iniciando con un horizonte temporal breve:
  1) "Ahora (2-5 min): ..."
  2) "Hoy (10-20 min): ..."
  3) "Antes de dormir: ..."
- closing: 1 frase de contención + 1 criterio de pedir ayuda si escala.

Evita:
- repetir texto literal del usuario sin aportar.
- consejos vagos o poco aplicables.
- más de 120 palabras en total sumando summary+steps+closing.`;
};

const safeJsonParse = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') return null;
  const cleaned = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

export const extractResponseText = (rawContent) => {
  if (typeof rawContent === 'string') return rawContent;
  if (!Array.isArray(rawContent)) return '';

  return rawContent
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
      return '';
    })
    .join('');
};

export const isLikelyTruncatedJson = (rawContent) => {
  if (typeof rawContent !== 'string') return false;
  const cleaned = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!cleaned) return false;

  if (cleaned.startsWith('{') && !cleaned.endsWith('}')) return true;
  if (cleaned.startsWith('[') && !cleaned.endsWith(']')) return true;

  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;

  return openBraces > closeBraces || openBrackets > closeBrackets;
};

const normalizeUiMessage = (uiMessage) => {
  if (!uiMessage || typeof uiMessage !== 'object') return null;
  const title = typeof uiMessage.title === 'string' ? uiMessage.title.trim() : '';
  const summary = typeof uiMessage.summary === 'string' ? uiMessage.summary.trim() : '';
  const steps = Array.isArray(uiMessage.steps)
    ? uiMessage.steps.filter((step) => typeof step === 'string').map((step) => step.trim()).filter(Boolean).slice(0, 3)
    : [];
  const closing = typeof uiMessage.closing === 'string' ? uiMessage.closing.trim() : '';

  if (!title && !summary && steps.length === 0 && !closing) {
    return null;
  }
  return { title, summary, steps, closing };
};

const composeMessageFromUi = (uiMessage) => {
  if (!uiMessage) return '';
  const sections = [];
  if (uiMessage.summary) sections.push(uiMessage.summary);
  if (uiMessage.steps.length > 0) {
    sections.push(uiMessage.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'));
  }
  if (uiMessage.closing) sections.push(uiMessage.closing);
  return sections.join('\n\n').trim();
};

const isValidRiskLevel = (riskLevel) =>
  ['low', 'medium', 'high', 'critical'].includes(riskLevel);

const validateParsedPayload = (parsed) => {
  if (!parsed || typeof parsed !== 'object') {
    throw new AIResponseValidationError('Respuesta IA no es un objeto JSON válido');
  }

  const uiMessage = normalizeUiMessage(parsed.uiMessage);
  const plainFromUi = composeMessageFromUi(uiMessage);
  const rawMessage = typeof parsed.message === 'string' ? parsed.message.trim() : '';
  const message = rawMessage || plainFromUi;
  if (!message) {
    throw new AIResponseValidationError('Respuesta IA sin contenido de mensaje');
  }

  if (!isValidRiskLevel(parsed.riskLevel)) {
    throw new AIResponseValidationError('Respuesta IA con riskLevel inválido');
  }

  if (!Array.isArray(parsed.safetyFlags)) {
    throw new AIResponseValidationError('Respuesta IA con safetyFlags inválido');
  }

  return {
    message,
    uiMessage,
    riskLevel: parsed.riskLevel,
    safetyFlags: parsed.safetyFlags.slice(0, 8),
  };
};

const callDailyAI = async (mood, notes, attempt = 1) => {
  const strictInstruction = attempt > 1
    ? '\nIMPORTANTE: Tu respuesta anterior fue inválida. Devuelve SOLO JSON válido sin texto extra.'
    : '';
  const maxCompletionTokens = attempt > 1
    ? DAILY_RETRY_MAX_COMPLETION_TOKENS
    : DAILY_MAX_COMPLETION_TOKENS;

  const uiMessageSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      steps: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 3
      },
      closing: { type: 'string' }
    },
    required: ['title', 'summary', 'steps', 'closing']
  };

  const responseSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
      uiMessage: uiMessageSchema,
      riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      safetyFlags: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'self_harm',
            'suicidal_ideation',
            'harm_others',
            'abuse',
            'substance_risk',
            'eating_disorder_risk',
            'panic_crisis',
            'other'
          ]
        },
        maxItems: 8
      }
    },
    required: ['message', 'uiMessage', 'riskLevel', 'safetyFlags']
  };

  const completion = await openai.chat.completions.create({
    model: DAILY_AI_MODEL,
    messages: [
      { role: 'system', content: `${buildDailySafetySystemPrompt()}${strictInstruction}` },
      { role: 'user', content: buildDailyUserPrompt(mood, notes) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'daily_support_message',
        strict: true,
        schema: responseSchema
      }
    },
    max_completion_tokens: maxCompletionTokens,
    temperature: attempt > 1 ? 0.1 : 0.2,
  });
  const firstChoice = completion.choices[0];
  const finishReason = firstChoice?.finish_reason || '';
  const raw = extractResponseText(firstChoice?.message?.content);

  if (finishReason === 'length' || isLikelyTruncatedJson(raw)) {
    const sample = String(raw).slice(0, 240);
    throw new AIResponseValidationError(`Respuesta IA truncada (finish_reason=${finishReason || 'unknown'}). Raw sample: ${sample}`);
  }
  const parsed = safeJsonParse(raw);
  if (!parsed) {
    const sample = String(raw).slice(0, 240);
    throw new AIResponseValidationError(`Respuesta IA no es un objeto JSON válido (finish_reason=${finishReason || 'unknown'}). Raw sample: ${sample}`);
  }
  return validateParsedPayload(parsed);
};

export const generateMotivationalMessage = async (mood, notes) => {
  try {
    const validated = await callDailyAI(mood, notes, 1);
    return {
      ...validated,
      model: DAILY_AI_MODEL,
      promptVersion: DAILY_PROMPT_VERSION,
    };
  } catch (firstError) {
    console.warn('Primer intento IA inválido. Reintentando una vez...', firstError.message);
    const validated = await callDailyAI(mood, notes, 2);
    return {
      ...validated,
      model: DAILY_AI_MODEL,
      promptVersion: DAILY_PROMPT_VERSION,
    };
  }
};
