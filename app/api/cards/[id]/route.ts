import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TipoCard, TipoAtendimento, SinaleiroStatus, Prisma } from "@prisma/client";

const incluirCriador = { createdBy: { select: { name: true } } };

// Valores válidos do enum de sinaleiro
const SINALEIRO_VALIDOS: SinaleiroStatus[] = [
  "NAO_VISUALIZADO",
  "OK",
  "NAO_OK",
];

function isSinaleiro(v: unknown): v is SinaleiroStatus {
  return typeof v === "string" && SINALEIRO_VALIDOS.includes(v as SinaleiroStatus);
}

// GET /api/cards/[id] — retorna um card específico
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const card = await prisma.card.findUnique({
    where: { id: params.id },
    include: incluirCriador,
  });
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }
  return NextResponse.json(card);
}

// PUT /api/cards/[id] — edição completa do card.
// Disponível para qualquer usuário autenticado (ADMIN e TÉCNICO).
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const existente = await prisma.card.findUnique({ where: { id: params.id } });
  if (!existente) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }

  const data: Prisma.CardUpdateInput = {
    tipo: (body.tipo as TipoCard) || existente.tipo,
    tipoAtendimento:
      (body.tipoAtendimento as TipoAtendimento) || existente.tipoAtendimento,
    data: body.data ? new Date(body.data + "T00:00:00.000Z") : existente.data,
    horario: body.horario ?? existente.horario,
    cliente: body.cliente ?? existente.cliente,
    equipamento: body.equipamento ?? existente.equipamento,
    tensao: body.tensao || null,
    veiculo: body.veiculo || null,
    periodo: body.periodo || null,
    franquia: body.franquia || null,
    local: body.local ?? existente.local,
    combustivel: body.combustivel || null,
    instalacao: body.instalacao || null,
    acessorios: body.acessorios || null,
    obs: body.obs || null,
    motorista: body.motorista || null,
    ajudante: body.ajudante || null,
    numeroContrato: body.numeroContrato || null,
    numeroOrcamento: body.numeroOrcamento || null,
  };

  const card = await prisma.card.update({
    where: { id: params.id },
    data,
    include: incluirCriador,
  });

  return NextResponse.json(card);
}

// PATCH /api/cards/[id] — atualização parcial.
// Aceita: sinaleiros (SinaleiroStatus), data (drag-and-drop), cancelado,
// motorista e ajudante. Disponível para qualquer usuário autenticado.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const existente = await prisma.card.findUnique({ where: { id: params.id } });
  if (!existente) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Prisma.CardUpdateInput = {};

  // Sinaleiros de 3 estados
  if (isSinaleiro(body.comercialOk)) data.comercialOk = body.comercialOk;
  if (isSinaleiro(body.logisticaOk)) data.logisticaOk = body.logisticaOk;
  if (isSinaleiro(body.administrativoOk))
    data.administrativoOk = body.administrativoOk;
  if (isSinaleiro(body.manutencaoOk)) data.manutencaoOk = body.manutencaoOk;

  // Cancelamento / reativação (sem restrição de papel)
  if (typeof body.cancelado === "boolean") data.cancelado = body.cancelado;

  // Alteração de data (usada no drag-and-drop entre dias)
  if (typeof body.data === "string" && body.data.trim() !== "") {
    data.data = new Date(body.data + "T00:00:00.000Z");
  }

  // Edição rápida de equipe
  if (typeof body.motorista === "string") data.motorista = body.motorista || null;
  if (typeof body.ajudante === "string") data.ajudante = body.ajudante || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo válido para atualizar" },
      { status: 400 }
    );
  }

  const card = await prisma.card.update({
    where: { id: params.id },
    data,
    include: incluirCriador,
  });

  return NextResponse.json(card);
}

// DELETE /api/cards/[id] — remove um card.
// Disponível para qualquer usuário autenticado (ADMIN e TÉCNICO).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  await prisma.card.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
