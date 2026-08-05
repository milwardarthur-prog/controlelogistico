import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/manutencao — lista todas as manutenções de veículos.
export async function GET() {
  const manutencoes = await prisma.manutencaoVeiculo.findMany({
    orderBy: [{ inicio: "asc" }],
  });
  return NextResponse.json(manutencoes);
}

// POST /api/manutencao — cria uma nova manutenção (somente ADMIN).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem cadastrar manutenções" },
      { status: 403 }
    );
  }

  const body = await req.json();
  if (!body.veiculo || !body.inicio || !body.fim) {
    return NextResponse.json(
      { error: "Os campos veículo, início e fim são obrigatórios" },
      { status: 400 }
    );
  }

  const manutencao = await prisma.manutencaoVeiculo.create({
    data: {
      veiculo: body.veiculo,
      inicio: new Date(body.inicio + "T00:00:00.000Z"),
      fim: new Date(body.fim + "T23:59:59.999Z"),
      obs: body.obs || null,
    },
  });

  return NextResponse.json(manutencao, { status: 201 });
}
