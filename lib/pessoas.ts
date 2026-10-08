import { MOTORISTAS, PESSOA_TEMPORARIA, PREFIXO_TEMPORARIO } from "@/lib/utils";
import { distancia, semAcento } from "@/lib/texto";

export const TEMPORARIA = { rotulo: PESSOA_TEMPORARIA, prefixo: PREFIXO_TEMPORARIO };

// Grafias antigas ou abreviações que são a mesma pessoa de alguém da lista
// (chave sem acento, em maiúsculas).
const APELIDOS: Record<string, string> = {
  ALEXSANDER: "Alex",
  ALEXSSADER: "Alex",
  SIMAR: "Gilsimar",
  VICTOR: "Vitor",
  LUIZ: "Luiz Henrique",
  HENRIQUE: "Luiz Henrique",
  OLIVEIRA: "Lucas O.",
};

const chave = (s: string) => semAcento(s).toUpperCase().replace(/\s+/g, " ").trim();

const LISTA = MOTORISTAS.map((nome) => ({ nome: nome as string, chave: chave(nome) }));
const NOMES_SIMPLES = LISTA.filter((p) => !p.chave.includes(" ") && !p.chave.includes("."));
const PREFIXO = PREFIXO_TEMPORARIO.trim().toLowerCase();

export type Pessoa =
  | { tipo: "lista"; nome: string }
  | { tipo: "temporario"; nome: string }
  | { tipo: "desconhecido"; nome: string };

// Interpreta um nome vindo do banco: da lista oficial, temporário ("Temporário: João")
// ou texto livre antigo, que é aproximado da lista (acento, caixa, 1 letra errada, apelidos).
export function resolverPessoa(texto: string): Pessoa | null {
  const bruto = texto.trim();
  if (!bruto) return null;
  if (bruto.toLowerCase().startsWith(PREFIXO)) {
    return { tipo: "temporario", nome: bruto.slice(PREFIXO.length).trim() };
  }
  const k = chave(bruto);
  const exata = LISTA.find((p) => p.chave === k);
  if (exata) return { tipo: "lista", nome: exata.nome };
  for (const token of k.split(" ")) {
    if (APELIDOS[token]) return { tipo: "lista", nome: APELIDOS[token] };
    const p = NOMES_SIMPLES.find(
      (c) => c.chave === token || (token.length >= 5 && c.chave.length >= 5 && distancia(token, c.chave) <= 1)
    );
    if (p) return { tipo: "lista", nome: p.nome };
  }
  return { tipo: "desconhecido", nome: bruto };
}

// Texto de um campo com vários nomes ("Pablio + Ricardo", "PABLIO / RICARDO") -> pessoas.
export function pessoasDoTexto(texto?: string | null): Pessoa[] {
  if (!texto || !texto.trim()) return [];
  const resultado: Pessoa[] = [];
  const vistos = new Set<string>();
  for (const parte of texto.split(/\s*[/+,&]\s*|\s+E\s+/i)) {
    const p = resolverPessoa(parte);
    if (!p) continue;
    const id = p.tipo + ":" + p.nome;
    if (vistos.has(id)) continue;
    vistos.add(id);
    resultado.push(p);
  }
  return resultado;
}

// Pessoas -> texto no formato gravado no card ("Pablio + Temporário: João").
export function textoDePessoas(pessoas: Pessoa[]): string {
  return pessoas
    .filter((p) => p.nome.trim() !== "")
    .map((p) => (p.tipo === "temporario" ? PREFIXO_TEMPORARIO + p.nome : p.nome))
    .join(" + ");
}

// Como a equipe aparece no Histórico e no Excel (o banco não é alterado).
export function pessoasParaExibicao(texto?: string | null): string {
  return pessoasDoTexto(texto)
    .map((p) => (p.tipo === "temporario" ? (p.nome ? PREFIXO_TEMPORARIO + p.nome : "") : p.nome))
    .filter(Boolean)
    .join(" + ");
}

// Como cada nome antigo deve aparecer ao abrir um card no formulário.
export function normalizarPessoaFormulario(parte: string): string {
  const p = resolverPessoa(parte);
  if (!p) return "";
  if (p.tipo === "temporario") return PREFIXO_TEMPORARIO + p.nome;
  return p.nome;
}
