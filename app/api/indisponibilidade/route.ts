import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MOTORISTAS } from "@/lib/utils";
import { pessoasDaLista } from "@/lib/indisponibilidade";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MS_DIA = 86400000;
const MAX_DIAS = 366;

function paraData(iso: unknown): Date | null {
  if (typeof iso !== "string" || !ISO.test(iso)) return null;
  const d = new Date(iso + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : d;
}

// GET /api/indisponibilidade?inicio=AAAA-MM-DD&fim=AAAA-MM-DD — dias marcados no período.
// Qualquer usuário autenticado pode consultar.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const inicio = paraData(searchParams.get("inicio"));
  const fim = paraData(searchParams.get("fim"));
  if (!inicio || !fim || fim < inicio) {
    return NextResponse.json({ error: "Informe inicio e fim (AAAA-MM-DD)" }, { status: 400 });
  }
  const linhas = await prisma.indisponibilidadeTecnico.findMany({
    where: { data: { gte: inicio, lte: fim } },
    select: { pessoa: true, data: true },
    orderBy: [{ data: "asc" }, { pessoa: "asc" }],
  });
  return NextResponse.json(
    linhas.map((l) => ({ pessoa: l.pessoa, data: l.data.toISOString().slice(0, 10) }))
  );
}

// POST /api/indisponibilidade — marca ou desmarca dias de uma pessoa (somente ADMIN).
// Corpo: { pessoa, inicio, fim, indisponivel }. Um clique = inicio igual a fim.
// Marcar dias que já têm card dessa pessoa é permitido: a resposta lista os conflitos.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem marcar indisponibilidade" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const pessoa = body.pessoa;
  const inicio = paraData(body.inicio);
  const fim = paraData(body.fim ?? body.inicio);
  if (typeof pessoa !== "string" || !(MOTORISTAS as readonly string[]).includes(pessoa)) {
    return NextResponse.json({ error: "Pessoa fora da lista" }, { status: 400 });
  }
  if (!inicio || !fim || fim < inicio) {
    return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
  }
  const dias = Math.round((fim.getTime() - inicio.getTime()) / MS_DIA) + 1;
  if (dias > MAX_DIAS) {
    return NextResponse.json({ error: `Período máximo de ${MAX_DIAS} dias` }, { status: 400 });
  }
  if (typeof body.indisponivel !== "boolean") {
    return NextResponse.json({ error: "Informe indisponivel (true/false)" }, { status: 400 });
  }

  if (!body.indisponivel) {
    await prisma.indisponibilidadeTecnico.deleteMany({
      where: { pessoa, data: { gte: inicio, lte: fim } },
    });
    return NextResponse.json({ ok: true, conflitos: [] });
  }

  const datas = Array.from({ length: dias }, (_, i) => new Date(inicio.getTime() + i * MS_DIA));
  await prisma.indisponibilidadeTecnico.createMany({
    data: datas.map((data) => ({ pessoa, data })),
    skipDuplicates: true,
  });

  const cards = await prisma.card.findMany({
    where: { data: { gte: inicio, lte: fim }, cancelado: false },
    select: { id: true, cliente: true, data: true, horario: true, motorista: true, ajudante: true },
    orderBy: [{ data: "asc" }, { horario: "asc" }],
  });
  const conflitos = cards
    .filter((c) => pessoasDaLista(c.motorista, c.ajudante).includes(pessoa))
    .map((c) => ({
      id: c.id,
      cliente: c.cliente,
      data: c.data.toISOString().slice(0, 10),
      horario: c.horario,
    }));

  return NextResponse.json({ ok: true, conflitos });
}
