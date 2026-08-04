const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreate() {
  try {
    console.log('Testando criação de card com categoria INSTALACAO...');
    const card = await prisma.card.create({
      data: {
        tipo: 'INSTALACAO',
        data: new Date('2026-08-05T00:00:00.000Z'),
        horario: 'TESTE',
        cliente: 'CLIENTE TESTE',
        equipamento: 'EQUIP-TESTE',
        local: 'LOCAL TESTE',
      }
    });
    console.log('✅ Card criado com sucesso:', card.id, card.tipo);
    
    // Deletar o card de teste
    await prisma.card.delete({ where: { id: card.id } });
    console.log('✅ Card de teste removido');
    
  } catch (error) {
    console.error('❌ Erro ao criar card:', error.message);
    console.error('Detalhes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreate();
