import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const POR_PAGINA = 100;
const MS_DIA = 86400000;

// GET /api/atividades?inicio=&fim=&usuario=&entidade=&pagina= — registro de ações (somente ADMIN).
// O período usa o horário de Brasília (UTC-3) para o dia bater com o que o usuário vê.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");
  const usuario = searchParams.get("usuario");
  const entidade = searchParams.get("entidade");
  const pagina = Math.max(1, Number(searchParams.get("pagina")) || 1);

  const where: Prisma.AtividadeWhereInput = {};
  const periodo: Prisma.DateTimeFilter = {};
  if (inicio && ISO.test(inicio)) periodo.gte = new Date(inicio + "T03:00:00.000Z");
  if (fim && ISO.test(fim)) periodo.lt = new Date(new Date(fim + "T03:00:00.000Z").getTime() + MS_DIA);
  if (periodo.gte || periodo.lt) where.createdAt = periodo;
  if (usuario) where.usuario = usuario;
  if (entidade) where.entidade = entidade;

  const [total, itens, usuarios] = await Promise.all([
    prisma.atividade.count({ where }),
    prisma.atividade.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.atividade.findMany({ distinct: ["usuario"], select: { usuario: true }, orderBy: { usuario: "asc" } }),
  ]);

  return NextResponse.json({
    total,
    porPagina: POR_PAGINA,
    itens,
    usuarios: usuarios.map((u) => u.usuario),
  });
}
