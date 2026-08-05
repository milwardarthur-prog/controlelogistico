"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Loader2, FileText, Wrench } from "lucide-react";
import {
  formatarData,
  nomeDiaSemana,
  chaveData,
  labelTipo,
  type TipoCard,
} from "@/lib/utils";

type Card = {
  id: string;
  tipo: TipoCard;
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

type Modo = "COMPLETO" | "EQUIPAMENTOS";

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

// Verifica se um valor de campo está preenchido
function preenchido(v?: string | null): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function ImpressaoClient() {
  const [modo, setModo] = useState<Modo>("COMPLETO");
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
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Modo Impressão</h1>
        <p className="mb-4 text-sm text-slate-500">
          Selecione o tipo de relatório e o intervalo de datas
        </p>

        {/* Seletor de tipo de relatório */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setModo("COMPLETO")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              modo === "COMPLETO"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-600"
            }`}
          >
            <FileText className="h-4 w-4" /> Relatório Completo
          </button>
          <button
            onClick={() => setModo("EQUIPAMENTOS")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              modo === "EQUIPAMENTOS"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-600"
            }`}
          >
            <Wrench className="h-4 w-4" /> Relatório de Equipamentos (Manutenção)
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
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
      ) : modo === "COMPLETO" ? (
        <RelatorioCompleto grupos={grupos} inicio={inicio} fim={fim} />
      ) : (
        <RelatorioEquipamentos grupos={grupos} inicio={inicio} fim={fim} />
      )}
    </div>
  );
}

