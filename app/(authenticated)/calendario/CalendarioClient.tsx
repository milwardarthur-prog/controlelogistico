"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Wrench } from "lucide-react";
import {
  formatarData,
  chaveData,
  labelTipo,
  labelAtendimento,
  TIPO_BADGE_TV,
  ATENDIMENTO_BADGE,
  TIPO_PONTO,
  TIPO_LABELS,
  type TipoCard,
  type TipoAtendimento,
} from "@/lib/utils";

type Card = {
  id: string;
  tipo: TipoCard;
  tipoAtendimento: TipoAtendimento;
  data: string;
  horario: string;
  cliente: string;
  equipamento: string;
  veiculo?: string | null;
  local: string;
  motorista?: string | null;
  ajudante?: string | null;
  acessorios?: string | null;
  obs?: string | null;
  numeroContrato?: string | null;
  numeroOrcamento?: string | null;
  cancelado: boolean;
  comercialOk: boolean;
  logisticaOk: boolean;
  administrativoOk: boolean;
  manutencaoOk: boolean;
  createdBy?: { name: string } | null;
};

type Manutencao = {
  id: string;
  veiculo: string;
  inicio: string;
  fim: string;
  obs?: string | null;
};

const DIAS_CABECALHO = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

// Retorna a segunda-feira (UTC) da semana que contém a data informada
function segundaDaSemana(base: Date): Date {
  const dia = base.getUTCDay(); // 0=dom
  const diffParaSegunda = dia === 0 ? -6 : 1 - dia;
  const segunda = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  );
  segunda.setUTCDate(segunda.getUTCDate() + diffParaSegunda);
  return segunda;
}

