import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Cria (ou atualiza) o usuário administrador padrão
  const senhaHash = await bcrypt.hash("Admin@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@controlelogistico.com" },
    update: {},
    create: {
      email: "admin@controlelogistico.com",
      password: senhaHash,
      name: "Administrador",
      role: Role.ADMIN,
    },
  });

  console.log("Usuário admin criado/garantido:", admin.email);

  // Cria um usuário técnico de exemplo
  const senhaTecnico = await bcrypt.hash("Tecnico@123", 10);
  const tecnico = await prisma.user.upsert({
    where: { email: "tecnico@controlelogistico.com" },
    update: {},
    create: {
      email: "tecnico@controlelogistico.com",
      password: senhaTecnico,
      name: "Técnico",
      role: Role.TECNICO,
    },
  });
  console.log("Usuário técnico criado/garantido:", tecnico.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
