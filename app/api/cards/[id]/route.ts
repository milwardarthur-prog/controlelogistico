import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TipoCard, TipoAtendimento, Prisma } from "@prisma/client";

const incluirCriador = { createdBy: { select: { name: true } } };

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

// PUT /api/cards/[id] — edita um card.
// ADMIN pode editar tudo; TÉCNICO só pode editar motorista e ajudante.
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

  let data: Prisma.CardUpdateInput;
  if (session.user.role === "ADMIN") {
    data = {
      tipo: (body.tipo as TipoCard) || existente.tipo,
      tipoAtendimento:
        (body.tipoAtendimento as TipoAtendimento) || existente.tipoAtendimento,
      data: body.data
        ? new Date(body.data + "T00:00:00.000Z")
        : existente.data,
      horario: body.horario ?? existente.horario,
      cliente: body.cliente ?? existente.cliente,
      equipamento: body.equipamento ?? existente.equipamento,
      tensao: body.tensao ?? null,
      veiculo: body.veiculo ?? null,
      periodo: body.periodo ?? null,
      franquia: body.franquia ?? null,
      local: body.local ?? existente.local,
      combustivel: body.combustivel ?? null,
      instalacao: body.instalacao ?? null,
      acessorios: body.acessorios ?? null,
      obs: body.obs ?? null,
      motorista: body.motorista ?? null,
      ajudante: body.ajudante ?? null,
    };
  } else {
    // TÉCNICO só atualiza motorista e ajudante
    data = {
      motorista: body.motorista ?? existente.motorista,
      ajudante: body.ajudante ?? existente.ajudante,
    };
  }

  const card = await prisma.card.update({
    where: { id: params.id },
    data,
    include: incluirCriador,
  });

  return NextResponse.json(card);
}

// PATCH /api/cards/[id] — atualiza campos parciais.
// docOk / entregaOk: qualquer usuário autenticado.
// cancelado: somente ADMIN.
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

  if (typeof body.docOk === "boolean") data.docOk = body.docOk;
  if (typeof body.entregaOk === "boolean") data.entregaOk = body.entregaOk;

  // Alteração de cancelamento é restrita a ADMIN
  if (typeof body.cancelado === "boolean") {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem cancelar cards" },
        { status: 403 }
      );
    }
    data.cancelado = body.cancelado;
  }

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

// DELETE /api/cards/[id] — remove um card (somente ADMIN)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  await prisma.card.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
