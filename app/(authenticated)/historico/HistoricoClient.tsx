"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  formatarData,
  labelTipo,
  labelAtendimento,
  TIPO_BADGE_TV,
  ATENDIMENTO_BADGE,
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
  cancelado: boolean;
  createdBy?: { name: string } | null;
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export function HistoricoClient() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState(hojeIso());
  const [cliente, setCliente] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [motorista, setMotorista] = useState("");
  const [tipo, setTipo] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const params = new URLSearchParams();
    if (dataInicio) params.set("inicio", dataInicio);
    if (dataFim) params.set("fim", dataFim);
    const res = await fetch(`/api/cards?${params.toString()}`);
    const dados: Card[] = await res.json();
    setCards(dados);
    setCarregando(false);
  }, [dataInicio, dataFim]);

  // Carga inicial: por padrão mostra cards com data < hoje (ordenados desc)
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtros aplicados no cliente (texto/tipo) + ordenação por data desc
  const filtrados = useMemo(() => {
    const hoje = hojeIso();
    return cards
      .filter((c) => {
        // Por padrão (sem data início definida) mostra apenas passados
        if (!dataInicio && c.data.slice(0, 10) >= hoje) return false;
        if (cliente && !c.cliente.toLowerCase().includes(cliente.toLowerCase()))
          return false;
        if (
          equipamento &&
          !c.equipamento.toLowerCase().includes(equipamento.toLowerCase())
        )
          return false;
        if (
          motorista &&
          !(c.motorista ?? "").toLowerCase().includes(motorista.toLowerCase())
        )
          return false;
        if (tipo && c.tipo !== tipo) return false;
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [cards, dataInicio, cliente, equipamento, motorista, tipo]);

  const campo =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";
  const label = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Histórico</h1>

      {/* Filtros */}
      <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className={label}>Data início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label className={label}>Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label className={label}>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
            <option value="">Todos</option>
            {(Object.keys(TIPO_LABELS) as TipoCard[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Cliente</label>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={label}>Equipamento</label>
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label className={label}>Motorista</label>
          <input
            value={motorista}
            onChange={(e) => setMotorista(e.target.value)}
            className={campo}
          />
        </div>
        <div className="sm:col-span-3">
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {carregando ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : filtrados.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nenhum registro encontrado para os filtros selecionados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Atend.</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Equipamento</th>
                <th className="px-3 py-2">Veículo</th>
                <th className="px-3 py-2">Motorista</th>
                <th className="px-3 py-2">Ajudante</th>
                <th className="px-3 py-2">Criado por</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-100 ${c.cancelado ? "opacity-50 line-through" : ""}`}
                >
                  <td className="whitespace-nowrap px-3 py-2">{formatarData(c.data)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${TIPO_BADGE_TV[c.tipo]}`}
                    >
                      {labelTipo(c.tipo)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${ATENDIMENTO_BADGE[c.tipoAtendimento]}`}
                    >
                      {labelAtendimento(c.tipoAtendimento)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">{c.cliente}</td>
                  <td className="px-3 py-2 text-slate-600">{c.equipamento}</td>
                  <td className="px-3 py-2 text-slate-600">{c.veiculo || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{c.motorista || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{c.ajudante || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{c.createdBy?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
