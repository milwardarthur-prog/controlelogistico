import { PREFIXO_TERCEIRO, VEICULOS, VEICULO_TERCEIRO } from "@/lib/utils";
import { distancia, semAcento } from "@/lib/texto";

export const TERCEIRO = {
  rotulo: VEICULO_TERCEIRO,
  prefixo: PREFIXO_TERCEIRO,
  placeholder: "Qual veículo? (ex: HR Lubrate)",
};

const chave = (s: string) =>
  semAcento(s).toUpperCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();

const LISTA = VEICULOS.map((nome) => ({ nome: nome as string, chave: chave(nome) }));
const PREFIXO = PREFIXO_TERCEIRO.trim().toLowerCase();
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type Veiculo =
  | { tipo: "lista"; nome: string }
  | { tipo: "terceiro"; nome: string }
  | { tipo: "desconhecido"; nome: string };

// Interpreta um veículo vindo do banco: da frota, de terceiro ("Terceiro: HR Lubrate") ou
// texto livre antigo, aproximado da frota (espaços, caixa, 1 letra errada, notas entre parênteses).
export function resolverVeiculo(texto: string): Veiculo | null {
  const bruto = texto.trim();
  if (!bruto) return null;
  if (bruto.toLowerCase().startsWith(PREFIXO)) {
    return { tipo: "terceiro", nome: bruto.slice(PREFIXO.length).trim() };
  }

  const k = chave(bruto);
  const exato = LISTA.find((v) => v.chave === k);
  if (exato) return { tipo: "lista", nome: exato.nome };

  // Terceiros conhecidos nos dados antigos (a HR da Lubrate não é a HR da frota)
  if (/LUBRATE|EMPILHATEC/.test(k)) return { tipo: "terceiro", nome: bruto };

  if (k.startsWith("CARRETINHA")) {
    if (/MAIOR|\b0?1\b/.test(k)) return { tipo: "lista", nome: "Carretinha Maior" };
    if (/MENOR|\b0?2\b/.test(k)) return { tipo: "lista", nome: "Carretinha Menor" };
    return { tipo: "desconhecido", nome: bruto };
  }

  for (const v of LISTA) {
    const re = new RegExp(`(^|[^A-Z0-9-])${escapar(v.chave)}($|[^A-Z0-9-])`);
    if (re.test(k)) return { tipo: "lista", nome: v.nome };
  }

  if (/(^|[^A-Z])CLIENTE($|[^A-Z])/.test(k)) {
    return { tipo: "terceiro", nome: k === "CLIENTE" ? "Cliente" : bruto };
  }

  if (/^[A-Z]+$/.test(k)) {
    if (distancia(k, "CLIENTE") <= 1) return { tipo: "terceiro", nome: "Cliente" };
    for (const v of LISTA) {
      if (v.chave.length >= 5 && /^[A-Z]+$/.test(v.chave) && distancia(k, v.chave) <= 1) {
        return { tipo: "lista", nome: v.nome };
      }
    }
  }
  return { tipo: "desconhecido", nome: bruto };
}

// Texto de um campo com vários veículos ("24-250 + Bongo", "17-180 / 24-250") -> veículos.
export function veiculosDoTexto(texto?: string | null): Veiculo[] {
  if (!texto || !texto.trim()) return [];
  const resultado: Veiculo[] = [];
  const vistos = new Set<string>();
  // "P/" é abreviação de "para" (ex: "PRECISA DE MUNCK P/ CARREGAR"), não um separador
  for (const parte of texto.replace(/\bP\/\s*/gi, "P ").split(/\s*[+,/]\s*/)) {
    const v = resolverVeiculo(parte);
    if (!v) continue;
    const id = v.tipo + ":" + v.nome;
    if (vistos.has(id)) continue;
    vistos.add(id);
    resultado.push(v);
  }
  return resultado;
}

// Como cada veículo antigo deve aparecer ao abrir um card no formulário.
export function normalizarVeiculoFormulario(parte: string): string {
  const v = resolverVeiculo(parte);
  if (!v) return "";
  if (v.tipo === "terceiro") return PREFIXO_TERCEIRO + v.nome;
  return v.nome;
}

// Como o veículo aparece no Histórico e no Excel (o banco não é alterado).
export function veiculoParaExibicao(texto?: string | null): string {
  return veiculosDoTexto(texto)
    .map((v) => (v.tipo === "terceiro" ? PREFIXO_TERCEIRO + v.nome : v.nome))
    .join(" + ");
}
