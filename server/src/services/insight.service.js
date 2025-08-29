import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import insightController from '../controllers/insight.controller.js';

const prisma = new PrismaClient();

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class InsightService {
  // Generar insights para un usuario específico
  async generateUserInsights(userId) {
    try {
      console.log(`Generando insights para usuario: ${userId}`);
      
      // Obtener estadísticas del usuario
      const stats = await insightController.getInsightStats(userId);
      
      if (stats.totalEntries < 3) {
        throw new Error('Usuario no tiene suficientes entradas para generar insights');
      }

      // Marcar insights existentes como obsoletos
      await insightController.markInsightsAsObsolete(userId);

      // Generar insights usando OpenAI
      const insights = await this.generateInsightsWithAI(stats, userId);
      
      // Guardar insights en la base de datos
      const savedInsights = await this.saveInsights(userId, insights);
      
      console.log(`Insights generados exitosamente para usuario: ${userId}`);
      return savedInsights;

    } catch (error) {
      console.error(`Error generando insights para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Generar insights usando OpenAI
  async generateInsightsWithAI(stats, userId) {
    try {
      const prompt = this.buildInsightPrompt(stats);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un analista de datos especializado en patrones de bienestar mental. 
            Analiza datos específicos y genera insights CONCRETOS y ACCIONABLES.
            
            Responde con un JSON que contenga exactamente este formato:
            {
              "insights": [
                {
                  "type": "pattern|recommendation|trend",
                  "title": "Título específico basado en datos",
                  "description": "Análisis concreto con números y recomendación específica",
                  "confidence": 0.8,
                  "actionable": true,
                  "actionText": "Acción específica",
                  "actionUrl": "/daily-summary"
                }
              ]
            }
            
            REQUISITOS ESTRICTOS:
            - MÁXIMO 2 insights
            - Mencionar números específicos de los datos
            - Identificar patrones REALES (no genéricos)
            - Dar recomendaciones CONCRETAS y específicas
            - Evitar frases motivacionales genéricas
            - Enfocarse en QUÉ HACER basado en los patrones observados`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Más determinístico para análisis específico
        max_tokens: 600,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      const parsedResponse = JSON.parse(response);
      
      // Limitar a máximo 2 insights
      const insights = (parsedResponse.insights || []).slice(0, 2);
      
      return insights;

    } catch (error) {
      console.error('Error generando insights con OpenAI:', error);
      
      // Fallback: generar insights básicos sin IA
      return this.generateFallbackInsights(stats).slice(0, 2);
    }
  }

  // Construir prompt para OpenAI
  buildInsightPrompt(stats) {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    let prompt = `Eres un analista especializado en bienestar mental. Analiza estos datos específicos del usuario y genera MÁXIMO 2 insights personalizados y accionables:

    === DATOS DEL USUARIO ===
    Entradas totales: ${stats.totalEntries || 0}
    Período reciente (últimas ${stats.recentStats?.count || 0} entradas):
    - Promedio estado de ánimo: ${(stats.recentStats?.avgMood || 0).toFixed(1)}/7
    - Distribución de estados de ánimo: ${this.getMoodDistribution(stats.recentStats)}
    - Entradas con reflexiones escritas: ${stats.entriesWithNotes || 0}/${stats.recentStats?.count || 0} (${(stats.notesPercentage || 0).toFixed(0)}%)`;

    // Agregar análisis por día de la semana si hay datos suficientes
    if (stats.recentStats?.dayOfWeekStats && Object.keys(stats.recentStats.dayOfWeekStats).length > 1) {
      const dayStats = Object.keys(stats.recentStats.dayOfWeekStats).map(day => {
        const dayStat = stats.recentStats.dayOfWeekStats[day];
        return `${dayNames[day]}: ${(dayStat?.averageMood || 0).toFixed(1)}/7`;
      }).join(', ');
      prompt += `\n- Patrones por día: ${dayStats}`;
    }

    // Agregar comparación temporal si existe
    if (stats.improvement && stats.previousStats?.count > 0) {
      const trend = stats.improvement.moodDifference > 0.3 ? 'mejorando significativamente' :
                   stats.improvement.moodDifference > 0.1 ? 'mejorando ligeramente' :
                   stats.improvement.moodDifference < -0.3 ? 'declinando' :
                   stats.improvement.moodDifference < -0.1 ? 'bajando ligeramente' : 'estable';
      
      prompt += `\n- Tendencia vs período anterior: ${trend} (${stats.improvement.moodDifference > 0 ? '+' : ''}${stats.improvement.moodDifference.toFixed(1)} puntos)`;
    }

    prompt += `

    === INSTRUCCIONES ===
    Genera EXACTAMENTE 1 o 2 insights que cumplan estos criterios:

    1. ESPECÍFICOS: Basados en patrones REALES de los datos (no genéricos)
    2. ACCIONABLES: Con recomendaciones concretas y prácticas
    3. PERSONALIZADOS: Referencias específicas a los números y patrones del usuario
    4. FUTUROS: Enfocados en qué hacer a partir de ahora

    Formato requerido para cada insight:
    {
      "type": "pattern|recommendation|improvement|trend",
      "title": "Título específico (máximo 6 palabras)",
      "description": "Análisis específico de 40-60 palabras que mencione datos concretos y ofrezca consejos específicos",
      "confidence": 0.7-0.95,
      "actionable": true,
      "actionText": "Acción específica (máximo 4 palabras)",
      "actionUrl": "/daily-summary"
    }

    EVITA:
    - Frases genéricas como "gran compromiso" o "sigue así"
    - Mencionar solo el registro de entradas
    - Consejos vagos como "haz actividades que te gusten"
    
    INCLUYE:
    - Números específicos de los datos
    - Patrones observados (días, tendencias, cambios)
    - Recomendaciones concretas basadas en los patrones

    Responde SOLO con el JSON array de insights, sin texto adicional.`;

    return prompt;
  }

  // Obtener distribución de estados de ánimo en formato legible
  getMoodDistribution(recentStats) {
    if (!recentStats?.moodDistribution) return 'Sin datos';
    
    const distribution = [];
    const moodLabels = {
      1: 'Muy triste', 2: 'Triste', 3: 'Regular', 
      4: 'Bien', 5: 'Muy bien', 6: 'Fantástico', 7: 'Increíble'
    };
    
    Object.keys(recentStats.moodDistribution).forEach(mood => {
      const count = recentStats.moodDistribution[mood];
      if (count > 0) {
        distribution.push(`${moodLabels[mood]} (${count})`);
      }
    });
    
    return distribution.length > 0 ? distribution.join(', ') : 'Variado';
  }

  // Obtener descripción de la mejora
  getImprovementDescription(improvementLevel) {
    switch (improvementLevel) {
      case 'significant_improvement': return 'Mejora significativa';
      case 'improvement': return 'Mejora notable';
      case 'stable': return 'Estable y consistente';
      case 'slight_decline': return 'Ligera disminución';
      case 'decline': return 'Disminución';
      default: return 'Sin datos suficientes';
    }
  }

  // Generar insights de fallback sin IA
  generateFallbackInsights(stats) {
    const insights = [];
    
    // Insight 1: Análisis de estado de ánimo promedio con recomendación específica
    const avgMood = stats.recentStats?.avgMood || 0;
    if (avgMood > 0) {
      let moodInsight;
      if (avgMood >= 5) {
        moodInsight = {
          type: 'trend',
          title: `Promedio alto: ${avgMood.toFixed(1)}/7`,
          description: `Tu promedio de ${avgMood.toFixed(1)}/7 muestra bienestar consistente. Para mantenerlo, identifica qué actividades específicas contribuyen a estos buenos días.`,
          confidence: 0.85,
          actionable: true,
          actionText: 'Identifica tus patrones positivos',
          actionUrl: '/daily-summary'
        };
      } else if (avgMood >= 3.5) {
        moodInsight = {
          type: 'recommendation',
          title: `Promedio moderado: ${avgMood.toFixed(1)}/7`,
          description: `Con ${avgMood.toFixed(1)}/7, tienes base sólida para mejorar. Enfócate en aumentar actividades que eleven tu estado de ánimo por encima de 4/7.`,
          confidence: 0.8,
          actionable: true,
          actionText: 'Planifica mejoras específicas',
          actionUrl: '/daily-summary'
        };
      } else {
        moodInsight = {
          type: 'pattern',
          title: `Promedio bajo: ${avgMood.toFixed(1)}/7`,
          description: `Tu promedio de ${avgMood.toFixed(1)}/7 indica necesidad de cambios. Considera rutinas matutinas, ejercicio ligero o actividades que disfrutabas antes.`,
          confidence: 0.8,
          actionable: true,
          actionText: 'Implementa rutinas positivas',
          actionUrl: '/daily-summary'
        };
      }
      insights.push(moodInsight);
    }

    // Insight 2: Análisis de tendencia temporal si hay comparación disponible
    if (stats.improvement && stats.previousStats?.count > 0) {
      const moodDiff = stats.improvement.moodDifference || 0;
      let trendInsight;
      
      if (Math.abs(moodDiff) >= 0.3) {
        if (moodDiff > 0) {
          trendInsight = {
            type: 'improvement',
            title: `Mejora de +${moodDiff.toFixed(1)} puntos`,
            description: `Has mejorado ${moodDiff.toFixed(1)} puntos vs período anterior. Analiza qué cambios específicos implementaste para replicarlos.`,
            confidence: 0.9,
            actionable: true,
            actionText: 'Replica estrategias exitosas',
            actionUrl: '/daily-summary'
          };
        } else {
          trendInsight = {
            type: 'recommendation',
            title: `Declive de ${moodDiff.toFixed(1)} puntos`,
            description: `Bajaste ${Math.abs(moodDiff).toFixed(1)} puntos. Revisa factores específicos: sueño, ejercicio, rutinas. Pequeños ajustes pueden revertir esta tendencia.`,
            confidence: 0.85,
            actionable: true,
            actionText: 'Ajusta rutinas clave',
            actionUrl: '/daily-summary'
          };
        }
        insights.push(trendInsight);
      }
    }

    // Si no hay suficientes datos para el segundo insight, agregar uno básico
    if (insights.length === 1) {
      insights.push({
        type: 'pattern',
        title: `${stats.totalEntries} entradas registradas`,
        description: `Con ${stats.totalEntries} entradas, tienes datos suficientes para identificar patrones. Registra 3-5 entradas más para obtener análisis más específicos.`,
        confidence: 0.75,
        actionable: true,
        actionText: 'Mantén consistencia',
        actionUrl: '/daily-summary'
      });
    }

    return insights.slice(0, 2); // Limitar a exactamente 2
  }

  // Guardar insights en la base de datos
  async saveInsights(userId, insights) {
    try {
      const savedInsights = [];
      const now = new Date();

      for (const insight of insights) {
        const savedInsight = await prisma.userInsight.create({
          data: {
            userId: userId,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            confidence: insight.confidence,
            actionable: insight.actionable || false,
            actionText: insight.actionText || null,
            actionUrl: insight.actionUrl || null,
            insightsData: insight.insightsData || {},
            lastGenerated: now,
            nextGenerationDate: null, // Ya no usamos fechas fijas
            isActive: true
          }
        });
        savedInsights.push(savedInsight);
      }

      return savedInsights;

    } catch (error) {
      console.error('Error guardando insights:', error);
      throw error;
    }
  }

  // Obtener usuarios elegibles para insights (ya no necesario para el flujo automático)
  async getEligibleUsers() {
    try {
      // Solo para casos especiales o debugging
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      return users.map(user => user.id);

    } catch (error) {
      console.error('Error obteniendo usuarios elegibles:', error);
      return [];
    }
  }
}

export default new InsightService();
