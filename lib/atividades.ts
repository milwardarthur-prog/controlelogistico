import { prisma } from "@/lib/db";
import type { Acao, Entidade } from "@/lib/atividades-rotulos";
import { formatarData, labelAtendimento, labelTipo, SINALEIRO_LABELS, type SinaleiroStatus } from "@/lib/utils";

type Registro = {
  usuario: string;
  acao: Acao;
  entidade: Entidade;
  resumo: string;
  detalhes?: string | null;
  cardId?: string | null;
};

// Grava a atividade sem nunca derrubar a ação principal: se o registro falhar, o card salva igual.
export async function registrarAtividade(r: Registro) {
  try {
    await prisma.atividade.create({
      data: {
        usuario: r.usuario,
        acao: r.acao,
        entidade: r.entidade,
        resumo: r.resumo,
        detalhes: r.detalhes || null,
        cardId: r.cardId ?? null,
      },
    });
  } catch (e) {
    console.error("Falha ao registrar atividade", e);
  }
}

type SessaoUsuario = { user?: { name?: string | null; email?: string | null } } | null;

export function nomeDoUsuario(session: SessaoUsuario): string {
  return session?.user?.name || session?.user?.email || "Desconhecido";
}

type CardResumo = { cliente: string; equipamento: string; data: Date; horario: string };

export function resumoCard(c: CardResumo): string {
  return `${c.cliente} · ${c.equipamento} · ${formatarData(c.data)} ${c.horario}`;
}

type CardCampos = Record<string, unknown>;

const CAMPOS: { campo: string; label: string; formatar?: (v: unknown) => string }[] = [
  { campo: "tipo", label: "Tipo", formatar: (v) => labelTipo(String(v)) },
  { campo: "tipoAtendimento", label: "Atendimento", formatar: (v) => labelAtendimento(String(v)) },
  { campo: "data", label: "Data", formatar: (v) => formatarData(v as Date) },
  { campo: "horario", label: "Horário" },
  { campo: "cliente", label: "Cliente" },
  { campo: "equipamento", label: "Equipamento" },
  { campo: "tensao", label: "Tensão" },
  { campo: "veiculo", label: "Veículo" },
  { campo: "periodo", label: "Período" },
  { campo: "franquia", label: "Franquia" },
  { campo: "local", label: "Local" },
  { campo: "combustivel", label: "Combustível" },
  { campo: "instalacao", label: "Instalação" },
  { campo: "acessorios", label: "Acessórios" },
  { campo: "obs", label: "Obs" },
  { campo: "motorista", label: "Motorista" },
  { campo: "ajudante", label: "Ajudante" },
  { campo: "numeroContrato", label: "Nº contrato" },
  { campo: "numeroOrcamento", label: "Nº orçamento" },
  { campo: "cancelado", label: "Cancelado", formatar: (v) => (v ? "sim" : "não") },
  { campo: "comercialOk", label: "Sinaleiro Comercial", formatar: (v) => SINALEIRO_LABELS[v as SinaleiroStatus] },
  { campo: "logisticaOk", label: "Sinaleiro Logística", formatar: (v) => SINALEIRO_LABELS[v as SinaleiroStatus] },
  { campo: "administrativoOk", label: "Sinaleiro Administrativo", formatar: (v) => SINALEIRO_LABELS[v as SinaleiroStatus] },
  { campo: "manutencaoOk", label: "Sinaleiro Manutenção", formatar: (v) => SINALEIRO_LABELS[v as SinaleiroStatus] },
];

const CAMPOS_SINALEIRO = ["comercialOk", "logisticaOk", "administrativoOk", "manutencaoOk"];

function texto(v: unknown, formatar?: (v: unknown) => string): string {
  if (v === null || v === undefined || v === "") return "vazio";
  const s = formatar ? formatar(v) : String(v);
  const limpo = s.replace(/\s+/g, " ").trim();
  return limpo.length > 70 ? limpo.slice(0, 67) + "..." : limpo;
}

function igual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return (a ?? null) === (b ?? null);
}

// Compara o card antes e depois e devolve os campos alterados, já escolhendo o tipo da ação.
export function descreverMudancas(antes: CardCampos, depois: CardCampos): { acao: Acao; detalhes: string } | null {
  const mudados = CAMPOS.filter((c) => !igual(antes[c.campo], depois[c.campo]));
  if (mudados.length === 0) return null;

  const detalhes = mudados
    .map((c) => `${c.label}: ${texto(antes[c.campo], c.formatar)} → ${texto(depois[c.campo], c.formatar)}`)
    .join("\n");

  const campos = mudados.map((c) => c.campo);
  let acao: Acao = "EDITOU";
  if (campos.includes("cancelado")) acao = depois.cancelado ? "CANCELOU" : "REATIVOU";
  else if (campos.includes("data")) acao = "MOVEU";
  else if (campos.every((c) => CAMPOS_SINALEIRO.includes(c))) acao = "SINALEIRO";

  return { acao, detalhes };
}