/* ============ Relatório Completo (todos os campos, ocultando vazios) ============ */
function RelatorioCompleto({
  grupos,
  inicio,
  fim,
}: {
  grupos: [string, Card[]][];
  inicio: string;
  fim: string;
}) {
  return (
    <div className="print-area space-y-8">
      <h2 className="hidden text-center text-xl font-bold print:block">
        Cronograma Logístico — {formatarData(inicio)} a {formatarData(fim)}
      </h2>
      {grupos.map(([data, lista]) => (
        <section key={data} className="print-dia">
          <h3 className="mb-3 border-b-2 border-slate-900 pb-1 text-xl font-bold text-slate-900">
            {nomeDiaSemana(data)} — {formatarData(data)}
          </h3>
          <div className="space-y-5">
            {lista.map((c) => (
              <CardCompleto key={c.id} card={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CardCompleto({ card: c }: { card: Card }) {
  // Linhas de campo com meia largura (pares) — só entram se preenchidas
  const paresBase: [string, string | null | undefined][] = [
    ["TENSÃO", c.tensao],
    ["VEÍCULO", c.veiculo],
    ["PERÍODO", c.periodo],
    ["FRANQUIA", c.franquia],
    ["COMBUSTÍVEL", c.combustivel],
    ["TÉCNICO", c.motorista],
    ["AJUDANTE", c.ajudante],
  ];
  const pares = paresBase.filter(([, v]) => preenchido(v));

  // Campos de largura total — só entram se preenchidos
  const totaisBase: [string, string | null | undefined][] = [
    ["INSTALAÇÃO", c.instalacao],
    ["ACESSÓRIOS", c.acessorios],
    ["OBS", c.obs],
  ];
  const totais = totaisBase.filter(([, v]) => preenchido(v));

  return (
    <table className="print-card w-full border-collapse border-2 border-slate-900 text-base">
      <tbody>
        {c.cancelado && (
          <tr>
            <td
              colSpan={4}
              className="border-2 border-slate-900 bg-red-600 px-3 py-1.5 text-center text-lg font-black tracking-widest text-white"
            >
              CANCELADO
            </td>
          </tr>
        )}
        {/* Cabeçalho sempre presente */}
        <tr>
          <td className="w-1/4 border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold">DATA</td>
          <td className="w-1/4 border-2 border-slate-900 px-3 py-2">{formatarData(c.data)}</td>
          <td className="w-1/4 border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold">TIPO</td>
          <td className="w-1/4 border-2 border-slate-900 px-3 py-2">{labelTipo(c.tipo)}</td>
        </tr>
        <tr>
          <td className="border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold">HORÁRIO</td>
          <td className="border-2 border-slate-900 px-3 py-2">{c.horario}</td>
          <td className="border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold">CLIENTE</td>
          <td className="border-2 border-slate-900 px-3 py-2">{c.cliente}</td>
        </tr>
        <tr>
          <td className="border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold">EQUIPAMENTO</td>
          <td className="border-2 border-slate-900 px-3 py-2" colSpan={3}>{c.equipamento}</td>
        </tr>
        {/* Pares opcionais — dois por linha, ocultando vazios */}
        {Array.from({ length: Math.ceil(pares.length / 2) }).map((_, i) => {
          const a = pares[i * 2];
          const b = pares[i * 2 + 1];
          return (
            <tr key={`par-${i}`}>
              <td className="border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold">{a[0]}</td>
              <td className="border-2 border-slate-900 px-3 py-2">{a[1]}</td>
              {b ? (
                <>
                  <td className="border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold">{b[0]}</td>
                  <td className="border-2 border-slate-900 px-3 py-2">{b[1]}</td>
                </>
              ) : (
                <td className="border-2 border-slate-900 px-3 py-2" colSpan={2} />
              )}
            </tr>
          );
        })}
        {/* LOCAL sempre presente (obrigatório) */}
        <tr>
          <td className="border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold align-top">LOCAL</td>
          <td className="border-2 border-slate-900 px-3 py-2" colSpan={3}>{c.local}</td>
        </tr>
        {/* Campos de largura total opcionais */}
        {totais.map(([rotulo, valor]) => (
          <tr key={rotulo}>
            <td className="border-2 border-slate-900 bg-slate-100 px-3 py-2 font-bold align-top">{rotulo}</td>
            <td className="whitespace-pre-line border-2 border-slate-900 px-3 py-2" colSpan={3}>{valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ====== Relatório de Equipamentos (para Manutenção) ======
   Apenas: Data, Equipamento, Tensão, Acessórios e OBS.       */
function RelatorioEquipamentos({
  grupos,
  inicio,
  fim,
}: {
  grupos: [string, Card[]][];
  inicio: string;
  fim: string;
}) {
  return (
    <div className="print-area space-y-8">
      <h2 className="text-center text-xl font-bold">
        Relatório de Equipamentos Escalados — Manutenção
      </h2>
      <p className="text-center text-sm text-slate-500 print:text-black">
        Período: {formatarData(inicio)} a {formatarData(fim)}
      </p>
      {grupos.map(([data, lista]) => (
        <section key={data} className="print-dia">
          <h3 className="mb-3 border-b-2 border-slate-900 pb-1 text-xl font-bold text-slate-900">
            {nomeDiaSemana(data)} — {formatarData(data)}
          </h3>
          <table className="w-full border-collapse border-2 border-slate-900 text-base">
            <thead>
              <tr>
                <th className="border-2 border-slate-900 bg-slate-200 px-3 py-2 text-left font-bold">EQUIPAMENTO</th>
                <th className="w-24 border-2 border-slate-900 bg-slate-200 px-3 py-2 text-left font-bold">TENSÃO</th>
                <th className="border-2 border-slate-900 bg-slate-200 px-3 py-2 text-left font-bold">ACESSÓRIOS</th>
                <th className="border-2 border-slate-900 bg-slate-200 px-3 py-2 text-left font-bold">OBS</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className={c.cancelado ? "line-through opacity-60" : ""}>
                  <td className="border-2 border-slate-900 px-3 py-2 font-semibold">
                    {c.equipamento}
                    {c.cancelado && <span className="ml-1 font-black text-red-600">(CANCELADO)</span>}
                  </td>
                  <td className="border-2 border-slate-900 px-3 py-2">{preenchido(c.tensao) ? c.tensao : "—"}</td>
                  <td className="whitespace-pre-line border-2 border-slate-900 px-3 py-2">{preenchido(c.acessorios) ? c.acessorios : "—"}</td>
                  <td className="whitespace-pre-line border-2 border-slate-900 px-3 py-2">{preenchido(c.obs) ? c.obs : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
