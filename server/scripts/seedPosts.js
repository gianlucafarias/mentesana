import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const mentalHealthPosts = [
  {
    title: "5 Técnicas de Respiración para Reducir la Ansiedad",
    content: `La respiración consciente es una herramienta poderosa para manejar la ansiedad. Aquí te compartimos 5 técnicas efectivas:

1. **Respiración 4-7-8**: Inhala por 4 segundos, mantén por 7, exhala por 8. Esta técnica activa el sistema nervioso parasimpático.

2. **Respiración Diafragmática**: Coloca una mano en el pecho y otra en el abdomen. Respira de manera que solo se mueva la mano del abdomen.

3. **Respiración en Caja**: Inhala 4 segundos, mantén 4, exhala 4, mantén 4. Repite el ciclo.

4. **Respiración Alternada**: Usa el pulgar para tapar una fosa nasal, inhala por la otra, cambia y exhala por la opuesta.

5. **Respiración con Conteo**: Cuenta lentamente hasta 10 mientras respiras profundamente.

Estas técnicas están respaldadas por investigación científica y pueden practicarse en cualquier momento del día.`,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "Técnicas de Manejo",
    published: true
  },
  {
    title: "La Importancia del Sueño en la Salud Mental",
    content: `El sueño y la salud mental están íntimamente conectados. La falta de sueño no solo afecta nuestro estado de ánimo, sino que puede contribuir al desarrollo de trastornos mentales.

**¿Cómo afecta el sueño a la salud mental?**

- Regula las emociones y el estado de ánimo
- Mejora la capacidad de concentración
- Fortalece la memoria y el aprendizaje
- Reduce los niveles de estrés y cortisol

**Consejos para mejorar la higiene del sueño:**

• Mantén horarios regulares de sueño
• Evita pantallas 1 hora antes de dormir
• Crea un ambiente oscuro y fresco
• Evita cafeína después de las 2 PM
• Practica técnicas de relajación

La Organización Mundial de la Salud recomienda entre 7-9 horas de sueño para adultos. Si tienes problemas persistentes de sueño, consulta con un profesional de la salud.`,
    image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=600&fit=crop",
    category: "Bienestar",
    published: true
  },
  {
    title: "Mindfulness: Una Herramienta Científicamente Probada",
    content: `El mindfulness o atención plena es más que una tendencia: es una práctica respaldada por décadas de investigación científica.

**¿Qué es el mindfulness?**
Es la capacidad de prestar atención al momento presente de manera intencional y sin juicio.

**Beneficios científicamente comprobados:**

- Reduce síntomas de ansiedad y depresión
- Mejora la regulación emocional
- Aumenta la concentración y memoria
- Fortalece el sistema inmunológico
- Reduce la presión arterial

**Ejercicio básico de mindfulness:**

1. Siéntate cómodamente con la espalda recta
2. Cierra los ojos suavemente
3. Enfócate en tu respiración natural
4. Cuando tu mente divague, vuelve gentilmente a la respiración
5. Practica por 5-10 minutos inicialmente

Estudios muestran que incluso 10 minutos diarios pueden generar cambios positivos en el cerebro en solo 8 semanas.`,
    image: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "Mindfulness",
    published: true
  },
  {
    title: "Señales de Advertencia: Cuándo Buscar Ayuda Profesional",
    content: `Reconocer cuándo necesitamos ayuda profesional es un acto de valentía y autocuidado. Aquí te compartimos las señales más importantes:

**Señales emocionales:**
- Tristeza persistente por más de 2 semanas
- Pérdida de interés en actividades que antes disfrutabas
- Sentimientos de desesperanza o vacío
- Ansiedad excesiva que interfiere con tu vida diaria
- Cambios extremos de humor

**Señales físicas:**
- Cambios significativos en el apetito o peso
- Problemas de sueño (insomnio o dormir demasiado)
- Fatiga constante
- Dolores de cabeza frecuentes
- Problemas digestivos sin causa médica

**Señales conductuales:**
- Aislamiento social
- Descuido de responsabilidades
- Uso excesivo de alcohol o sustancias
- Comportamientos de riesgo

**¿Dónde buscar ayuda?**
- Psicólogos clínicos
- Psiquiatras
- Líneas de crisis: 911 en emergencias
- Centros de salud mental comunitarios

Recuerda: buscar ayuda es un signo de fortaleza, no de debilidad.`,
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
    category: "Recursos",
    published: true
  },
  {
    title: "El Ejercicio como Antidepresivo Natural",
    content: `La actividad física regular es uno de los tratamientos más efectivos para la depresión y ansiedad, con beneficios comparables a algunos medicamentos.

**¿Cómo funciona el ejercicio en el cerebro?**

El ejercicio estimula la producción de:
- **Endorfinas**: "hormonas de la felicidad"
- **Serotonina**: regula el estado de ánimo
- **Dopamina**: asociada con placer y motivación
- **BDNF**: factor de crecimiento neuronal

**Tipos de ejercicio más beneficiosos:**

• **Aeróbico**: caminar, correr, nadar, ciclismo
• **Anaeróbico**: levantamiento de pesas, yoga
• **Actividades grupales**: deportes de equipo, clases de baile

**Recomendaciones basadas en evidencia:**
- Mínimo 150 minutos de actividad moderada por semana
- O 75 minutos de actividad intensa
- Incluir ejercicios de fuerza 2 veces por semana

**Consejos para comenzar:**
1. Empieza con 10-15 minutos diarios
2. Elige actividades que disfrutes
3. Busca un compañero de ejercicio
4. Establece metas realistas
5. Celebra los pequeños logros

El ejercicio no reemplaza el tratamiento profesional, pero es un complemento poderoso.`,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "Bienestar",
    published: true
  },
  {
    title: "Construyendo Relaciones Saludables para el Bienestar Mental",
    content: `Las relaciones interpersonales de calidad son fundamentales para nuestra salud mental y bienestar general.

**El impacto de las relaciones en la salud mental:**

Las conexiones sociales saludables:
- Reducen el riesgo de depresión en un 30%
- Fortalecen el sistema inmunológico
- Aumentan la longevidad
- Mejoran la autoestima y confianza
- Proporcionan apoyo durante crisis

**Características de relaciones saludables:**

• **Comunicación abierta**: expresar pensamientos y sentimientos honestamente
• **Respeto mutuo**: valorar las diferencias y límites
• **Apoyo emocional**: estar presente en buenos y malos momentos
• **Confianza**: mantener la confidencialidad y cumplir compromisos
• **Reciprocidad**: equilibrio en dar y recibir

**Señales de relaciones tóxicas:**
- Control excesivo o manipulación
- Críticas constantes o humillación
- Aislamiento de otros amigos/familia
- Violencia física o emocional
- Falta de respeto a los límites

**Cómo cultivar relaciones saludables:**
1. Practica la escucha activa
2. Expresa gratitud regularmente
3. Establece límites claros
4. Busca ayuda para resolver conflictos
5. Dedica tiempo de calidad

Recuerda: es mejor tener pocas relaciones genuinas que muchas superficiales.`,
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop",
    category: "Relaciones",
    published: true
  }
];

