#!/usr/bin/env node

/**
 * Script para generar insights personalizados en batch
 * Se puede ejecutar manualmente o como cron job
 * 
 * Uso:
 * - Manual: node scripts/generate-insights.js
 * - Cron: 0 2 * * * cd /path/to/server && node scripts/generate-insights.js
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class InsightGenerator {
  constructor() {
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  async run() {
    console.log('🚀 Iniciando generación batch de insights...');
    console.log(`⏰ ${new Date().toLocaleString('es-ES')}`);
    
    try {
      // Obtener usuarios elegibles
      const eligibleUsers = await this.getEligibleUsers();
      
      if (eligibleUsers.length === 0) {
        console.log('✅ No hay usuarios elegibles para insights');
        return;
      }

      console.log(`📊 Usuarios elegibles encontrados: ${eligibleUsers.length}`);
      
      // Procesar usuarios en lotes
      const batchSize = 3; // Reducir batch size para evitar rate limiting
      let currentBatch = 1;
      const totalBatches = Math.ceil(eligibleUsers.length / batchSize);
      
      for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = eligibleUsers.slice(i, i + batchSize);
        console.log(`\n🔄 Procesando lote ${currentBatch}/${totalBatches} (${batch.length} usuarios)`);
        
        const batchPromises = batch.map(userId => this.processUser(userId));
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Actualizar estadísticas
        batchResults.forEach(result => {
          this.stats.totalProcessed++;
          if (result.status === 'fulfilled') {
            this.stats.successful++;
          } else {
            this.stats.failed++;
            this.stats.errors.push({
              userId: result.reason.userId || 'unknown',
              error: result.reason.message || 'Error desconocido'
            });
          }
        });
        
        currentBatch++;
        
        // Pausa entre lotes para evitar rate limiting
        if (i + batchSize < eligibleUsers.length) {
          console.log('⏳ Pausa de 3 segundos entre lotes...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Mostrar resumen final
      this.showSummary();
      
    } catch (error) {
      console.error('❌ Error crítico en generación batch:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  async getEligibleUsers() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const eligibleUsers = await prisma.$queryRaw`
        SELECT DISTINCT u.id, u.name, u.email
        FROM "User" u
        INNER JOIN "DailyEntry" de ON u.id = de."userId"
        WHERE de.date >= ${thirtyDaysAgo}
        AND u."isActive" = true
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(de.id) >= 7
        AND NOT EXISTS (
          SELECT 1 FROM "UserInsight" ui 
          WHERE ui."userId" = u.id 
          AND ui."isActive" = true 
          AND ui."lastGenerated" >= ${sevenDaysAgo}
        )
        ORDER BY u."createdAt" ASC
      `;

      return eligibleUsers;
    } catch (error) {
      console.error('Error obteniendo usuarios elegibles:', error);
      throw error;
    }
  }

  async processUser(userData) {
    const { id: userId, name, email } = userData;
    
    try {
      console.log(`  👤 Procesando: ${name} (${email})`);
      
      // Obtener estadísticas del usuario
      const stats = await this.getUserStats(userId);
      
      // Marcar insights existentes como obsoletos
      await this.markInsightsAsObsolete(userId);
      
      // Generar insights usando OpenAI
      const insights = await this.generateInsightsWithAI(stats, userId);
      
      // Guardar insights
      const savedInsights = await this.saveInsights(userId, insights);
      
      console.log(`  ✅ ${name}: ${savedInsights.length} insights generados`);
      return { userId, success: true, insights: savedInsights };
      
    } catch (error) {
      console.error(`  ❌ ${name}: Error - ${error.message}`);
      throw { userId, message: error.message };
    }
  }

  async getUserStats(userId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const entries = await prisma.dailyEntry.findMany({
        where: {
          userId: userId,
          date: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: {
          date: 'asc'
        },
        select: {
          mood: true,
          notes: true,
          date: true
        }
      });

      const totalEntries = entries.length;
      const averageMood = totalEntries > 0 
        ? entries.reduce((sum, entry) => sum + entry.mood, 0) / totalEntries 
        : 0;

      // Agrupar por día de la semana
      const dayOfWeekStats = {};
      entries.forEach(entry => {
        const day = entry.date.getDay();
        if (!dayOfWeekStats[day]) {
          dayOfWeekStats[day] = { count: 0, totalMood: 0, entries: [] };
        }
        dayOfWeekStats[day].count++;
        dayOfWeekStats[day].totalMood += entry.mood;
        dayOfWeekStats[day].entries.push(entry);
      });

      Object.keys(dayOfWeekStats).forEach(day => {
        dayOfWeekStats[day].averageMood = dayOfWeekStats[day].totalMood / dayOfWeekStats[day].count;
      });

      const moodTrend = this.calculateMoodTrend(entries);
      const entriesWithNotes = entries.filter(entry => entry.notes && entry.notes.trim().length > 0).length;

      return {
        totalEntries,
        averageMood: Math.round(averageMood * 100) / 100,
        dayOfWeekStats,
        moodTrend,
        entriesWithNotes,
        notesPercentage: totalEntries > 0 ? (entriesWithNotes / totalEntries) * 100 : 0
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas del usuario:', error);
      throw error;
    }
  }

  calculateMoodTrend(entries) {
    if (entries.length < 2) return 'insufficient_data';

    const recentEntries = entries.slice(-7);
    const firstHalf = recentEntries.slice(0, Math.ceil(recentEntries.length / 2));
    const secondHalf = recentEntries.slice(Math.ceil(recentEntries.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, entry) => sum + entry.mood, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, entry) => sum + entry.mood, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;

    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
  }

  async markInsightsAsObsolete(userId) {
    try {
      await prisma.userInsight.updateMany({
        where: {
          userId: userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });
    } catch (error) {
      console.error('Error marcando insights como obsoletos:', error);
    }
  }

  async generateInsightsWithAI(stats, userId) {
    try {
      const prompt = this.buildInsightPrompt(stats);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un experto psicólogo y analista de datos especializado en bienestar mental. 
            Tu tarea es analizar los datos de estado de ánimo de un usuario y generar insights personalizados útiles.
            
            IMPORTANTE: Responde SOLO con un JSON válido que contenga un array de insights.
            Cada insight debe tener esta estructura exacta:
            {
              "insights": [
                {
                  "type": "pattern|recommendation|trend|correlation",
                  "title": "Título del insight",
                  "description": "Descripción detallada del insight",
                  "confidence": 0.85,
                  "actionable": true,
                  "actionText": "Texto de la acción recomendada",
                  "actionUrl": "/daily-summary"
                }
              ]
            }
            
            Reglas:
            - Máximo 5 insights
            - Confianza entre 0.6 y 0.95
            - Sé específico y personalizado
            - Incluye al menos 2 insights accionables
            - Usa lenguaje empático y motivacional
            - Basa todo en los datos proporcionados`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      const parsedResponse = JSON.parse(response);
      
      return parsedResponse.insights || [];

    } catch (error) {
      console.error('Error generando insights con OpenAI:', error);
      return this.generateFallbackInsights(stats);
    }
  }

  buildInsightPrompt(stats) {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    let prompt = `Analiza estos datos de estado de ánimo de los últimos 30 días:
    
    - Total de entradas: ${stats.totalEntries}
    - Promedio de estado de ánimo: ${stats.averageMood}/7
    - Tendencia: ${this.getTrendDescription(stats.moodTrend)}
    - Entradas con notas: ${stats.entriesWithNotes} (${stats.notesPercentage.toFixed(1)}%)
    
    Análisis por día de la semana:`;

    Object.keys(stats.dayOfWeekStats).forEach(day => {
      const dayStat = stats.dayOfWeekStats[day];
      const dayName = dayNames[day];
      prompt += `\n- ${dayName}: Promedio ${dayStat.averageMood.toFixed(1)}/7 (${dayStat.count} entradas)`;
    });

    prompt += `

    Genera insights personalizados que ayuden al usuario a:
    1. Entender patrones en su estado de ánimo
    2. Identificar días difíciles y estrategias para manejarlos
    3. Reconocer tendencias y progreso
    4. Tomar acciones específicas para mejorar su bienestar
    
    Sé específico, empático y accionable.`;

    return prompt;
  }

  getTrendDescription(trend) {
    switch (trend) {
      case 'improving': return 'Mejorando gradualmente';
      case 'declining': return 'Disminuyendo gradualmente';
      case 'stable': return 'Estable';
      default: return 'Datos insuficientes';
    }
  }

  generateFallbackInsights(stats) {
    const insights = [];
    
    if (stats.moodTrend !== 'insufficient_data') {
      insights.push({
        type: 'trend',
        title: 'Tendencia de tu estado de ánimo',
        description: `Tu estado de ánimo está ${this.getTrendDescription(stats.moodTrend).toLowerCase()}. ${stats.moodTrend === 'improving' ? '¡Excelente progreso! Mantén las actividades que te están ayudando.' : stats.moodTrend === 'declining' ? 'Es normal tener altibajos. Considera revisar qué ha cambiado recientemente.' : 'Mantener estabilidad es un logro importante.'}`,
        confidence: 0.8,
        actionable: true,
        actionText: 'Revisa tu historial para identificar patrones',
        actionUrl: '/daily-summary'
      });
    }

    const worstDay = Object.keys(stats.dayOfWeekStats).reduce((worst, day) => {
      const current = stats.dayOfWeekStats[day];
      const worstCurrent = stats.dayOfWeekStats[worst];
      return current.averageMood < worstCurrent.averageMood ? day : worst;
    });
    
    if (worstDay && stats.dayOfWeekStats[worstDay].count >= 2) {
      const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][worstDay];
      insights.push({
        type: 'pattern',
        title: `Día más desafiante: ${dayName}`,
        description: `Los ${dayName}s tienden a ser más difíciles para ti, con un promedio de ${stats.dayOfWeekStats[worstDay].averageMood.toFixed(1)}/7. Considera planificar actividades que te motiven para estos días.`,
        confidence: 0.75,
        actionable: true,
        actionText: 'Planifica actividades motivadoras para este día',
        actionUrl: '/daily-summary'
      });
    }

    if (stats.notesPercentage > 50) {
      insights.push({
        type: 'pattern',
        title: 'Excelente reflexión personal',
        description: `Escribes notas en el ${stats.notesPercentage.toFixed(1)}% de tus entradas. Esta práctica de reflexión es muy valiosa para tu bienestar mental.`,
        confidence: 0.9,
        actionable: false
      });
    }

    return insights;
  }

  async saveInsights(userId, insights) {
    try {
      const savedInsights = [];
      const nextGenerationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      for (const insight of insights) {
        const savedInsight = await prisma.userInsight.create({
          data: {
            userId: userId,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            confidence: insight.confidence,
            actionable: insight.actionable || false,
            actionText: insight.actionText,
            actionUrl: insight.actionUrl,
            insightsData: insight.insightsData || {},
            nextGenerationDate: nextGenerationDate
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

  showSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE GENERACIÓN BATCH DE INSIGHTS');
    console.log('='.repeat(60));
    console.log(`⏰ Completado: ${new Date().toLocaleString('es-ES')}`);
    console.log(`👥 Total procesados: ${this.stats.totalProcessed}`);
    console.log(`✅ Exitosos: ${this.stats.successful}`);
    console.log(`❌ Fallidos: ${this.stats.failed}`);
    console.log(`📈 Tasa de éxito: ${((this.stats.successful / this.stats.totalProcessed) * 100).toFixed(1)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n🚨 Errores encontrados:');
      this.stats.errors.forEach(error => {
        console.log(`  - Usuario ${error.userId}: ${error.error}`);
      });
    }
    
    console.log('='.repeat(60));
  }
}

// Ejecutar el generador
const generator = new InsightGenerator();
generator.run().catch(console.error);

