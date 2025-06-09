import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// para mapear el mood
const getMoodText = (mood) => {
  const moodMap = {
    1: "muy triste",
    2: "triste", 
    3: "regular",
    4: "bien",
    5: "muy bien",
    6: "fantástico",
    7: "increible",
  };
  return moodMap[mood] || "regular";
};

export const generateMotivationalMessage = async (mood, notes) => {
  try {
    const moodText = getMoodText(mood);
    
    const prompt = `Eres un asistente de bienestar mental especializado en dar apoyo emocional. Un usuario te comparte su estado de ánimo y sus pensamientos del día.

Estado de ánimo: ${moodText} (${mood}/5)
Notas del día: ${notes || 'No hay notas adicionales'}

Por favor, proporciona un mensaje motivacional, empático y de apoyo de máximo 150 palabras. El mensaje debe:
- Validar sus sentimientos
- Ofrecer perspectiva positiva sin minimizar sus emociones
- Incluir consejos prácticos o sugerencias si es apropiado
- Ser cálido y alentador
- Estar en español, particularmente castellano argentino

Responde directamente con el mensaje, sin prefijos como "Mensaje:" o similares.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo más económico de OpenAI
      messages: [
        {
          role: "system",
          content: "Eres un asistente empático llamado 'MenteSana' especializado en bienestar mental que ofrece apoyo emocional de manera cálida y profesional."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content?.trim() || "Gracias por compartir tu día conmigo. Recuerda que cada día es una nueva oportunidad para crecer y sentirte mejor. 💙";
    
  } catch (error) {
    console.error('Error al generar mensaje motivacional:', error);
    // Mensaje de fallback en caso de error
    return "Gracias por compartir tu día conmigo. Recuerda que tus sentimientos son válidos y que cada día es una nueva oportunidad. ¡Estoy aquí para apoyarte! 💙";
  }
}; 