"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { formatarData, nomeDiaSemana, chaveData } from "@/lib/utils";

type Card = {
  id: string;
  tipo: "ENTREGA" | "RETIRADA";
  data: string;
  horario: string;
  cliente: string;
  equipamento: string;
  tensao?: string | null;
  veiculo?: string | null;
  periodo?: string | null;
  franquia?: string | null;
  local: string;
  combustivel?: string | null;
  instalacao?: string | null;
  acessorios?: string | null;
  obs?: string | null;
  motorista?: string | null;
  ajudante?: string | null;
  cancelado: boolean;
};

// Segunda-feira da semana atual
function segundaAtual() {
  const hoje = new Date();
  const dia = hoje.getUTCDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const seg = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  seg.setUTCDate(seg.getUTCDate() + diff);
  return seg.toISOString().slice(0, 10);
}

function addDias(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ImpressaoClient() {
  const [inicio, setInicio] = useState(segundaAtual());
  const [fim, setFim] = useState(addDias(segundaAtual(), 6));
  const [cards, setCards] = useState<Card[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch(`/api/cards?inicio=${inicio}&fim=${fim}`);
    setCards(await res.json());
    setCarregando(false);
  }, [inicio, fim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const grupos = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards) {
      const k = chaveData(c.data);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cards]);

  return (
    <div>
      {/* Barra de controle - oculta na impressão */}
      <div className="mb-6 flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modo Impressão</h1>
          <p className="text-sm text-slate-500">Selecione o intervalo de datas</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">De</label>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Até</label>
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-slate-500 print:hidden">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : grupos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500 print:hidden">
          Nenhum card no intervalo selecionado.
        </p>
      ) : (
        <div className="print-area space-y-6">
          {grupos.map(([data, lista]) => (
            <section key={data} className="break-inside-avoid">
              <h2 className="mb-2 border-b-2 border-slate-900 pb-1 text-lg font-bold text-slate-900">
                {nomeDiaSemana(data)} — {formatarData(data)}
              </h2>
              <div className="space-y-3">
                {lista.map((c) => (
                  <table key={c.id} className="w-full border-collapse border border-slate-800 text-xs">
                    <tbody>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">DATA</td>
                        <td className="border border-slate-800 px-2 py-1">{formatarData(c.data)}</td>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">TIPO</td>
                        <td className="border border-slate-800 px-2 py-1">{c.tipo}{c.cancelado ? " (CANCELADO)" : ""}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">HORÁRIO</td>
                        <td className="border border-slate-800 px-2 py-1">{c.horario}</td>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">CLIENTE</td>
                        <td className="border border-slate-800 px-2 py-1">{c.cliente}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">EQUIPAMENTO</td>
                        <td className="border border-slate-800 px-2 py-1">{c.equipamento}</td>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">TENSÃO</td>
                        <td className="border border-slate-800 px-2 py-1">{c.tensao || "—"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">VEÍCULO</td>
                        <td className="border border-slate-800 px-2 py-1">{c.veiculo || "—"}</td>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">TÉCNICO</td>
                        <td className="border border-slate-800 px-2 py-1">{c.motorista || "—"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">PERÍODO</td>
                        <td className="border border-slate-800 px-2 py-1">{c.periodo || "—"}</td>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">FRANQUIA</td>
                        <td className="border border-slate-800 px-2 py-1">{c.franquia || "—"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">LOCAL</td>
                        <td className="border border-slate-800 px-2 py-1" colSpan={3}>{c.local}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">COMBUSTÍVEL</td>
                        <td className="border border-slate-800 px-2 py-1">{c.combustivel || "—"}</td>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">AJUDANTE</td>
                        <td className="border border-slate-800 px-2 py-1">{c.ajudante || "—"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold">INSTALAÇÃO</td>
                        <td className="border border-slate-800 px-2 py-1" colSpan={3}>{c.instalacao || "—"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold align-top">ACESSÓRIOS</td>
                        <td className="border border-slate-800 px-2 py-1 whitespace-pre-line" colSpan={3}>{c.acessorios || "—"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 bg-slate-100 px-2 py-1 font-bold align-top">OBS</td>
                        <td className="border border-slate-800 px-2 py-1 whitespace-pre-line" colSpan={3}>{c.obs || "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
