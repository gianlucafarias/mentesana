import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../index.js';

export const register = async (req, res) => {
  try {
    const { email, password, name, birthDate, locality, province, role } = req.body;

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
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Generar token con información del rol
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

    // Remover password de la respuesta
    const { password: _, ...userWithoutPassword } = user;

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
        role: true,
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
    const { name, birthDate, locality, province } = req.body;
    
    // Preparar datos para actualizar
    const updateData = {};
    if (name) updateData.name = name;
    if (birthDate) updateData.birthDate = new Date(birthDate);
    if (locality) updateData.locality = locality;
    if (province) updateData.province = province;

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
        role: true,
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