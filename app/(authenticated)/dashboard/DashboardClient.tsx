"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Minus } from "lucide-react";
import {
  PRESETS,
  contarPorTipo,
  ddmm,
  diasNoPeriodo,
  intervaloDoPreset,
  isEntrega,
  localIso,
  naoCancelado,
  noPeriodo,
  rankingMotoristas,
  rankingVeiculos,
  serieTemporal,
  somarDias,
  type Balde,
  type CardDash,
  type Linha,
  type Preset,
} from "@/lib/dashboard";

// Paleta de referência do dataviz (tema claro): slot 1 azul, slot 2 laranja.
const VARS = {
  "--surface": "#fcfcfb",
  "--ink": "#0b0b0b",
  "--ink-2": "#52514e",
  "--muted": "#898781",
  "--grid": "#e1e0d9",
  "--axis": "#c3c2b7",
  "--ring": "rgba(11,11,11,0.10)",
  "--s1": "#2a78d6",
  "--s2": "#eb6834",
  "--neutral": "#c3c2b7",
  "--good": "#006300",
  "--bad": "#d03b3b",
} as React.CSSProperties;

const fmt = (n: number) => n.toLocaleString("pt-BR");
const fmt1 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ---------- Variação vs período anterior ----------

type Delta = { texto: string; direcao: "up" | "down" | "flat"; bom: boolean | null };

function variacao(atual: number, anterior: number, altaEhBoa: boolean): Delta {
  if (anterior === 0) {
    return atual === 0
      ? { texto: "sem variação", direcao: "flat", bom: null }
      : { texto: "novo (antes: 0)", direcao: "up", bom: altaEhBoa };
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return { texto: "0%", direcao: "flat", bom: null };
  return { texto: `${Math.abs(pct)}%`, direcao: pct > 0 ? "up" : "down", bom: (pct > 0) === altaEhBoa };
}

function variacaoPontos(atual: number, anterior: number): Delta {
  const d = atual - anterior;
  if (Math.abs(d) < 0.05) return { texto: "0 p.p.", direcao: "flat", bom: null };
  return { texto: `${fmt1(Math.abs(d))} p.p.`, direcao: d > 0 ? "up" : "down", bom: d < 0 };
}

// ---------- Blocos visuais ----------

function Tile({
  rotulo,
  valor,
  sub,
  delta,
  anterior,
  hero,
}: {
  rotulo: string;
  valor: string;
  sub?: string;
  delta?: Delta;
  anterior?: string;
  hero?: boolean;
}) {
  const cor =
    delta?.bom === true ? "text-[var(--good)]" : delta?.bom === false ? "text-[var(--bad)]" : "text-[var(--ink-2)]";
  const Seta = delta?.direcao === "up" ? ArrowUp : delta?.direcao === "down" ? ArrowDown : Minus;
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[var(--ring)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--ink-2)]">{rotulo}</p>
      <p
        className={`mt-2 font-semibold leading-none text-[var(--ink)] ${hero ? "text-[56px]" : "text-3xl"}`}
        style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}
      >
        {valor}
      </p>
      <div className="mt-2 min-h-[20px] text-xs">
        {delta && (
          <span className={`inline-flex items-center gap-1 font-medium ${cor}`}>
            <Seta className="h-3.5 w-3.5" aria-hidden />
            {delta.texto}
            <span className="font-normal text-[var(--ink-2)]"> vs período anterior{anterior ? ` (${anterior})` : ""}</span>
          </span>
        )}
        {!delta && sub && <span className="text-[var(--ink-2)]">{sub}</span>}
      </div>
    </div>
  );
}

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--ring)] bg-[var(--surface)] p-5">
      <h2 className="text-base font-semibold text-[var(--ink)]">{titulo}</h2>
      {subtitulo && <p className="mb-4 mt-0.5 text-xs text-[var(--ink-2)]">{subtitulo}</p>}
      {children}
    </section>
  );
}

type Dica = { x: number; y: number; titulo: string; valor: string; extra?: string };

function Dica({ dica, largura }: { dica: Dica | null; largura: number }) {
  if (!dica) return null;
  const x = Math.min(Math.max(dica.x, 70), Math.max(largura - 70, 70));
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--ring)] bg-[var(--surface)] px-3 py-2 text-xs shadow-md"
      style={{ left: x, top: dica.y - 6 }}
    >
      <p className="text-base font-semibold leading-tight text-[var(--ink)]">{dica.valor}</p>
      <p className="text-[var(--ink-2)]">{dica.titulo}</p>
      {dica.extra && <p className="text-[var(--muted)]">{dica.extra}</p>}
    </div>
  );
}

