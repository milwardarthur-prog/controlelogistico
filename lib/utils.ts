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
