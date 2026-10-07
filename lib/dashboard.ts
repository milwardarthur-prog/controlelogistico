import { PESSOA_TEMPORARIA, TIPO_LABELS, VEICULOS, type TipoCard } from "@/lib/utils";
import { distancia, semAcento } from "@/lib/texto";
import { pessoasDoTexto } from "@/lib/pessoas";

export type CardDash = {
  id: string;
  tipo: TipoCard;
  data: string;
  cancelado: boolean;
  veiculo?: string | null;
  motorista?: string | null;
};

// ---------- Datas (sempre ISO "AAAA-MM-DD", aritmética em UTC) ----------

const MS_DIA = 86400000;

export function localIso(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

function paraMs(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function deMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function somarDias(iso: string, n: number): string {
  return deMs(paraMs(iso) + n * MS_DIA);
}

export function diasNoPeriodo(inicio: string, fim: string): number {
  return Math.round((paraMs(fim) - paraMs(inicio)) / MS_DIA) + 1;
}

export function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export type Preset = "7d" | "30d" | "90d" | "mes" | "mes-anterior" | "custom";

export const PRESETS: { valor: Preset; rotulo: string }[] = [
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "90d", rotulo: "Últimos 90 dias" },
  { valor: "mes", rotulo: "Este mês (até hoje)" },
  { valor: "mes-anterior", rotulo: "Mês anterior" },
  { valor: "custom", rotulo: "Personalizado" },
];

export function intervaloDoPreset(
  preset: Exclude<Preset, "custom">,
  hoje: string
): { inicio: string; fim: string } {
  switch (preset) {
    case "7d":
      return { inicio: somarDias(hoje, -6), fim: hoje };
    case "30d":
      return { inicio: somarDias(hoje, -29), fim: hoje };
    case "90d":
      return { inicio: somarDias(hoje, -89), fim: hoje };
    case "mes":
      return { inicio: hoje.slice(0, 8) + "01", fim: hoje };
    case "mes-anterior": {
      const primeiroDoMes = hoje.slice(0, 8) + "01";
      return { inicio: somarDias(primeiroDoMes, -1).slice(0, 8) + "01", fim: somarDias(primeiroDoMes, -1) };
    }
  }
}

export function noPeriodo(cards: CardDash[], inicio: string, fim: string): CardDash[] {
  return cards.filter((c) => {
    const d = c.data.slice(0, 10);
    return d >= inicio && d <= fim;
  });
}

// ---------- Classificação ----------

export const isEntrega = (c: CardDash) => c.tipo.startsWith("ENTREGA");
export const naoCancelado = (c: CardDash) => !c.cancelado;

// ---------- Série temporal ----------

export type Balde = { chave: string; label: string; titulo: string; valor: number };

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function serieTemporal(
  cards: CardDash[],
  inicio: string,
  fim: string,
  incluir: (c: CardDash) => boolean
): Balde[] {
  const dias = diasNoPeriodo(inicio, fim);
  const contagem = new Map<string, number>();

  // Diária até 45 dias, semanal (segunda a domingo) até 150 dias, mensal acima disso.
  const chaveDe = (iso: string): string => {
    if (dias <= 45) return iso;
    if (dias <= 150) {
      const dow = new Date(paraMs(iso)).getUTCDay();
      return somarDias(iso, -((dow + 6) % 7));
    }
    return iso.slice(0, 7);
  };

  for (const c of cards) {
    const d = c.data.slice(0, 10);
    if (d < inicio || d > fim || !incluir(c)) continue;
    const k = chaveDe(d);
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }

  const baldes: Balde[] = [];
  if (dias <= 45) {
    for (let i = 0; i < dias; i++) {
      const iso = somarDias(inicio, i);
      baldes.push({ chave: iso, label: ddmm(iso), titulo: `${ddmm(iso)}/${iso.slice(0, 4)}`, valor: contagem.get(iso) ?? 0 });
    }
  } else if (dias <= 150) {
    for (let k = chaveDe(inicio); k <= fim; k = somarDias(k, 7)) {
      baldes.push({
        chave: k,
        label: ddmm(k),
        titulo: `Semana de ${ddmm(k)} a ${ddmm(somarDias(k, 6))}`,
        valor: contagem.get(k) ?? 0,
      });
    }
  } else {
    let [a, m] = [Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7))];
    const [af, mf] = [Number(fim.slice(0, 4)), Number(fim.slice(5, 7))];
    while (a < af || (a === af && m <= mf)) {
      const k = `${a}-${String(m).padStart(2, "0")}`;
      baldes.push({
        chave: k,
        label: `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}`,
        titulo: `${MESES_LONGOS[m - 1]} de ${a}`,
        valor: contagem.get(k) ?? 0,
      });
      m++;
      if (m > 12) { m = 1; a++; }
    }
  }
  return baldes;
}

