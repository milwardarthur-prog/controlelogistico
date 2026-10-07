"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { CardModal, type Card } from "../calendario/CalendarioClient";
import {
  ATENDIMENTO_LABELS,
  MOTORISTAS,
  TIPO_BADGE_TV,
  TIPO_LABELS,
  chaveData,
  labelTipo,
  type TipoAtendimento,
  type TipoCard,
} from "@/lib/utils";
import { ddmm, localIso, somarDias } from "@/lib/dashboard";
import { SEM_TECNICO, TEMPORARIO, linhasDoCard } from "@/lib/escala";
import { pessoasDoTexto, textoDePessoas, type Pessoa } from "@/lib/pessoas";

type Marca = { pessoa: string; data: string };
type Pintura = { pessoa: string; a: number; b: number; marcar: boolean };
type Aviso = { tipo: "erro" | "atencao"; texto: string };

const DIAS_CABECALHO = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const ATENDIMENTOS = Object.keys(ATENDIMENTO_LABELS) as TipoAtendimento[];

const LINHAS = [
  { chave: SEM_TECNICO, nome: "Sem técnico" },
  ...MOTORISTAS.map((nome) => ({ chave: nome as string, nome: nome as string })),
  { chave: TEMPORARIO, nome: "Temporário / outros" },
];

const FUNDO_INDISPONIVEL =
  "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 6px, #f1f5f9 6px, #f1f5f9 12px)";

