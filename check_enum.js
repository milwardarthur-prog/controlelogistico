const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnum() {
  try {
    // Verificar o enum TipoCard diretamente no banco
    const result = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'TipoCard'
      );
    `;
    console.log('Valores do enum TipoCard no banco de dados:');
    console.log(result);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnum();
