import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users = [
  { email: "comercial@controlelogistico.com", name: "comercial", password: "999716444" },
  { email: "logistica@controlelogistico.com", name: "logistica", password: "999455275" },
  { email: "manutencao@controlelogistico.com", name: "manutencao", password: "999543845" },
  { email: "direcao@controlelogistico.com", name: "direcao", password: "999246444" },
  { email: "auxcomercial@controlelogistico.com", name: "auxcomercial", password: "998251144" },
];

async function main() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, password: hash, role: "ADMIN" },
    });
    console.log("Criado/atualizado:", u.email);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
