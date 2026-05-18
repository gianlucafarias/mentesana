import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      birthDate,
      locality,
      province,
      role,
      doesSport,
      sportFrequency,
      therapyHistory,
      hasSiblings,
      siblingsCount,
      livesWith,
      hobbies,
      screenTimeHours,
      sleepHours,
      extracurricularActivities,
      researchConsent
    } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Preparar datos para crear usuario
    const userData = {
      email,
      password: hashedPassword,
      name
    };

    // Agregar campos opcionales si están presentes
    if (birthDate) userData.birthDate = new Date(birthDate);
    if (locality) userData.locality = locality;
    if (province) userData.province = province;
    if (typeof doesSport === 'boolean') userData.doesSport = doesSport;
    if (sportFrequency) userData.sportFrequency = sportFrequency;
    if (therapyHistory) userData.therapyHistory = therapyHistory;
    if (typeof hasSiblings === 'boolean') userData.hasSiblings = hasSiblings;
    if (Number.isInteger(siblingsCount)) userData.siblingsCount = siblingsCount;
    if (livesWith) userData.livesWith = livesWith;
    if (Array.isArray(hobbies)) userData.hobbies = hobbies;
    if (Number.isInteger(screenTimeHours)) userData.screenTimeHours = screenTimeHours;
    if (Number.isInteger(sleepHours)) userData.sleepHours = sleepHours;
    if (extracurricularActivities) userData.extracurricularActivities = extracurricularActivities;
    if (typeof researchConsent === 'boolean') userData.researchConsent = researchConsent;
    if (role && ['USER', 'EDITOR', 'ADMIN'].includes(role)) {
      userData.role = role;
    }

    // Crear usuario
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        locality: true,
        province: true,
        doesSport: true,
        sportFrequency: true,
        therapyHistory: true,
        hasSiblings: true,
        siblingsCount: true,
        livesWith: true,
        hobbies: true,
        screenTimeHours: true,
        sleepHours: true,
        extracurricularActivities: true,
        researchConsent: true,
        role: true,
        createdAt: true
      }
    });

    // Generar token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

    res.status(201).json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        birthDate: true,
        locality: true,
        province: true,
        doesSport: true,
        sportFrequency: true,
        therapyHistory: true,
        hasSiblings: true,
        siblingsCount: true,
        livesWith: true,
        hobbies: true,
        screenTimeHours: true,
        sleepHours: true,
        extracurricularActivities: true,
        researchConsent: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Cuenta desactivada. Contacta al administrador' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Actualizar lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generar token con información del rol
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

    // Remover password de la respuesta e incluir lastLogin actualizado
    const { password: _, ...userWithoutPassword } = {
      ...user,
      lastLogin: new Date()
    };

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        locality: true,
        province: true,
        doesSport: true,
        sportFrequency: true,
        therapyHistory: true,
        hasSiblings: true,
        siblingsCount: true,
        livesWith: true,
        hobbies: true,
        screenTimeHours: true,
        sleepHours: true,
        extracurricularActivities: true,
        researchConsent: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      birthDate,
      locality,
      province,
      doesSport,
      sportFrequency,
      therapyHistory,
      hasSiblings,
      siblingsCount,
      livesWith,
      hobbies,
      screenTimeHours,
      sleepHours,
      extracurricularActivities,
      researchConsent
    } = req.body;
    
    // Preparar datos para actualizar
    const updateData = {};
    if (name) updateData.name = name;
    if (birthDate) updateData.birthDate = new Date(birthDate);
    if (locality) updateData.locality = locality;
    if (province) updateData.province = province;
    if (typeof doesSport === 'boolean') updateData.doesSport = doesSport;
    if (sportFrequency) updateData.sportFrequency = sportFrequency;
    if (therapyHistory) updateData.therapyHistory = therapyHistory;
    if (typeof hasSiblings === 'boolean') updateData.hasSiblings = hasSiblings;
    if (Number.isInteger(siblingsCount)) updateData.siblingsCount = siblingsCount;
    if (livesWith) updateData.livesWith = livesWith;
    if (Array.isArray(hobbies)) updateData.hobbies = hobbies;
    if (Number.isInteger(screenTimeHours)) updateData.screenTimeHours = screenTimeHours;
    if (Number.isInteger(sleepHours)) updateData.sleepHours = sleepHours;
    if (extracurricularActivities) updateData.extracurricularActivities = extracurricularActivities;
    if (typeof researchConsent === 'boolean') updateData.researchConsent = researchConsent;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        locality: true,
        province: true,
        doesSport: true,
        sportFrequency: true,
        therapyHistory: true,
        hasSiblings: true,
        siblingsCount: true,
        livesWith: true,
        hobbies: true,
        screenTimeHours: true,
        sleepHours: true,
        extracurricularActivities: true,
        researchConsent: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ message: 'Perfil actualizado correctamente', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar perfil' });
  }
}; 
