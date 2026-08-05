"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Wrench } from "lucide-react";
import { formatarData, chaveData } from "@/lib/utils";

type Manutencao = {
  id: string;
  veiculo: string;
  inicio: string;
  fim: string;
  obs?: string | null;
};

export function ManutencaoClient() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [veiculo, setVeiculo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [obs, setObs] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/manutencao");
    if (res.ok) setManutencoes(await res.json());
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!veiculo || !inicio || !fim) {
      setErro("Preencha veículo, data de início e data de fim.");
      return;
    }
    if (fim < inicio) {
      setErro("A data de fim não pode ser anterior à data de início.");
      return;
    }
    setSalvando(true);
    const res = await fetch("/api/manutencao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ veiculo, inicio, fim, obs }),
    });
    setSalvando(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErro(j.error || "Erro ao adicionar manutenção.");
      return;
    }
    setVeiculo("");
    setInicio("");
    setFim("");
    setObs("");
    carregar();
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir esta manutenção?")) return;
    await fetch(`/api/manutencao/${id}`, { method: "DELETE" });
    carregar();
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const campo =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";
  const label = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900">
        <Wrench className="h-6 w-6 text-red-600" /> Manutenção de Veículos
      </h1>

      {/* Formulário */}
      <form
        onSubmit={adicionar}
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
      >
        <div>
          <label className={label}>Veículo *</label>
          <input
            value={veiculo}
            onChange={(e) => setVeiculo(e.target.value)}
            placeholder="17-180"
            className={campo}
          />
        </div>
        <div>
          <label className={label}>Observação</label>
          <input value={obs} onChange={(e) => setObs(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={label}>Data início *</label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label className={label}>Data fim *</label>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className={campo}
          />
        </div>
        {erro && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {erro}
          </p>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Adicionar
          </button>
        </div>
      </form>

      {/* Listagem */}
      {carregando ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : manutencoes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nenhuma manutenção cadastrada.
        </p>
      ) : (
        <div className="space-y-2">
          {manutencoes.map((m) => {
            const ini = chaveData(m.inicio);
            const f = chaveData(m.fim);
            const ativa = hoje >= ini && hoje <= f;
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                  <Wrench className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{m.veiculo}</p>
                  <p className="text-sm text-slate-500">
                    {formatarData(m.inicio)} → {formatarData(m.fim)}
                  </p>
                  {m.obs && <p className="text-xs text-slate-400">{m.obs}</p>}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    ativa
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {ativa ? "Ativa" : "Encerrada"}
                </span>
                <button
                  onClick={() => excluir(m.id)}
                  className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
