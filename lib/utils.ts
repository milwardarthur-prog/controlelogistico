import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Combina classes do Tailwind de forma segura
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Nomes dos dias da semana em português
export const DIAS_SEMANA = [
  "DOMINGO",
  "SEGUNDA",
  "TERÇA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SÁBADO",
];

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Formata uma data (Date ou string) para dd/mm/aaaa
export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Retorna o nome do dia da semana em português a partir de uma data
export function nomeDiaSemana(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return DIAS_SEMANA[d.getUTCDay()];
}

// Converte uma data para chave YYYY-MM-DD (em UTC) para agrupamento
export function chaveData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toISOString().slice(0, 10);
}

// Verifica se um card foi criado há menos de 4 horas (card "novo")
export function isCardNovo(createdAt: Date | string): boolean {
  const criado = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const agora = new Date();
  const diffHoras = (agora.getTime() - criado.getTime()) / (1000 * 60 * 60);
  return diffHoras >= 0 && diffHoras < 4;
}

// Tipos de card (categorias) — mesma ordem do enum TipoCard no Prisma
export type TipoCard =
  | "ACOMPANHAMENTO_TECNICO"
  | "INSTALACAO"
  | "ENTREGA"
  | "DESINSTALACAO"
  | "RETIRADA";

// Rótulos legíveis para exibição na UI
export const TIPO_LABELS: Record<TipoCard, string> = {
  ACOMPANHAMENTO_TECNICO: "Acompanhamento Técnico",
  INSTALACAO: "Instalação",
  ENTREGA: "Entrega",
  DESINSTALACAO: "Desinstalação",
  RETIRADA: "Retirada",
};

// Cor base (nome) de cada categoria, usada para gerar classes/pontos
export const TIPO_COR: Record<TipoCard, string> = {
  ACOMPANHAMENTO_TECNICO: "sky",
  INSTALACAO: "violet",
  ENTREGA: "emerald",
  DESINSTALACAO: "orange",
  RETIRADA: "amber",
};

// Classes de fundo (badge) por categoria — usadas no painel TV (fundo escuro)
export const TIPO_BADGE_TV: Record<TipoCard, string> = {
  ACOMPANHAMENTO_TECNICO: "bg-sky-600",
  INSTALACAO: "bg-violet-600",
  ENTREGA: "bg-emerald-600",
  DESINSTALACAO: "bg-orange-600",
  RETIRADA: "bg-amber-600",
};

// Classe de ponto colorido (calendário) por categoria
export const TIPO_PONTO: Record<TipoCard, string> = {
  ACOMPANHAMENTO_TECNICO: "bg-sky-500",
  INSTALACAO: "bg-violet-500",
  ENTREGA: "bg-emerald-500",
  DESINSTALACAO: "bg-orange-500",
  RETIRADA: "bg-amber-500",
};

// Retorna o rótulo legível de um tipo (fallback para o próprio valor)
export function labelTipo(tipo: string): string {
  return TIPO_LABELS[tipo as TipoCard] ?? tipo;
}

// Verifica se o card deve "piscar" no painel TV.
// Regra: lançado HOJE (createdAt no dia atual) E atividade para HOJE
// (data = dia atual) E criado há menos de 4 horas.
export function isCardPiscando(
  createdAt: Date | string,
  data: Date | string
): boolean {
  if (!isCardNovo(createdAt)) return false;
  const hojeIso = new Date().toISOString().slice(0, 10);
  const criadoIso = chaveData(createdAt);
  const dataIso = chaveData(data);
  return criadoIso === hojeIso && dataIso === hojeIso;
}
