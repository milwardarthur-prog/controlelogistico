import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DIAS_SEMANA = ["DOMINGO","SEGUNDA","TERÇA","QUARTA","QUINTA","SEXTA","SÁBADO"];
export const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export function nomeDiaSemana(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return DIAS_SEMANA[d.getUTCDay()];
}

export function chaveData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toISOString().slice(0, 10);
}

export function isCardNovo(createdAt: Date | string): boolean {
  const criado = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const agora = new Date();
  const diffHoras = (agora.getTime() - criado.getTime()) / (1000 * 60 * 60);
  return diffHoras >= 0 && diffHoras < 4;
}

export type TipoCard =
  | "ENTREGA" | "ENTREGA_BASE" | "ENTREGA_INST_ACOMP" | "ENTREGA_INST" | "ENTREGA_INST_RETI"
  | "TROCA" | "INSTALACAO" | "DESINSTALACAO" | "ACOMPANHAMENTO_TECNICO"
  | "RETIRADA" | "DEVOLUCAO" | "VISTORIA_BOMBEIROS";

export const TIPO_LABELS: Record<TipoCard, string> = {
  ENTREGA: "Entrega",
  ENTREGA_BASE: 'Entrega "Base"',
  ENTREGA_INST_ACOMP: "Entrega + Inst + Acomp",
  ENTREGA_INST: "Entrega + Inst",
  ENTREGA_INST_RETI: "Entrega + Inst + Reti",
  TROCA: "Troca",
  INSTALACAO: "Instalação",
  DESINSTALACAO: "Desinstalação",
  ACOMPANHAMENTO_TECNICO: "Acompanhamento Tec",
  RETIRADA: "Retirada",
  DEVOLUCAO: "Devolução",
  VISTORIA_BOMBEIROS: "Vistoria Bombeiros",
};

export const TIPO_BADGE_TV: Record<TipoCard, string> = {
  ENTREGA: "bg-emerald-600",
  ENTREGA_BASE: "bg-blue-600",
  ENTREGA_INST_ACOMP: "bg-cyan-600",
  ENTREGA_INST: "bg-teal-600",
  ENTREGA_INST_RETI: "bg-indigo-600",
  TROCA: "bg-purple-600",
  INSTALACAO: "bg-violet-600",
  DESINSTALACAO: "bg-orange-600",
  ACOMPANHAMENTO_TECNICO: "bg-sky-600",
  RETIRADA: "bg-amber-600",
  DEVOLUCAO: "bg-rose-600",
  VISTORIA_BOMBEIROS: "bg-red-600",
};

export const TIPO_PONTO: Record<TipoCard, string> = {
  ENTREGA: "bg-emerald-500",
  ENTREGA_BASE: "bg-blue-500",
  ENTREGA_INST_ACOMP: "bg-cyan-500",
  ENTREGA_INST: "bg-teal-500",
  ENTREGA_INST_RETI: "bg-indigo-500",
  TROCA: "bg-purple-500",
  INSTALACAO: "bg-violet-500",
  DESINSTALACAO: "bg-orange-500",
  ACOMPANHAMENTO_TECNICO: "bg-sky-500",
  RETIRADA: "bg-amber-500",
  DEVOLUCAO: "bg-rose-500",
  VISTORIA_BOMBEIROS: "bg-red-500",
};

export const TIPO_COR: Record<TipoCard, string> = {
  ENTREGA: "emerald",
  ENTREGA_BASE: "blue",
  ENTREGA_INST_ACOMP: "cyan",
  ENTREGA_INST: "teal",
  ENTREGA_INST_RETI: "indigo",
  TROCA: "purple",
  INSTALACAO: "violet",
  DESINSTALACAO: "orange",
  ACOMPANHAMENTO_TECNICO: "sky",
  RETIRADA: "amber",
  DEVOLUCAO: "rose",
  VISTORIA_BOMBEIROS: "red",
};

export type TipoAtendimento = "EVENTO" | "OBRA" | "DESLIGAMENTO";

export const ATENDIMENTO_LABELS: Record<TipoAtendimento, string> = {
  EVENTO: "Evento",
  OBRA: "Obra",
  DESLIGAMENTO: "Desligamento",
};

export const ATENDIMENTO_BADGE: Record<TipoAtendimento, string> = {
  EVENTO: "bg-yellow-500",
  OBRA: "bg-blue-500",
  DESLIGAMENTO: "bg-gray-500",
};

export function labelTipo(tipo: string): string {
  return TIPO_LABELS[tipo as TipoCard] ?? tipo;
}

export function labelAtendimento(tipo: string): string {
  return ATENDIMENTO_LABELS[tipo as TipoAtendimento] ?? tipo;
}

export function isCardPiscando(createdAt: Date | string, data: Date | string): boolean {
  if (!isCardNovo(createdAt)) return false;
  const hojeIso = new Date().toISOString().slice(0, 10);
  const criadoIso = chaveData(createdAt);
  const dataIso = chaveData(data);
  return criadoIso === hojeIso && dataIso === hojeIso;
}