// Teto "redondo" com metade inteira (0 / n/2 / n), ex.: 3 -> 4, 9 -> 10, 23 -> 30.
function tetoRedondo(max: number): number {
  const bruto = Math.max(max, 1);
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  return Math.ceil(bruto / pot / 2) * 2 * pot;
}

function GraficoColunas({
  dados,
  cor,
  unidade,
}: {
  dados: Balde[];
  cor: string;
  unidade: string;
}) {
  const ALTURA = 170;
  const EIXO_Y = 36;
  const ref = useRef<HTMLDivElement>(null);
  const [dica, setDica] = useState<Dica | null>(null);

  const max = Math.max(0, ...dados.map((d) => d.valor));
  const teto = tetoRedondo(max);
  const idxMax = max > 0 ? dados.findIndex((d) => d.valor === max) : -1;
  const passo = Math.max(1, Math.ceil(dados.length / 8));

  function mostrar(i: number) {
    const larg = (ref.current?.clientWidth ?? 0) - EIXO_Y;
    const d = dados[i];
    setDica({
      x: EIXO_Y + ((i + 0.5) / dados.length) * larg,
      y: ALTURA * (1 - d.valor / teto),
      titulo: d.titulo,
      valor: `${fmt(d.valor)} ${unidade}`,
    });
  }

  return (
    <div>
      <div ref={ref} className="relative" onPointerLeave={() => setDica(null)}>
        <div className="flex" style={{ height: ALTURA }}>
          <div className="relative w-9 flex-shrink-0 text-[10px] text-[var(--muted)]">
            {[0, 0.5, 1].map((f) => (
              <span
                key={f}
                className="absolute right-2 -translate-y-1/2 tabular-nums"
                style={{ top: `${(1 - f) * 100}%` }}
              >
                {fmt(teto * f)}
              </span>
            ))}
          </div>
          <div className="relative flex flex-1 items-stretch gap-[2px]">
            {[0.5, 1].map((f) => (
              <div
                key={f}
                className="pointer-events-none absolute inset-x-0 border-t border-[var(--grid)]"
                style={{ top: `${(1 - f) * 100}%` }}
              />
            ))}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[var(--axis)]" />
            {dados.map((d, i) => (
              <div
                key={d.chave}
                tabIndex={0}
                aria-label={`${d.titulo}: ${d.valor} ${unidade}`}
                className="group relative flex flex-1 items-end justify-center outline-none"
                onPointerEnter={() => mostrar(i)}
                onFocus={() => mostrar(i)}
                onBlur={() => setDica(null)}
              >
                {i === idxMax && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-[var(--ink)]"
                    style={{ bottom: `calc(${(d.valor / teto) * 100}% + 3px)` }}
                  >
                    {fmt(d.valor)}
                  </span>
                )}
                <div
                  className="w-full max-w-[24px] rounded-t-[4px] transition group-hover:brightness-90 group-focus:brightness-90"
                  style={{ height: `${(d.valor / teto) * 100}%`, background: cor }}
                />
              </div>
            ))}
          </div>
        </div>
        <Dica dica={dica} largura={ref.current?.clientWidth ?? 0} />
      </div>
      <div className="flex" style={{ paddingLeft: EIXO_Y }}>
        {dados.map((d, i) => (
          <div key={d.chave} className="flex flex-1 justify-center pt-1.5">
            {i % passo === 0 && <span className="whitespace-nowrap text-[10px] text-[var(--muted)]">{d.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

type ItemBarra = { chave: string; nome: string; valor: number; cor?: string; extra?: string };

function ListaBarras({
  itens,
  cor,
  unidade,
  vazio = "Sem dados no período.",
}: {
  itens: ItemBarra[];
  cor: string;
  unidade: string;
  vazio?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dica, setDica] = useState<Dica | null>(null);
  const max = Math.max(1, ...itens.map((i) => i.valor));

  if (itens.length === 0) return <p className="py-6 text-center text-sm text-[var(--muted)]">{vazio}</p>;

  function mostrar(e: React.PointerEvent | React.FocusEvent, item: ItemBarra) {
    const caixa = ref.current!.getBoundingClientRect();
    const linha = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = "clientX" in e ? e.clientX - caixa.left : linha.left - caixa.left + 120;
    setDica({ x, y: linha.top - caixa.top, titulo: item.nome, valor: `${fmt(item.valor)} ${unidade}`, extra: item.extra });
  }

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setDica(null)}>
      <ul className="space-y-1.5">
        {itens.map((item) => (
          <li
            key={item.chave}
            tabIndex={0}
            aria-label={`${item.nome}: ${item.valor} ${unidade}`}
            className="group flex h-6 items-center gap-3 outline-none"
            onPointerMove={(e) => mostrar(e, item)}
            onFocus={(e) => mostrar(e, item)}
            onBlur={() => setDica(null)}
          >
            <span className="w-40 flex-shrink-0 truncate text-right text-xs text-[var(--ink-2)]" title={item.nome}>
              {item.nome}
            </span>
            <div className="relative h-full flex-1">
              <div
                className="absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-r-[4px] transition group-hover:brightness-90 group-focus:brightness-90"
                style={{ width: `${Math.max((item.valor / max) * 100, 1)}%`, background: item.cor ?? cor }}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums text-[var(--ink)]"
                style={{ left: `calc(${Math.max((item.valor / max) * 100, 1)}% + 6px)` }}
              >
                {fmt(item.valor)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <Dica dica={dica} largura={ref.current?.clientWidth ?? 0} />
    </div>
  );
}

function Tabela({ colunas, linhas }: { colunas: string[]; linhas: (string | number)[][] }) {
  if (linhas.length === 0) return <p className="py-6 text-center text-sm text-[var(--muted)]">Sem dados no período.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--grid)] text-xs uppercase text-[var(--ink-2)]">
          <tr>
            {colunas.map((c, i) => (
              <th key={c} className={`px-2 py-1.5 font-medium ${i > 0 ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b border-[var(--grid)] last:border-0">
              {l.map((v, j) => (
                <td key={j} className={`px-2 py-1.5 ${j > 0 ? "text-right tabular-nums" : ""} text-[var(--ink)]`}>
                  {typeof v === "number" ? fmt(v) : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Subtitulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-2)]">{children}</h3>
);

// ---------- Página ----------

type Visao = "graficos" | "tabelas";

export function DashboardClient() {
  const hoje = useMemo(() => localIso(), []);
  const [preset, setPreset] = useState<Preset>("30d");
  const [customInicio, setCustomInicio] = useState(() => somarDias(localIso(), -29));
  const [customFim, setCustomFim] = useState(() => localIso());
  const [visao, setVisao] = useState<Visao>("graficos");
  const [cards, setCards] = useState<CardDash[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const { inicio, fim } = preset === "custom" ? { inicio: customInicio, fim: customFim } : intervaloDoPreset(preset, hoje);
  const intervaloValido = Boolean(inicio && fim && inicio <= fim);
  const dias = intervaloValido ? diasNoPeriodo(inicio, fim) : 0;
  const antFim = intervaloValido ? somarDias(inicio, -1) : "";
  const antInicio = intervaloValido ? somarDias(antFim, -(dias - 1)) : "";

  useEffect(() => {
    if (!intervaloValido) return;
    const ctrl = new AbortController();
    setCarregando(true);
    setErro("");
    fetch(`/api/cards?inicio=${antInicio}&fim=${fim}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((dados: CardDash[]) => {
        setCards(dados);
        setCarregando(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setErro("Não foi possível carregar os dados. Tente novamente.");
        setCarregando(false);
      });
    return () => ctrl.abort();
  }, [antInicio, fim, intervaloValido]);

  const calc = useMemo(() => {
    if (!cards || !intervaloValido) return null;
    const atual = noPeriodo(cards, inicio, fim);
    const anterior = noPeriodo(cards, antInicio, antFim);

    const entregas = (lista: CardDash[]) => lista.filter((c) => isEntrega(c) && naoCancelado(c));
    const entregasAtual = entregas(atual);
    const cancAtual = atual.filter((c) => c.cancelado);
    const cancAnt = anterior.filter((c) => c.cancelado);
    const taxa = atual.length ? (cancAtual.length / atual.length) * 100 : 0;
    const taxaAnt = anterior.length ? (cancAnt.length / anterior.length) * 100 : 0;

    const veicEntregas = rankingVeiculos(entregasAtual);
    const veicTodos = rankingVeiculos(atual.filter(naoCancelado));
    const totalPorVeiculo = new Map(veicTodos.linhas.map((l) => [l.nome, l.valor]));
    const topFrota = veicEntregas.linhas.find((l) => l.frota);

    return {
      atual,
      entregasAtual,
      entregasAnt: entregas(anterior).length,
      cancAtual: cancAtual.length,
      cancAnt: cancAnt.length,
      taxa,
      taxaAnt,
      serieEntregas: serieTemporal(atual, inicio, fim, (c) => isEntrega(c) && naoCancelado(c)),
      serieCanc: serieTemporal(atual, inicio, fim, (c) => c.cancelado),
      tiposEntrega: contarPorTipo(atual, (c) => isEntrega(c) && naoCancelado(c)),
      tiposCanc: contarPorTipo(atual, (c) => c.cancelado),
      motoristas: rankingMotoristas(atual.filter(naoCancelado)),
      veicEntregas,
      totalPorVeiculo,
      topFrota,
    };
  }, [cards, inicio, fim, antInicio, antFim, intervaloValido]);

  const campo =
    "rounded-lg border border-[var(--ring)] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";

  const paraBarras = (linhas: Linha[]): ItemBarra[] => linhas.map((l) => ({ chave: l.chave, nome: l.nome, valor: l.valor }));

  return (
    <div style={VARS} className="text-[var(--ink)]">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Dashboards</h1>

      {/* Filtros: uma linha só, escopo de tudo abaixo */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Período</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className={campo}>
            {PRESETS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>
        {preset === "custom" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">De</label>
              <input type="date" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)} className={campo} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Até</label>
              <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className={campo} />
            </div>
          </>
        )}
        <p className="pb-2 text-sm text-slate-500">
          {intervaloValido ? `${ddmm(inicio)}/${inicio.slice(0, 4)} a ${ddmm(fim)}/${fim.slice(0, 4)} · ${dias} ${dias === 1 ? "dia" : "dias"}` : "Período inválido"}
        </p>
        <div className="ml-auto inline-flex rounded-lg border border-[var(--ring)] bg-white p-0.5 text-sm" role="group" aria-label="Modo de exibição">
          {(["graficos", "tabelas"] as Visao[]).map((v) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              aria-pressed={visao === v}
              className={`rounded-md px-3 py-1.5 font-medium transition ${visao === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {v === "graficos" ? "Gráficos" : "Tabelas"}
            </button>
          ))}
        </div>
      </div>

      {!intervaloValido && (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          A data inicial precisa ser anterior ou igual à data final.
        </p>
      )}

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</p>
      )}

      {intervaloValido && !calc && carregando && (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      )}

      {calc && (
        <div className={`space-y-5 transition-opacity ${carregando ? "opacity-60" : ""}`}>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <Tile
              hero
              rotulo="Entregas no período"
              valor={fmt(calc.entregasAtual.length)}
              delta={variacao(calc.entregasAtual.length, calc.entregasAnt, true)}
              anterior={fmt(calc.entregasAnt)}
            />
            <Tile
              rotulo="Cancelamentos"
              valor={fmt(calc.cancAtual)}
              delta={variacao(calc.cancAtual, calc.cancAnt, false)}
              anterior={fmt(calc.cancAnt)}
            />
            <Tile
              rotulo="Taxa de cancelamento"
              valor={`${fmt1(calc.taxa)}%`}
              delta={variacaoPontos(calc.taxa, calc.taxaAnt)}
              anterior={`${fmt1(calc.taxaAnt)}%`}
            />
            <Tile
              rotulo="Veículo mais utilizado"
              valor={calc.topFrota?.nome ?? "—"}
              sub={calc.topFrota ? `${fmt(calc.topFrota.valor)} entregas no período` : "Sem entregas com veículo"}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {/* Volume de entrega */}
            <Secao titulo="Volume de entrega" subtitulo="Serviços de entrega não cancelados, por data do agendamento">
              {visao === "graficos" ? (
                <>
                  <GraficoColunas dados={calc.serieEntregas} cor="var(--s1)" unidade="entregas" />
                  <Subtitulo>Por tipo de entrega</Subtitulo>
                  <ListaBarras itens={paraBarras(calc.tiposEntrega)} cor="var(--s1)" unidade="entregas" />
                </>
              ) : (
                <>
                  <Tabela colunas={["Período", "Entregas"]} linhas={calc.serieEntregas.map((b) => [b.titulo, b.valor])} />
                  <Subtitulo>Por tipo de entrega</Subtitulo>
                  <Tabela colunas={["Tipo", "Entregas"]} linhas={calc.tiposEntrega.map((t) => [t.nome, t.valor])} />
                </>
              )}
            </Secao>

            {/* Volume de cancelamento */}
            <Secao
              titulo="Volume de cancelamento"
              subtitulo={`${fmt(calc.cancAtual)} de ${fmt(calc.atual.length)} serviços agendados no período foram cancelados`}
            >
              {visao === "graficos" ? (
                <>
                  <GraficoColunas dados={calc.serieCanc} cor="var(--s2)" unidade="cancelamentos" />
                  <Subtitulo>Por tipo de serviço</Subtitulo>
                  <ListaBarras itens={paraBarras(calc.tiposCanc)} cor="var(--s2)" unidade="cancelamentos" vazio="Nenhum cancelamento no período." />
                </>
              ) : (
                <>
                  <Tabela colunas={["Período", "Cancelamentos"]} linhas={calc.serieCanc.map((b) => [b.titulo, b.valor])} />
                  <Subtitulo>Por tipo de serviço</Subtitulo>
                  <Tabela colunas={["Tipo", "Cancelamentos"]} linhas={calc.tiposCanc.map((t) => [t.nome, t.valor])} />
                </>
              )}
            </Secao>

            {/* Produtividade dos motoristas */}
            <Secao
              titulo="Produtividade dos motoristas"
              subtitulo="Serviços realizados (não cancelados, de qualquer tipo) por motorista. Cinza: outros/externos. Serviço com dois motoristas conta para cada um."
            >
              {visao === "graficos" ? (
                <ListaBarras
                  itens={calc.motoristas.linhas.slice(0, 12).map((m) => ({
                    chave: m.nome,
                    nome: m.nome,
                    valor: m.servicos,
                    cor: m.interno ? undefined : "var(--neutral)",
                    extra: `${fmt(m.dias)} ${m.dias === 1 ? "dia" : "dias"} com serviço · ${fmt1(m.media)} por dia`,
                  }))}
                  cor="var(--s1)"
                  unidade="serviços"
                  vazio="Nenhum serviço com motorista informado no período."
                />
              ) : (
                <Tabela
                  colunas={["Motorista", "Serviços", "Dias com serviço", "Média por dia"]}
                  linhas={calc.motoristas.linhas.map((m) => [m.nome, m.servicos, m.dias, fmt1(m.media)])}
                />
              )}
              {calc.motoristas.linhas.length > 12 && visao === "graficos" && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Mostrando os 12 primeiros de {calc.motoristas.linhas.length}. Veja todos em “Tabelas”.
                </p>
              )}
              {calc.motoristas.semMotorista > 0 && (
                <p className="mt-3 text-xs text-[var(--ink-2)]">
                  {fmt(calc.motoristas.semMotorista)} de {fmt(calc.motoristas.total)} serviços estão sem motorista informado.
                </p>
              )}
            </Secao>

            {/* Entregas por veículo */}
            <Secao
              titulo="Entregas por veículo"
              subtitulo="Entregas não canceladas por veículo. Cinza: cliente e outros. Serviço com mais de um veículo conta para cada um."
            >
              {visao === "graficos" ? (
                <ListaBarras
                  itens={calc.veicEntregas.linhas.map((v) => ({
                    chave: v.nome,
                    nome: v.nome,
                    valor: v.valor,
                    cor: v.frota ? undefined : "var(--neutral)",
                    extra: `Todos os serviços: ${fmt(calc.totalPorVeiculo.get(v.nome) ?? 0)}`,
                  }))}
                  cor="var(--s1)"
                  unidade="entregas"
                  vazio="Nenhuma entrega com veículo informado no período."
                />
              ) : (
                <Tabela
                  colunas={["Veículo", "Entregas", "Todos os serviços"]}
                  linhas={calc.veicEntregas.linhas.map((v) => [v.nome, v.valor, calc.totalPorVeiculo.get(v.nome) ?? 0])}
                />
              )}
              {calc.veicEntregas.naoInformado > 0 && (
                <p className="mt-3 text-xs text-[var(--ink-2)]">
                  {fmt(calc.veicEntregas.naoInformado)} de {fmt(calc.veicEntregas.total)} entregas (
                  {fmt1((calc.veicEntregas.naoInformado / Math.max(calc.veicEntregas.total, 1)) * 100)}%) estão sem veículo informado.
                </p>
              )}
            </Secao>
          </div>
        </div>
      )}
    </div>
  );
}