export type Linha = { chave: string; nome: string; valor: number };

export function contarPorTipo(cards: CardDash[], incluir: (c: CardDash) => boolean): Linha[] {
  const mapa = new Map<string, number>();
  for (const c of cards) {
    if (!incluir(c)) continue;
    mapa.set(c.tipo, (mapa.get(c.tipo) ?? 0) + 1);
  }
  return Array.from(mapa.entries())
    .map(([tipo, valor]) => ({ chave: tipo, nome: TIPO_LABELS[tipo as TipoCard] ?? tipo, valor }))
    .sort((a, b) => b.valor - a.valor);
}

// ---------- Texto livre -> categorias ----------

// ---------- Veículos ----------

const CANON = VEICULOS.filter((v) => v !== "Outro").map((nome) => ({
  nome: nome as string,
  chave: semAcento(nome).toUpperCase(),
}));

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function classificarVeiculo(p: string): string {
  const exato = CANON.find((c) => c.chave === p);
  if (exato) return exato.nome;

  if (p.startsWith("CARRETINHA")) {
    if (/MAIOR|\b0?1\b/.test(p)) return "Carretinha 1 (Maior)";
    if (/MENOR|\b0?2\b/.test(p)) return "Carretinha 2 (Menor)";
    return "Outro";
  }

  for (const c of CANON) {
    const re = new RegExp(`(^|[^A-Z0-9-])${escapeRegex(c.chave)}($|[^A-Z0-9-])`);
    if (re.test(p)) return c.nome;
  }

  if (/^[A-Z]+$/.test(p)) {
    for (const c of CANON) {
      if (c.chave.length >= 5 && /^[A-Z]+$/.test(c.chave) && distancia(p, c.chave) <= 1) return c.nome;
    }
  }
  return "Outro";
}

// "24-250 + BONGO" -> ["24-250", "Bongo"]; textos antigos fora do padrão são
// aproximados da lista oficial; o que não bate vira "Outro".
export function normalizarVeiculos(texto?: string | null): string[] {
  if (!texto || !texto.trim()) return [];
  const partes = semAcento(texto).toUpperCase().replace(/\bP\//g, "P ").split(/[+,/]/);
  const resultado = new Set<string>();
  for (const bruta of partes) {
    const p = bruta.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
    if (p) resultado.add(classificarVeiculo(p));
  }
  return Array.from(resultado);
}

export type LinhaVeiculo = { nome: string; valor: number; frota: boolean };

export function rankingVeiculos(cards: CardDash[]): {
  linhas: LinhaVeiculo[];
  naoInformado: number;
  total: number;
} {
  const mapa = new Map<string, number>();
  let naoInformado = 0;
  for (const c of cards) {
    const veiculos = normalizarVeiculos(c.veiculo);
    if (veiculos.length === 0) {
      naoInformado++;
      continue;
    }
    for (const v of veiculos) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  }
  const linhas = Array.from(mapa.entries())
    .map(([nome, valor]) => ({ nome, valor, frota: nome !== "Cliente" && nome !== "Outro" }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
  return { linhas, naoInformado, total: cards.length };
}

// ---------- Motoristas ----------

// Pessoas da lista oficial pelo nome; temporários e textos antigos que não batem
// com ninguém da lista caem juntos em "Outro/Temporário".
export function normalizarMotoristas(texto?: string | null): string[] {
  const resultado = new Set<string>();
  for (const p of pessoasDoTexto(texto)) {
    resultado.add(p.tipo === "lista" ? p.nome : PESSOA_TEMPORARIA);
  }
  return Array.from(resultado);
}

export type LinhaMotorista = { nome: string; servicos: number; dias: number; media: number; interno: boolean };

// Serviço com dois motoristas conta para cada um.
export function rankingMotoristas(cards: CardDash[]): {
  linhas: LinhaMotorista[];
  semMotorista: number;
  total: number;
} {
  const grupos = new Map<string, { servicos: number; datas: Set<string> }>();
  let semMotorista = 0;

  for (const c of cards) {
    const motoristas = normalizarMotoristas(c.motorista);
    if (motoristas.length === 0) {
      semMotorista++;
      continue;
    }
    for (const m of motoristas) {
      const g = grupos.get(m) ?? { servicos: 0, datas: new Set<string>() };
      g.servicos++;
      g.datas.add(c.data.slice(0, 10));
      grupos.set(m, g);
    }
  }

  const linhas = Array.from(grupos.entries())
    .map(([nome, g]) => ({
      nome,
      servicos: g.servicos,
      dias: g.datas.size,
      media: g.datas.size ? g.servicos / g.datas.size : 0,
      interno: nome !== PESSOA_TEMPORARIA,
    }))
    .sort((a, b) => b.servicos - a.servicos || a.nome.localeCompare(b.nome, "pt-BR"));

  return { linhas, semMotorista, total: cards.length };
}
