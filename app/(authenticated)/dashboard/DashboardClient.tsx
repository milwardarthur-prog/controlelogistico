"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  Ban,
  RotateCcw,
  Loader2,
  Trash2,
  Tag,
  Save,
} from "lucide-react";
import {
  formatarData,
  nomeDiaSemana,
  chaveData,
  labelTipo,
  labelAtendimento,
  TIPO_BADGE_TV,
  ATENDIMENTO_BADGE,
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
  docOk: boolean;
  entregaOk: boolean;
  createdBy?: { name: string } | null;
  createdAt: string;
};

// Retorna intervalo [segunda, domingo] da semana atual (offset em semanas)
function intervaloSemana(offsetSemanas: number) {
  const hoje = new Date();
  const dia = hoje.getUTCDay(); // 0=dom
  const diffParaSegunda = dia === 0 ? -6 : 1 - dia;
  const segunda = new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  );
  segunda.setUTCDate(segunda.getUTCDate() + diffParaSegunda + offsetSemanas * 7);
  const domingo = new Date(segunda);
  domingo.setUTCDate(segunda.getUTCDate() + 6);
  return {
    inicio: segunda.toISOString().slice(0, 10),
    fim: domingo.toISOString().slice(0, 10),
  };
}

export function DashboardClient({ role }: { role: "ADMIN" | "TECNICO" }) {
  const [offset, setOffset] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [carregando, setCarregando] = useState(true);

  const { inicio, fim } = useMemo(() => intervaloSemana(offset), [offset]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch(`/api/cards?inicio=${inicio}&fim=${fim}`);
    const dados = await res.json();
    setCards(dados);
    setCarregando(false);
  }, [inicio, fim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Agrupa cards por data
  const grupos = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards) {
      const k = chaveData(c.data);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cards]);

  async function cancelarToggle(card: Card) {
    await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelado: !card.cancelado }),
    });
    carregar();
  }

  // Alterna sinaleiro (docOk ou entregaOk) com atualização otimista
  async function toggleSinaleiro(card: Card, campo: "docOk" | "entregaOk") {
    const novoValor = !card[campo];
    // Atualização otimista do estado local
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, [campo]: novoValor } : c))
    );
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: novoValor }),
    });
    if (!res.ok) {
      // Reverte em caso de erro
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, [campo]: !novoValor } : c))
      );
    }
  }

  // Exclui permanentemente o card (para lançamentos duplicados)
  async function excluir(card: Card) {
    const ok = window.confirm(
      `Excluir permanentemente o card de "${card.cliente}"?\n\nEsta ação NÃO pode ser desfeita e o card será removido definitivamente. Para apenas marcar como cancelado (mantendo o histórico), use o botão "Cancelar".`
    );
    if (!ok) return;
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {formatarData(inicio)} — {formatarData(fim)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset(0)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              offset === 0 ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-300"
            }`}
          >
            Semana atual
          </button>
          <button
            onClick={() => setOffset(1)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              offset === 1 ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-300"
            }`}
          >
            Próxima semana
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : grupos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nenhum card para o período selecionado.
        </p>
      ) : (
        <div className="space-y-6">
          {grupos.map(([data, lista]) => (
            <div key={data}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
                {nomeDiaSemana(data)} — {formatarData(data)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lista.map((card) => (
                  <CardBox
                    key={card.id}
                    card={card}
                    role={role}
                    onCancelar={() => cancelarToggle(card)}
                    onExcluir={() => excluir(card)}
                    onSalvar={carregar}
                    onToggleSinaleiro={(campo) => toggleSinaleiro(card, campo)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardBox({
  card,
  role,
  onCancelar,
  onExcluir,
  onSalvar,
  onToggleSinaleiro,
}: {
  card: Card;
  role: "ADMIN" | "TECNICO";
  onCancelar: () => void;
  onExcluir: () => void;
  onSalvar: () => void;
  onToggleSinaleiro: (campo: "docOk" | "entregaOk") => void;
}) {
  const [motorista, setMotorista] = useState(card.motorista ?? "");
  const [ajudante, setAjudante] = useState(card.ajudante ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvarEquipe() {
    setSalvando(true);
    await fetch(`/api/cards/${card.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motorista, ajudante }),
    });
    setSalvando(false);
    onSalvar();
  }

  return (
    <div
      className={`relative rounded-xl border bg-white p-4 shadow-sm ${
        card.cancelado ? "border-red-200" : "border-slate-200"
      }`}
    >
      {card.cancelado && (
        <span className="absolute right-3 top-3 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
          CANCELADO
        </span>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Tag className="h-3.5 w-3.5 text-slate-400" />
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${TIPO_BADGE_TV[card.tipo]}`}
        >
          {labelTipo(card.tipo)}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${ATENDIMENTO_BADGE[card.tipoAtendimento]}`}
        >
          {labelAtendimento(card.tipoAtendimento)}
        </span>
        <span className="ml-auto text-sm font-bold text-slate-900">
          {card.horario}
        </span>
      </div>

      <p className="text-base font-bold text-slate-900">{card.cliente}</p>
      <p className="text-sm text-slate-600">{card.equipamento}</p>
      <p className="mt-1 text-xs text-slate-500">{card.local}</p>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-500">
        {card.veiculo && <span>Veículo: {card.veiculo}</span>}
        {card.tensao && <span>Tensão: {card.tensao}</span>}
        {card.periodo && <span>Período: {card.periodo}</span>}
        {card.franquia && <span>Franquia: {card.franquia}</span>}
      </div>

      {card.createdBy?.name && (
        <p className="mt-1 text-[11px] text-slate-400">
          Criado por: {card.createdBy.name}
        </p>
      )}

      {/* Sinaleiros clicáveis: Documentos e Entrega/Retirada */}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onToggleSinaleiro("docOk")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
            card.docOk
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-yellow-300 bg-yellow-50 text-yellow-700"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${card.docOk ? "bg-emerald-500" : "bg-yellow-400"}`}
          />
          📄 Documentos
        </button>
        <button
          type="button"
          onClick={() => onToggleSinaleiro("entregaOk")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
            card.entregaOk
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-yellow-300 bg-yellow-50 text-yellow-700"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${card.entregaOk ? "bg-emerald-500" : "bg-yellow-400"}`}
          />
          🚚 Entrega/Retirada
        </button>
      </div>

      {card.acessorios && (
        <p className="mt-2 whitespace-pre-line rounded bg-slate-50 p-2 text-xs text-slate-600">
          <span className="font-semibold">Acessórios: </span>
          {card.acessorios}
        </p>
      )}
      {card.obs && (
        <p className="mt-1 text-xs italic text-slate-500">Obs: {card.obs}</p>
      )}

      {/* Campos de equipe */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        {role === "TECNICO" ? (
          <div className="space-y-2">
            <input
              value={motorista}
              onChange={(e) => setMotorista(e.target.value)}
              placeholder="Motorista"
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <input
              value={ajudante}
              onChange={(e) => setAjudante(e.target.value)}
              placeholder="Ajudante"
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <button
              onClick={salvarEquipe}
              disabled={salvando}
              className="flex w-full items-center justify-center gap-1 rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              {salvando ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Salvar equipe
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            <p>Motorista: {card.motorista || "—"}</p>
            <p>Ajudante: {card.ajudante || "—"}</p>
          </div>
        )}
      </div>

      {role === "ADMIN" && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Link
              href={`/cards/${card.id}/editar`}
              className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-3 w-3" /> Editar
            </Link>
            <button
              onClick={onCancelar}
              className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                card.cancelado
                  ? "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  : "border border-red-300 text-red-700 hover:bg-red-50"
              }`}
            >
              {card.cancelado ? (
                <>
                  <RotateCcw className="h-3 w-3" /> Reativar
                </>
              ) : (
                <>
                  <Ban className="h-3 w-3" /> Cancelar
                </>
              )}
            </button>
          </div>
          {/* Excluir é permanente (diferente de cancelar) — para duplicatas */}
          <button
            onClick={onExcluir}
            className="flex w-full items-center justify-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-3 w-3" /> Excluir permanentemente
          </button>
        </div>
      )}
    </div>
  );
}
