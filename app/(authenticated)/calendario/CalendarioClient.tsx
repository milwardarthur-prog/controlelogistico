"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MESES, formatarData, chaveData } from "@/lib/utils";

type Card = {
  id: string;
  tipo: "ENTREGA" | "RETIRADA";
  data: string;
  horario: string;
  cliente: string;
  equipamento: string;
  local: string;
  cancelado: boolean;
};

export function CalendarioClient() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getUTCFullYear());
  const [mes, setMes] = useState(hoje.getUTCMonth()); // 0-11
  const [cards, setCards] = useState<Card[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const inicio = useMemo(
    () => new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10),
    [ano, mes]
  );
  const fim = useMemo(
    () => new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10),
    [ano, mes]
  );

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/cards?inicio=${inicio}&fim=${fim}`);
    setCards(await res.json());
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

  const primeiroDiaSemana = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  const cardsDoDia = diaSelecionado ? porDia.get(diaSelecionado) ?? [] : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Calendário</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => mudarMes(-1)} className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-40 text-center font-semibold text-slate-900">
            {MESES[mes]} {ano}
          </span>
          <button onClick={() => mudarMes(1)} className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-xl border border-slate-200 bg-white p-2">
        {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-bold text-slate-400">
            {d}
          </div>
        ))}
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`v-${i}`} />;
          const k = new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);
          const lista = porDia.get(k) ?? [];
          const temCards = lista.length > 0;
          const isHoje =
            dia === hoje.getUTCDate() &&
            mes === hoje.getUTCMonth() &&
            ano === hoje.getUTCFullYear();
          return (
            <button
              key={k}
              onClick={() => temCards && setDiaSelecionado(k)}
              className={`flex min-h-[72px] flex-col rounded-lg border p-1.5 text-left transition ${
                temCards ? "cursor-pointer border-slate-200 hover:border-slate-900" : "border-transparent"
              } ${isHoje ? "bg-slate-900/5 ring-1 ring-slate-900" : ""}`}
            >
              <span className={`text-xs font-semibold ${isHoje ? "text-slate-900" : "text-slate-600"}`}>
                {dia}
              </span>
              {temCards && (
                <div className="mt-auto flex flex-wrap gap-0.5">
                  {lista.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className={`h-1.5 w-1.5 rounded-full ${
                        c.cancelado ? "bg-red-400" : c.tipo === "ENTREGA" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                  ))}
                  {lista.length > 3 && (
                    <span className="text-[10px] font-medium text-slate-500">
                      +{lista.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Entrega</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Retirada</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Cancelado</span>
      </div>

      {/* Modal com os cards do dia */}
      {diaSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDiaSelecionado(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {formatarData(diaSelecionado)}
              </h3>
              <button onClick={() => setDiaSelecionado(null)} className="rounded p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {cardsDoDia.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{c.cliente}</span>
                    <span className="text-sm text-slate-500">{c.horario}</span>
                  </div>
                  <p className="text-sm text-slate-600">{c.equipamento}</p>
                  <p className="text-xs text-slate-500">{c.local}</p>
                  {c.cancelado && (
                    <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                      CANCELADO
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
