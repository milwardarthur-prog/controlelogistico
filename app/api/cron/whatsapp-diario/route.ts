import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatarData, labelAtendimento } from "@/lib/utils";

// Datas são gravadas como meia-noite UTC (mesma convenção do resto do app,
// ver isoOffset em app/tv/TvClient.tsx) — por isso o cálculo de "amanhã"
// usa UTC em vez do fuso local do servidor.
function isoAmanha(): string {
  const d = new Date();
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString().slice(0, 10);
}

async function buscarCardsDoDia(dataIso: string) {
  return prisma.card.findMany({
    where: {
      data: {
        gte: new Date(dataIso + "T00:00:00.000Z"),
        lte: new Date(dataIso + "T23:59:59.999Z"),
      },
      tipoAtendimento: { in: ["EVENTO", "DESLIGAMENTO"] },
      cancelado: false,
    },
    orderBy: [{ horario: "asc" }],
  });
}

function montarMensagem(
  cards: Awaited<ReturnType<typeof buscarCardsDoDia>>,
  dataIso: string
): string {
  const dataFormatada = formatarData(dataIso);
  if (cards.length === 0) {
    return `📋 *Agendamentos de amanhã (${dataFormatada})*\n\nNenhum equipamento marcado como Evento ou Desligamento.`;
  }
  const linhas = cards.map(
    (c) =>
      `• ${c.horario} — ${c.cliente} (${labelAtendimento(c.tipoAtendimento)})\n  Equip.: ${c.equipamento} | Local: ${c.local}`
  );
  return `📋 *Agendamentos de amanhã (${dataFormatada})*\n\n${linhas.join("\n\n")}`;
}

// Envia texto via Evolution API (self-hosted). Formato do endpoint conforme
// Evolution API v2 — se a instância hospedada usar v1, ajustar o corpo para
// { number, textMessage: { text } } (confira o Swagger em <EVOLUTION_API_URL>/docs).
async function enviarWhatsapp(texto: string) {
  const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.EVOLUTION_API_KEY ?? "",
    },
    body: JSON.stringify({
      number: process.env.WHATSAPP_DESTINO,
      text: texto,
    }),
  });

  if (!res.ok) {
    throw new Error(`Evolution API respondeu ${res.status}: ${await res.text()}`);
  }
}

// Avisa o healthchecks.io (monitor externo) do resultado do envio. Se HEALTHCHECK_URL
// não estiver configurada, não faz nada — o alerta é opcional, não bloqueia o fluxo.
// Falha ao notificar o healthchecks.io nunca deve derrubar a rota (por isso o catch mudo).
async function notificarHealthcheck(sucesso: boolean, detalhe?: string) {
  const base = process.env.HEALTHCHECK_URL;
  if (!base) return;
  const url = sucesso ? base : `${base}/fail`;
  try {
    await fetch(url, { method: "POST", body: detalhe ?? "" });
  } catch {
    // sem monitor de monitor — se o próprio healthchecks.io estiver fora do ar, seguimos em frente
  }
}

// GET /api/cron/whatsapp-diario — disparado pelo Vercel Cron todo dia às 17h
// (horário de Brasília). Protegido por CRON_SECRET: só o Vercel Cron (ou uma
// chamada manual com o header Authorization correto) consegue acionar o envio.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const amanha = isoAmanha();
    const cards = await buscarCardsDoDia(amanha);
    const mensagem = montarMensagem(cards, amanha);

    await enviarWhatsapp(mensagem);
    await notificarHealthcheck(true);

    return NextResponse.json({ enviado: true, cards: cards.length, data: amanha });
  } catch (erro) {
    const mensagemErro = erro instanceof Error ? erro.message : String(erro);
    await notificarHealthcheck(false, mensagemErro);
    return NextResponse.json({ enviado: false, error: mensagemErro }, { status: 500 });
  }
}