function Chip({
  card,
  papel,
  origem,
  conflito,
  arrastavel,
  onAbrir,
}: {
  card: Card;
  papel: "motorista" | "ajudante";
  origem: string;
  conflito: boolean;
  arrastavel: boolean;
  onAbrir: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${card.id}|${origem}`,
    disabled: !arrastavel,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-chip
      onClick={onAbrir}
      className={`cursor-pointer rounded border px-1.5 py-1 text-[11px] leading-tight shadow-sm transition hover:shadow ${
        conflito ? "border-red-500 bg-red-50" : "border-slate-200 bg-white"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <p className="truncate font-semibold text-slate-900">{card.horario}</p>
      <p className="truncate text-slate-700">{card.cliente}</p>
      <p className="flex items-center gap-1 text-slate-500">
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${TIPO_BADGE_TV[card.tipo]}`} />
        <span className="truncate">{labelTipo(card.tipo)}</span>
        {papel === "ajudante" && (
          <span className="flex-shrink-0 rounded bg-slate-100 px-1 text-[9px]">ajud.</span>
        )}
        {conflito && <span className="flex-shrink-0 font-bold text-red-600">conflito</span>}
      </p>
    </div>
  );
}

function Celula({
  id,
  soltavel,
  indisponivel,
  destaque,
  onPointerDown,
  onPointerEnter,
  children,
}: {
  id: string;
  soltavel: boolean;
  indisponivel: boolean;
  destaque: "marcar" | "desmarcar" | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !soltavel });
  const hachurada = destaque === "marcar" || (indisponivel && destaque !== "desmarcar");
  return (
    <div
      ref={setNodeRef}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      className={`min-h-[44px] space-y-1 border-b border-r border-slate-200 p-1 ${
        isOver ? "ring-2 ring-inset ring-slate-900" : ""
      } ${destaque ? "ring-2 ring-inset ring-sky-500" : ""}`}
      style={hachurada ? { background: FUNDO_INDISPONIVEL } : undefined}
    >
      {indisponivel && destaque !== "desmarcar" && (
        <span className="block text-[9px] font-semibold uppercase text-slate-500">Indisponível</span>
      )}
      {children}
    </div>
  );
}

export function EscalaClient({ podeEditar }: { podeEditar: boolean }) {
  const hoje = useMemo(() => localIso(), []);
  const [offset, setOffset] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [selecionado, setSelecionado] = useState<Card | null>(null);
  const [filtroAtend, setFiltroAtend] = useState<Set<TipoAtendimento>>(new Set(ATENDIMENTOS));
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoCard>("");
  const [pintura, setPintura] = useState<Pintura | null>(null);
  const pinturaRef = useRef<Pintura | null>(null);
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const reqId = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const segunda = useMemo(() => {
    const dow = new Date(hoje + "T00:00:00.000Z").getUTCDay();
    return somarDias(hoje, -((dow + 6) % 7) + offset * 7);
  }, [hoje, offset]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)), [segunda]);
  const inicio = dias[0];
  const fim = dias[6];

  const carregar = useCallback(async () => {
    const id = ++reqId.current;
    const [rc, rm] = await Promise.all([
      fetch(`/api/cards?inicio=${inicio}&fim=${fim}`, { cache: "no-store" }),
      fetch(`/api/indisponibilidade?inicio=${inicio}&fim=${fim}`, { cache: "no-store" }),
    ]);
    const novosCards = rc.ok ? await rc.json() : null;
    const novasMarcas = rm.ok ? await rm.json() : null;
    if (id !== reqId.current) return;
    if (novosCards) setCards(novosCards);
    if (novasMarcas) setMarcas(novasMarcas);
    setCarregando(false);
  }, [inicio, fim]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  // Mantém o card aberto no modal sincronizado após recarregar
  useEffect(() => {
    if (!selecionado) return;
    const atualizado = cards.find((c) => c.id === selecionado.id);
    if (atualizado) setSelecionado(atualizado);
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  const indisponiveis = useMemo(() => new Set(marcas.map((m) => `${m.pessoa}|${m.data}`)), [marcas]);

  const visiveis = useMemo(
    () =>
      cards.filter(
        (c) => !c.cancelado && filtroAtend.has(c.tipoAtendimento) && (!filtroTipo || c.tipo === filtroTipo)
      ),
    [cards, filtroAtend, filtroTipo]
  );

  const { celulas, totais } = useMemo(() => {
    const celulas = new Map<string, { card: Card; papel: "motorista" | "ajudante" }[]>();
    const totais = new Map<string, number>();
    for (const card of visiveis) {
      const dia = chaveData(card.data);
      for (const { chave, papel } of linhasDoCard(card)) {
        const k = `${chave}|${dia}`;
        const lista = celulas.get(k) ?? [];
        lista.push({ card, papel });
        celulas.set(k, lista);
        totais.set(chave, (totais.get(chave) ?? 0) + 1);
      }
    }
    for (const lista of Array.from(celulas.values())) {
      lista.sort((a, b) => a.card.horario.localeCompare(b.card.horario, "pt-BR", { numeric: true }));
    }
    return { celulas, totais };
  }, [visiveis]);

  // ---- Marcar indisponibilidade (clique ou arraste na linha da pessoa) ----

  function iniciarPintura(e: React.PointerEvent, pessoa: string, idx: number, jaMarcado: boolean) {
    if (!podeEditar || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-chip]")) return;
    const p = { pessoa, a: idx, b: idx, marcar: !jaMarcado };
    pinturaRef.current = p;
    setPintura(p);
    window.addEventListener("pointerup", finalizarPintura, { once: true });
  }

  function moverPintura(pessoa: string, idx: number) {
    const p = pinturaRef.current;
    if (!p || p.pessoa !== pessoa || p.b === idx) return;
    const novo = { ...p, b: idx };
    pinturaRef.current = novo;
    setPintura(novo);
  }

  async function finalizarPintura() {
    const p = pinturaRef.current;
    pinturaRef.current = null;
    setPintura(null);
    if (!p) return;
    const de = Math.min(p.a, p.b);
    const ate = Math.max(p.a, p.b);
    const res = await fetch("/api/indisponibilidade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa: p.pessoa, inicio: dias[de], fim: dias[ate], indisponivel: p.marcar }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAviso({ tipo: "erro", texto: j.error || "Não foi possível salvar a indisponibilidade." });
    } else if (Array.isArray(j.conflitos) && j.conflitos.length > 0) {
      const lista = j.conflitos
        .slice(0, 5)
        .map((c: { cliente: string; data: string }) => `${c.cliente.trim()} (${ddmm(c.data)})`)
        .join(", ");
      const n = j.conflitos.length;
      setAviso({
        tipo: "atencao",
        texto: `${p.pessoa} já tem ${n} ${n > 1 ? "cards" : "card"} nesse período: ${lista}${n > 5 ? "..." : ""}. Reatribua os cards em vermelho.`,
      });
    } else {
      setAviso(null);
    }
    carregar();
  }

  // ---- Arrastar card para a linha de uma pessoa ----

  async function aoSoltar(e: DragEndEvent) {
    setAtivoId(null);
    if (!e.over) return;
    const [cardId, origem] = String(e.active.id).split("|");
    const [destino, diaDestino] = String(e.over.id).split("|");
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const mot = pessoasDoTexto(card.motorista);
    const aj = pessoasDoTexto(card.ajudante);
    const mudouDia = diaDestino !== chaveData(card.data);
    if (origem === destino && !mudouDia) return;

    const body: Record<string, string> = {};
    if (origem !== destino) {
      const jaNoCard = [...mot, ...aj].some((p) => p.tipo === "lista" && p.nome === destino);
      if (jaNoCard) {
        setAviso({ tipo: "erro", texto: `${destino} já está neste card.` });
        return;
      }
      const nova: Pessoa = { tipo: "lista", nome: destino };
      const trocar = (lista: Pessoa[]) =>
        lista.map((p) => (p.tipo === "lista" && p.nome === origem ? nova : p));
      if (origem === SEM_TECNICO) {
        body.motorista = textoDePessoas([nova]);
      } else {
        body.motorista = textoDePessoas(trocar(mot));
        body.ajudante = textoDePessoas(trocar(aj));
      }
    }
    if (mudouDia) body.data = diaDestino;

    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setAviso({ tipo: "erro", texto: j.error || "Não foi possível mover o card." });
    } else {
      setAviso(null);
    }
    carregar();
  }

  function alternarAtendimento(a: TipoAtendimento) {
    setFiltroAtend((atual) => {
      const novo = new Set(atual);
      if (novo.has(a)) novo.delete(a);
      else novo.add(a);
      return novo;
    });
  }

  const cardAtivo = ativoId ? cards.find((c) => c.id === ativoId.split("|")[0]) ?? null : null;
  const faixa = pintura ? [Math.min(pintura.a, pintura.b), Math.max(pintura.a, pintura.b)] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Escala</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold text-slate-900">
            {ddmm(inicio)}/{inicio.slice(0, 4)} – {ddmm(fim)}/{fim.slice(0, 4)}
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
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {ATENDIMENTOS.map((a) => (
          <button
            key={a}
            onClick={() => alternarAtendimento(a)}
            aria-pressed={filtroAtend.has(a)}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              filtroAtend.has(a)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {ATENDIMENTO_LABELS[a]}
          </button>
        ))}
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as "" | TipoCard)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos os tipos</option>
          {(Object.keys(TIPO_LABELS) as TipoCard[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_LABELS[t]}
            </option>
          ))}
        </select>
        {carregando && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {podeEditar && (
        <p className="mb-3 text-xs text-slate-500">
          Clique em um dia da linha de uma pessoa para marcar ou desmarcar indisponibilidade (arraste para vários
          dias). Arraste um card para a linha de uma pessoa para escalá-la.
        </p>
      )}

      {aviso && (
        <div
          role="alert"
          className={`mb-3 flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
            aviso.tipo === "erro"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} aria-label="Fechar aviso" className="flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setAtivoId(String(e.active.id))}
        onDragEnd={aoSoltar}
        onDragCancel={() => setAtivoId(null)}
      >
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div
            className="grid min-w-[960px] select-none border-l border-t border-slate-200"
            style={{ gridTemplateColumns: "150px repeat(7, minmax(112px, 1fr))" }}
          >
            <div className="border-b border-r border-slate-200 bg-slate-50 p-2 text-xs font-semibold uppercase text-slate-500">
              Pessoa
            </div>
            {dias.map((d, i) => (
              <div
                key={d}
                className={`border-b border-r border-slate-200 p-2 text-center text-xs font-semibold ${
                  d === hoje ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"
                }`}
              >
                {DIAS_CABECALHO[i]} <span className="font-normal">{ddmm(d)}</span>
              </div>
            ))}

            {LINHAS.map((linha) => {
              const ehPessoa = linha.chave !== SEM_TECNICO && linha.chave !== TEMPORARIO;
              return (
                <div key={linha.chave} className="contents">
                  <div
                    className={`flex items-start justify-between gap-1 border-b border-r border-slate-200 p-2 text-sm ${
                      ehPessoa ? "font-medium text-slate-800" : "bg-slate-50 font-semibold text-slate-600"
                    }`}
                  >
                    <span className="truncate">{linha.nome}</span>
                    {(totais.get(linha.chave) ?? 0) > 0 && (
                      <span className="flex-shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">
                        {totais.get(linha.chave)}
                      </span>
                    )}
                  </div>
                  {dias.map((d, idx) => {
                    const itens = celulas.get(`${linha.chave}|${d}`) ?? [];
                    const indisponivel = ehPessoa && indisponiveis.has(`${linha.chave}|${d}`);
                    const dentro =
                      pintura && faixa && pintura.pessoa === linha.chave && idx >= faixa[0] && idx <= faixa[1];
                    return (
                      <Celula
                        key={d}
                        id={`${linha.chave}|${d}`}
                        soltavel={ehPessoa}
                        indisponivel={indisponivel}
                        destaque={dentro ? (pintura!.marcar ? "marcar" : "desmarcar") : null}
                        onPointerDown={(e) => ehPessoa && iniciarPintura(e, linha.chave, idx, indisponivel)}
                        onPointerEnter={() => ehPessoa && moverPintura(linha.chave, idx)}
                      >
                        {itens.map(({ card, papel }) => (
                          <Chip
                            key={card.id}
                            card={card}
                            papel={papel}
                            origem={linha.chave}
                            conflito={indisponivel}
                            arrastavel={linha.chave !== TEMPORARIO}
                            onAbrir={() => setSelecionado(card)}
                          />
                        ))}
                      </Celula>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {cardAtivo ? (
            <div className="rounded border border-slate-400 bg-white px-2 py-1 text-xs shadow-lg">
              <p className="font-semibold text-slate-900">{cardAtivo.horario}</p>
              <p className="text-slate-700">{cardAtivo.cliente}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selecionado && (
        <CardModal
          card={selecionado}
          onClose={() => setSelecionado(null)}
          onChanged={carregar}
          onCopied={() => {
            setSelecionado(null);
            carregar();
          }}
          onDeleted={() => {
            setSelecionado(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}