export function CalendarioClient() {
  const hojeIso = new Date().toISOString().slice(0, 10);
  // offset em semanas a partir da semana atual
  const [offset, setOffset] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [cardSelecionado, setCardSelecionado] = useState<Card | null>(null);

  // Primeiro dia exibido: segunda-feira da semana atual + offset
  const primeiroDia = useMemo(() => {
    const seg = segundaDaSemana(new Date());
    seg.setUTCDate(seg.getUTCDate() + offset * 7);
    return seg;
  }, [offset]);

  // 14 dias (2 semanas)
  const dias = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(primeiroDia);
      d.setUTCDate(primeiroDia.getUTCDate() + i);
      arr.push(d);
    }
    return arr;
  }, [primeiroDia]);

  const inicio = useMemo(() => primeiroDia.toISOString().slice(0, 10), [primeiroDia]);
  const fim = useMemo(() => dias[13].toISOString().slice(0, 10), [dias]);

  const carregar = useCallback(async () => {
    const [resCards, resManut] = await Promise.all([
      fetch(`/api/cards?inicio=${inicio}&fim=${fim}`),
      fetch(`/api/manutencao`),
    ]);
    setCards(await resCards.json());
    if (resManut.ok) setManutencoes(await resManut.json());
  }, [inicio, fim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Mapa data -> cards
  const porDia = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards) {
      const k = chaveData(c.data);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [cards]);

  // Retorna manutenções ativas em uma determinada data (dia dentro do período)
  const manutencaoDoDia = useCallback(
    (iso: string) =>
      manutencoes.filter((m) => {
        const ini = chaveData(m.inicio);
        const f = chaveData(m.fim);
        return iso >= ini && iso <= f;
      }),
    [manutencoes]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Calendário</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span className="text-center text-sm font-semibold text-slate-900">
            {formatarData(inicio)} – {formatarData(fim)}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </button>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-xl border border-slate-200 bg-white p-2">
        {DIAS_CABECALHO.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-bold text-slate-400">
            {d}
          </div>
        ))}
        {dias.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          const lista = porDia.get(iso) ?? [];
          const manuts = manutencaoDoDia(iso);
          const isHoje = iso === hojeIso;
          return (
            <div
              key={iso}
              className={`flex min-h-[130px] flex-col gap-1 rounded-lg border p-1.5 ${
                isHoje ? "border-slate-900 bg-slate-900/5" : "border-slate-200"
              }`}
            >
              <span
                className={`text-xs font-semibold ${isHoje ? "text-slate-900" : "text-slate-500"}`}
              >
                {d.getUTCDate().toString().padStart(2, "0")}/
                {(d.getUTCMonth() + 1).toString().padStart(2, "0")}
              </span>

              {/* Manutenções de veículo no topo (vermelho) */}
              {manuts.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white"
                  title={m.obs ?? undefined}
                >
                  <Wrench className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">{m.veiculo}</span>
                </div>
              ))}

              {/* Prévias dos cards */}
              {lista.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCardSelecionado(c)}
                  className={`rounded border border-slate-200 p-1 text-left transition hover:border-slate-400 ${
                    c.cancelado ? "opacity-50 line-through" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-0.5">
                    <span
                      className={`rounded px-1 py-px text-[8px] font-bold uppercase text-white ${TIPO_BADGE_TV[c.tipo]}`}
                    >
                      {labelTipo(c.tipo)}
                    </span>
                    <span
                      className={`rounded px-1 py-px text-[8px] font-bold uppercase text-white ${ATENDIMENTO_BADGE[c.tipoAtendimento]}`}
                    >
                      {labelAtendimento(c.tipoAtendimento)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-slate-800">
                    {c.cliente}
                  </p>
                  {c.veiculo && (
                    <p className="truncate text-[10px] text-slate-500">🚚 {c.veiculo}</p>
                  )}
                  {c.motorista && (
                    <p className="truncate text-[10px] text-slate-500">{c.motorista}</p>
                  )}
                  <p className="truncate text-[10px] text-slate-400">{c.equipamento}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span
                      className={`h-2 w-2 rounded-full ${c.comercialOk ? "bg-emerald-500" : "bg-yellow-400"}`}
                      title="Comercial"
                    />
                    <span
                      className={`h-2 w-2 rounded-full ${c.logisticaOk ? "bg-emerald-500" : "bg-yellow-400"}`}
                      title="Logística"
                    />
                    <span
                      className={`h-2 w-2 rounded-full ${c.administrativoOk ? "bg-emerald-500" : "bg-yellow-400"}`}
                      title="Administrativo"
                    />
                    <span
                      className={`h-2 w-2 rounded-full ${c.manutencaoOk ? "bg-emerald-500" : "bg-red-500"}`}
                      title="Manutenção"
                    />
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        {(Object.keys(TIPO_LABELS) as TipoCard[]).map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${TIPO_PONTO[t]}`} /> {TIPO_LABELS[t]}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <Wrench className="h-3 w-3 text-red-600" /> Manutenção de veículo
        </span>
      </div>

      {/* Modal com detalhes do card */}
      {cardSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCardSelecionado(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${TIPO_BADGE_TV[cardSelecionado.tipo]}`}
                >
                  {labelTipo(cardSelecionado.tipo)}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${ATENDIMENTO_BADGE[cardSelecionado.tipoAtendimento]}`}
                >
                  {labelAtendimento(cardSelecionado.tipoAtendimento)}
                </span>
              </div>
              <button
                onClick={() => setCardSelecionado(null)}
                className="rounded p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cardSelecionado.cancelado && (
              <span className="mb-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                CANCELADO
              </span>
            )}

            <h3 className="text-xl font-bold text-slate-900">{cardSelecionado.cliente}</h3>
            <p className="mb-3 text-sm text-slate-500">
              {formatarData(cardSelecionado.data)} — {cardSelecionado.horario}
            </p>

            <dl className="space-y-1.5 text-sm">
              <Linha rotulo="Equipamento" valor={cardSelecionado.equipamento} />
              <Linha rotulo="Veículo" valor={cardSelecionado.veiculo} />
              <Linha rotulo="Motorista" valor={cardSelecionado.motorista} />
              <Linha rotulo="Ajudante" valor={cardSelecionado.ajudante} />
              <Linha rotulo="Local" valor={cardSelecionado.local} />
              <Linha rotulo="Nº Contrato" valor={cardSelecionado.numeroContrato} />
              <Linha rotulo="Nº Orçamento" valor={cardSelecionado.numeroOrcamento} />
              <Linha rotulo="Acessórios" valor={cardSelecionado.acessorios} />
              <Linha rotulo="OBS" valor={cardSelecionado.obs} />
            </dl>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm font-semibold">
              <span className="flex items-center gap-1">
                <span
                  className={`h-3 w-3 rounded-full ${cardSelecionado.comercialOk ? "bg-emerald-500" : "bg-yellow-400"}`}
                />
                Comercial
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={`h-3 w-3 rounded-full ${cardSelecionado.logisticaOk ? "bg-emerald-500" : "bg-yellow-400"}`}
                />
                Logística
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={`h-3 w-3 rounded-full ${cardSelecionado.administrativoOk ? "bg-emerald-500" : "bg-yellow-400"}`}
                />
                Administrativo
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={`h-3 w-3 rounded-full ${cardSelecionado.manutencaoOk ? "bg-emerald-500" : "bg-red-500"}`}
                />
                {cardSelecionado.manutencaoOk ? "Manutenção OK" : "Manutenção N/OK"}
              </span>
            </div>

            {cardSelecionado.createdBy?.name && (
              <p className="mt-2 text-xs text-slate-400">
                Criado por: {cardSelecionado.createdBy.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-28 flex-shrink-0 font-semibold text-slate-500">{rotulo}:</dt>
      <dd className="whitespace-pre-line text-slate-800">{valor}</dd>
    </div>
  );
}
