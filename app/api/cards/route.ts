import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TipoCard, TipoAtendimento, Prisma } from "@prisma/client";

// GET /api/cards — lista cards, com filtro opcional por intervalo de datas.
// Rota pública para leitura (usada também pelo painel /tv).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");

  const where: Prisma.CardWhereInput = {};
  if (inicio || fim) {
    const filtroData: Prisma.DateTimeFilter = {};
    if (inicio) filtroData.gte = new Date(inicio + "T00:00:00.000Z");
    if (fim) filtroData.lte = new Date(fim + "T23:59:59.999Z");
    where.data = filtroData;
  }

  const cards = await prisma.card.findMany({
    where,
    orderBy: [{ data: "asc" }, { horario: "asc" }],
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json(cards);
}

// POST /api/cards — cria um novo card (somente ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem criar cards" },
      { status: 403 }
    );
  }

  const body = await req.json();

  // Validação server-side dos campos obrigatórios
  const obrigatorios = ["data", "horario", "cliente", "equipamento", "local"];
  for (const campo of obrigatorios) {
    if (!body[campo] || String(body[campo]).trim() === "") {
      return NextResponse.json(
        { error: `O campo "${campo}" é obrigatório` },
        { status: 400 }
      );
    }
  }

  const card = await prisma.card.create({
    data: {
      tipo: (body.tipo as TipoCard) || TipoCard.ENTREGA,
      tipoAtendimento:
        (body.tipoAtendimento as TipoAtendimento) || TipoAtendimento.EVENTO,
      createdById: session.user.id,
      docOk: false,
      entregaOk: false,
      data: new Date(body.data + "T00:00:00.000Z"),
      horario: body.horario,
      cliente: body.cliente,
      equipamento: body.equipamento,
      tensao: body.tensao || null,
      veiculo: body.veiculo || null,
      periodo: body.periodo || null,
      franquia: body.franquia || null,
      local: body.local,
      combustivel: body.combustivel || null,
      instalacao: body.instalacao || null,
      acessorios: body.acessorios || null,
      obs: body.obs || null,
      motorista: body.motorista || null,
      ajudante: body.ajudante || null,
    },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json(card, { status: 201 });
}
