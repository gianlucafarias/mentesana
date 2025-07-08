import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'editor@mentesana.com',
      password: '12345678',
      name: 'Editor Mente Sana',
      birthDate: new Date('1990-01-01'),
      locality: 'CABA',
      province: 'Buenos Aires',
      role: 'EDITOR',
    },
  });

  console.log('Usuario creado:', user);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