async function createDefaultAuthor() {
  try {
    console.log('👤 Verificando usuario...');
    
    const existingAuthor = await prisma.user.findFirst({
      where: { email: 'admin@saludmental.com' }
    });

    if (existingAuthor) {
      console.log('✅ Usuario encontrado:', existingAuthor.name);
      return existingAuthor;
    }

    console.log('👤 Creando usuario administrador...');

    const hashedPassword = await bcrypt.hash('12345678', 10);

    const newUser = await prisma.user.create({
      data: {
        email: 'admin@saludmental.com',
        name: 'Equipo Salud Mental',
        password: hashedPassword,
        role: 'EDITOR',
        birthDate: new Date('1990-01-01'),
        locality: 'CABA',
        province: 'Buenos Aires'
      }
    });

    console.log('✅ Usuario creado:', newUser.name);
    return newUser;
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    console.log('\n💡 Verifica tu modelo User en schema.prisma');
    throw error;
  }
}

async function seedPosts() {
  try {
    console.log('🌱 Iniciando seed de posts...');
    console.log('📊 Conectando a la base de datos...');

    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');

    const author = await createDefaultAuthor();

    if (process.argv.includes('--reset')) {
      console.log('🗑️  Eliminando posts existentes...');
      await prisma.post.deleteMany({});
      console.log('✅ Posts eliminados');
    }

    const existingPostsCount = await prisma.post.count();
    console.log(`📊 Posts existentes en BD: ${existingPostsCount}`);

    let createdCount = 0;
    console.log('\n📝 Creando posts...');
    
 for (const postData of mentalHealthPosts) {
  const existingPost = await prisma.post.findFirst({
    where: { title: postData.title }
  });

  if (!existingPost) {
    try {
      const newPost = await prisma.post.create({
        data: {
          ...postData,
          authorId: author.id
        }
      });
      createdCount++;
      console.log(`✅ "${postData.title}"`);
    } catch (error) {
      console.error(`❌ Error al crear post "${postData.title}":`, error);
    }
  } else {
    console.log(`⏭️  Ya existe: "${postData.title}"`);
  }
}

    const finalCount = await prisma.post.count();
    console.log(`\n🎉 Seed completado!`);
    console.log(`📊 Posts creados: ${createdCount}`);
    console.log(`📊 Total posts en BD: ${finalCount}`);
    
    if (createdCount === 0 && finalCount === 0) {
      console.log('\n⚠️  No se crearon posts. Posibles causas:');
      console.log('   1. Error en el modelo Post o User');
      console.log('   2. Campos requeridos faltantes');
      console.log('   3. Restricciones de base de datos');
    }
    
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    
    if (error.code === 'P2002') {
      console.log('💡 Error: Violación de restricción única');
    } else if (error.code === 'P2003') {
      console.log('💡 Error: Violación de clave foránea');
    } else if (error.code === 'P1001') {
      console.log('💡 Error: No se puede conectar a la base de datos');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

seedPosts().catch(console.error);


export default seedPosts;