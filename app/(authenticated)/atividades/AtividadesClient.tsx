"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { ACOES, ENTIDADES, type Acao, type Entidade } from "@/lib/atividades-rotulos";

type Atividade = {
  id: string;
  usuario: string;
  acao: Acao;
  entidade: Entidade;
  resumo: string;
  detalhes: string | null;
  createdAt: string;
};

type Resposta = { total: number; porPagina: number; itens: Atividade[]; usuarios: string[] };

const COR_ACAO: Record<Acao, string> = {
  CRIOU: "bg-emerald-600",
  EDITOU: "bg-sky-600",
  MOVEU: "bg-indigo-600",
  CANCELOU: "bg-red-600",
  REATIVOU: "bg-teal-600",
  EXCLUIU: "bg-rose-800",
  SINALEIRO: "bg-slate-500",
  INDISPONIVEL: "bg-orange-500",
  DISPONIVEL: "bg-orange-400",
  MANUTENCAO_CRIADA: "bg-amber-600",
  MANUTENCAO_EXCLUIDA: "bg-amber-800",
};

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function AtividadesClient() {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [usuario, setUsuario] = useState("");
  const [entidade, setEntidade] = useState("");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(
    async (pg: number) => {
      setCarregando(true);
      setErro("");
      try {
        const params = new URLSearchParams({ pagina: String(pg) });
        if (inicio) params.set("inicio", inicio);
        if (fim) params.set("fim", fim);
        if (usuario) params.set("usuario", usuario);
        if (entidade) params.set("entidade", entidade);
        const res = await fetch(`/api/atividades?${params.toString()}`);
        if (!res.ok) throw new Error();
        setDados(await res.json());
        setPagina(pg);
      } catch {
        setErro("Não foi possível carregar as atividades.");
      } finally {
        setCarregando(false);
      }
    },
    [inicio, fim, usuario, entidade]
  );

  useEffect(() => {
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campo =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";
  const label = "mb-1 block text-xs font-medium text-slate-600";
  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / dados.porPagina)) : 1;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Atividades</h1>
      <p className="mb-4 text-sm text-slate-500">
        Quem fez cada ação no sistema, por login. O registro começa na data em que esta aba entrou no ar.
      </p>

      <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <label className={label}>De</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={label}>Até</label>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={label}>Login</label>
          <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className={campo}>
            <option value="">Todos</option>
            {dados?.usuarios.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Onde</label>
          <select value={entidade} onChange={(e) => setEntidade(e.target.value)} className={campo}>
            <option value="">Tudo</option>
            {(Object.keys(ENTIDADES) as Entidade[]).map((e) => (
              <option key={e} value={e}>
                {ENTIDADES[e]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <button
            onClick={() => carregar(1)}
            disabled={carregando}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>
      </div>

      {erro && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {!dados ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : dados.itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nenhuma atividade registrada para os filtros selecionados.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Quando</th>
                  <th className="px-3 py-2">Login</th>
                  <th className="px-3 py-2">Ação</th>
                  <th className="px-3 py-2">Onde</th>
                  <th className="px-3 py-2">O quê</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{quando(a.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{a.usuario}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${COR_ACAO[a.acao] ?? "bg-slate-500"}`}
                      >
                        {ACOES[a.acao] ?? a.acao}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {ENTIDADES[a.entidade] ?? a.entidade}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div>{a.resumo}</div>
                      {a.detalhes && (
                        <div className="mt-1 whitespace-pre-line text-xs text-slate-500">{a.detalhes}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <span>
              {dados.total} {dados.total === 1 ? "registro" : "registros"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => carregar(pagina - 1)}
                disabled={carregando || pagina <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => carregar(pagina + 1)}
                disabled={carregando || pagina >= totalPaginas}
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
