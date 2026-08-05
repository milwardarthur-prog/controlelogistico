"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import {
  TIPO_LABELS,
  ATENDIMENTO_LABELS,
  type TipoCard,
  type TipoAtendimento,
} from "@/lib/utils";

export type CardData = {
  id?: string;
  tipo: TipoCard;
  tipoAtendimento: TipoAtendimento;
  data: string;
  horario: string;
  cliente: string;
  equipamento: string;
  tensao: string;
  veiculo: string;
  periodo: string;
  franquia: string;
  local: string;
  combustivel: string;
  instalacao: string;
  acessorios: string;
  obs: string;
  motorista: string;
  ajudante: string;
};

const vazio: CardData = {
  tipo: "ENTREGA",
  tipoAtendimento: "EVENTO",
  data: "",
  horario: "",
  cliente: "",
  equipamento: "",
  tensao: "",
  veiculo: "",
  periodo: "",
  franquia: "",
  local: "",
  combustivel: "",
  instalacao: "",
  acessorios: "",
  obs: "",
  motorista: "",
  ajudante: "",
};

// Formulário reutilizável para criar e editar cards
export function CardForm({ inicial }: { inicial?: Partial<CardData> }) {
  const router = useRouter();
  const [form, setForm] = useState<CardData>({ ...vazio, ...inicial });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const edicao = Boolean(inicial?.id);

  function set<K extends keyof CardData>(campo: K, valor: CardData[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    // Validação client-side
    if (!form.data || !form.horario || !form.cliente || !form.equipamento || !form.local) {
      setErro("Preencha os campos obrigatórios: Data, Horário, Cliente, Equipamento e Local.");
      return;
    }

    setSalvando(true);
    const url = edicao ? `/api/cards/${inicial!.id}` : "/api/cards";
    const method = edicao ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErro(j.error || "Erro ao salvar o card.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const campo =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Tipo *</label>
          <select
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value as CardData["tipo"])}
            className={campo}
          >
            {(Object.keys(TIPO_LABELS) as TipoCard[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Tipo de Atendimento *</label>
          <select
            value={form.tipoAtendimento}
            onChange={(e) =>
              set("tipoAtendimento", e.target.value as CardData["tipoAtendimento"])
            }
            className={campo}
          >
            {(Object.keys(ATENDIMENTO_LABELS) as TipoAtendimento[]).map((t) => (
              <option key={t} value={t}>
                {ATENDIMENTO_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Data *</label>
          <input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} className={campo} />
        </div>
        <div>
          <label className={label}>Horário *</label>
          <input value={form.horario} onChange={(e) => set("horario", e.target.value)} placeholder="1° HORÁRIO" className={campo} />
        </div>
        <div>
          <label className={label}>Cliente *</label>
          <input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="DEMAE" className={campo} />
        </div>
        <div>
          <label className={label}>Equipamento *</label>
          <input value={form.equipamento} onChange={(e) => set("equipamento", e.target.value)} placeholder="GE-58-81 + GE-71-81" className={campo} />
        </div>
        <div>
          <label className={label}>Tensão</label>
          <input value={form.tensao} onChange={(e) => set("tensao", e.target.value)} placeholder="220V" className={campo} />
        </div>
        <div>
          <label className={label}>Veículo</label>
          <input value={form.veiculo} onChange={(e) => set("veiculo", e.target.value)} placeholder="17-180" className={campo} />
        </div>
        <div>
          <label className={label}>Período</label>
          <input value={form.periodo} onChange={(e) => set("periodo", e.target.value)} placeholder="30 DIAS" className={campo} />
        </div>
        <div>
          <label className={label}>Franquia</label>
          <input value={form.franquia} onChange={(e) => set("franquia", e.target.value)} placeholder="480/BY" className={campo} />
        </div>
        <div>
          <label className={label}>Combustível</label>
          <input value={form.combustivel} onChange={(e) => set("combustivel", e.target.value)} placeholder="CLIENTE" className={campo} />
        </div>
      </div>

      <div>
        <label className={label}>Local *</label>
        <input value={form.local} onChange={(e) => set("local", e.target.value)} placeholder="RUA DO CURRO, 999..." className={campo} />
      </div>

      <div>
        <label className={label}>Instalação</label>
        <input value={form.instalacao} onChange={(e) => set("instalacao", e.target.value)} placeholder="APÓS ENTREGA" className={campo} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Motorista</label>
          <input value={form.motorista} onChange={(e) => set("motorista", e.target.value)} className={campo} />
        </div>
        <div>
          <label className={label}>Ajudante</label>
          <input value={form.ajudante} onChange={(e) => set("ajudante", e.target.value)} className={campo} />
        </div>
      </div>

      <div>
        <label className={label}>Acessórios</label>
        <textarea value={form.acessorios} onChange={(e) => set("acessorios", e.target.value)} rows={4} placeholder="1 JOGO DE 10 METROS DE CABOS 50MM..." className={campo} />
      </div>

      <div>
        <label className={label}>Observações</label>
        <textarea value={form.obs} onChange={(e) => set("obs", e.target.value)} rows={2} className={campo} />
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {edicao ? "Salvar alterações" : "Criar card"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
