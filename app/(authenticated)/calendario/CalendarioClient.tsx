"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Wrench,
  UserX,
  Plus,
  Pencil,
  Copy,
  Ban,
  RotateCcw,
  Trash2,
  Loader2,
  Save,
  GripVertical,
} from "lucide-react";
import { CardForm, type CardData } from "@/components/CardForm";
import { SelecaoMultipla } from "@/components/SelecaoMultipla";
import { TEMPORARIA, normalizarPessoaFormulario } from "@/lib/pessoas";
import {
  formatarData,
  chaveData,
  labelTipo,
  labelAtendimento,
  TIPO_BADGE_TV,
  ATENDIMENTO_BADGE,
  TIPO_LABELS,
  MOTORISTAS,
  SINALEIRO_CAMPOS,
  SINALEIRO_COR,
  SINALEIRO_LABELS,
  proximoSinaleiro,
  type TipoCard,
  type TipoAtendimento,
  type SinaleiroStatus,
  type SinaleiroCampo,
} from "@/lib/utils";

export type Card = {
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
  numeroContrato?: string | null;
  numeroOrcamento?: string | null;
  cancelado: boolean;
  comercialOk: SinaleiroStatus;
  logisticaOk: SinaleiroStatus;
  administrativoOk: SinaleiroStatus;
  manutencaoOk: SinaleiroStatus;
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

// Converte um Card em CardData (para o formulário de edição)
function cardParaFormulario(c: Card): Partial<CardData> {
  return {
    id: c.id,
    tipo: c.tipo,
    tipoAtendimento: c.tipoAtendimento,
    data: chaveData(c.data),
    horario: c.horario,
    cliente: c.cliente,
    equipamento: c.equipamento,
    tensao: c.tensao ?? "",
    veiculo: c.veiculo ?? "",
    periodo: c.periodo ?? "",
    franquia: c.franquia ?? "",
    local: c.local,
    combustivel: c.combustivel ?? "",
    instalacao: c.instalacao ?? "",
    acessorios: c.acessorios ?? "",
    obs: c.obs ?? "",
    motorista: c.motorista ?? "",
    ajudante: c.ajudante ?? "",
    numeroContrato: c.numeroContrato ?? "",
    numeroOrcamento: c.numeroOrcamento ?? "",
  };
}

// Quantas semanas a data está distante da semana atual (negativo = passado)
function semanasAteData(dataIso: string): number {
  const alvo = segundaDaSemana(new Date(dataIso + "T00:00:00.000Z"));
  const atual = segundaDaSemana(new Date());
  return Math.round((alvo.getTime() - atual.getTime()) / (7 * 86400000));
}

export function CalendarioClient() {
  const hojeIso = new Date().toISOString().slice(0, 10);
  const [offset, setOffset] = useState(0); // semanas a partir da atual
  const [cards, setCards] = useState<Card[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [indisponiveis, setIndisponiveis] = useState<{ pessoa: string; data: string }[]>([]);
  const [cardSelecionado, setCardSelecionado] = useState<Card | null>(null);
  const [novoModalData, setNovoModalData] = useState<string | null>(null); // data pré-preenchida
  const [novoAberto, setNovoAberto] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Segunda-feira da semana exibida
  const primeiroDia = useMemo(() => {
    const seg = segundaDaSemana(new Date());
    seg.setUTCDate(seg.getUTCDate() + offset * 7);
    return seg;
  }, [offset]);

  // 7 dias (1 semana)
  const dias = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(primeiroDia);
      d.setUTCDate(primeiroDia.getUTCDate() + i);
      arr.push(d);
    }
    return arr;
  }, [primeiroDia]);

  const inicio = useMemo(() => primeiroDia.toISOString().slice(0, 10), [primeiroDia]);
  const fim = useMemo(() => dias[6].toISOString().slice(0, 10), [dias]);

  const carregar = useCallback(async () => {
    const [resCards, resManut, resIndisp] = await Promise.all([
      fetch(`/api/cards?inicio=${inicio}&fim=${fim}`, { cache: "no-store" }),
      fetch(`/api/manutencao`, { cache: "no-store" }),
      fetch(`/api/indisponibilidade?inicio=${inicio}&fim=${fim}`, { cache: "no-store" }),
    ]);
    if (resCards.ok) setCards(await resCards.json());
    if (resManut.ok) setManutencoes(await resManut.json());
    if (resIndisp.ok) setIndisponiveis(await resIndisp.json());
  }, [inicio, fim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Mantém o card do modal sincronizado após recarregar
  useEffect(() => {
    if (!cardSelecionado) return;
    const atualizado = cards.find((c) => c.id === cardSelecionado.id);
    if (atualizado) setCardSelecionado(atualizado);
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mapa data(iso) -> cards
  const porDia = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards) {
      const k = chaveData(c.data);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [cards]);

  // Mapa data(iso) -> técnicos indisponíveis no dia
  const indisponiveisPorDia = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const i of indisponiveis) {
      const lista = map.get(i.data) ?? [];
      lista.push(i.pessoa);
      map.set(i.data, lista);
    }
    return map;
  }, [indisponiveis]);

  const manutencaoDoDia = useCallback(
    (iso: string) =>
      manutencoes.filter((m) => {
        const ini = chaveData(m.inicio);
        const f = chaveData(m.fim);
        return iso >= ini && iso <= f;
      }),
    [manutencoes]
  );

  const cardAtivo = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const cardId = active.id as string;
    const novaData = over.id as string; // iso "YYYY-MM-DD"
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    if (chaveData(card.data) === novaData) return; // mesmo dia

    const dataAnterior = card.data;
    // Atualização otimista
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, data: novaData + "T00:00:00.000Z" } : c
      )
    );
    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: novaData }),
    });
    if (!res.ok) {
      // Reverte em caso de falha (ex: equipe indisponível no novo dia)
      const j = await res.json().catch(() => ({}));
      setAviso(j.error || "Não foi possível mover o card.");
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, data: dataAnterior } : c))
      );
    }
  }

  // Após copiar um card, vai para a semana do novo card para o usuário vê-lo
  function aoCopiar(novo: { data?: string } | null) {
    setCardSelecionado(null);
    const alvo = novo?.data ? semanasAteData(chaveData(novo.data)) : offset;
    if (alvo === offset) carregar();
    else setOffset(alvo);
  }

  function abrirNovo(dataIso?: string) {
    setNovoModalData(dataIso ?? hojeIso);
    setNovoAberto(true);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Calendário</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span className="min-w-[190px] text-center text-sm font-semibold text-slate-900">
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
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Hoje
            </button>
          )}
          <button
            onClick={() => abrirNovo()}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Novo Card
          </button>
        </div>
      </div>

      {aviso && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <span>{aviso}</span>
          <button onClick={() => setAviso(null)} aria-label="Fechar aviso" className="flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {dias.map((d) => {
            const iso = d.toISOString().slice(0, 10);
            const lista = porDia.get(iso) ?? [];
            const manuts = manutencaoDoDia(iso);
            const tecnicosFora = indisponiveisPorDia.get(iso) ?? [];
            const isHoje = iso === hojeIso;
            return (
              <DroppableDay
                key={iso}
                iso={iso}
                titulo={`${DIAS_CABECALHO[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1]}`}
                dataLabel={`${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`}
                isHoje={isHoje}
                onNovo={() => abrirNovo(iso)}
              >
                {manuts.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    title={m.obs ?? undefined}
                  >
                    <Wrench className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate">{m.veiculo}</span>
                  </div>
                ))}
                <TarjasIndisponiveis nomes={tecnicosFora} />
                {lista.map((c) => (
                  <DraggableCard
                    key={c.id}
                    card={c}
                    onClick={() => setCardSelecionado(c)}
                  />
                ))}
                {lista.length === 0 && manuts.length === 0 && tecnicosFora.length === 0 && (
                  <p className="mt-2 text-center text-[11px] text-slate-300">—</p>
                )}
              </DroppableDay>
            );
          })}
        </div>

        <DragOverlay>
          {cardAtivo ? <CardPreview card={cardAtivo} arrastando /> : null}
        </DragOverlay>
      </DndContext>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        {(Object.keys(TIPO_LABELS) as TipoCard[]).map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${TIPO_BADGE_TV[t]}`} /> {TIPO_LABELS[t]}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <Wrench className="h-3 w-3 text-red-600" /> Manutenção de veículo
        </span>
        <span className="flex items-center gap-1">
          <UserX className="h-3 w-3 text-orange-600" /> Técnico indisponível
        </span>
      </div>

      {/* Modal de novo card */}
      {novoAberto && (
        <ModalWrapper onClose={() => setNovoAberto(false)} titulo="Novo Card">
          <CardForm
            inicial={{ data: novoModalData ?? hojeIso }}
            onSuccess={() => {
              setNovoAberto(false);
              carregar();
            }}
            onCancel={() => setNovoAberto(false)}
          />
        </ModalWrapper>
      )}

      {/* Modal de detalhe/edição do card */}
      {cardSelecionado && (
        <CardModal
          card={cardSelecionado}
          onClose={() => setCardSelecionado(null)}
          onChanged={carregar}
          onCopied={aoCopiar}
          onDeleted={() => {
            setCardSelecionado(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

// --- Tarjas de técnicos indisponíveis no dia (laranja, para não confundir com manutenção de veículo) ---
function TarjasIndisponiveis({ nomes }: { nomes: string[] }) {
  if (nomes.length === 0) return null;
  const tarja =
    "flex items-center gap-1 rounded bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white";
  if (nomes.length > 3) {
    return (
      <div className={tarja} title={`Indisponíveis: ${nomes.join(", ")}`}>
        <UserX className="h-2.5 w-2.5 flex-shrink-0" />
        <span className="truncate">{nomes.length} indisponíveis</span>
      </div>
    );
  }
  return (
    <>
      {nomes.map((nome) => (
        <div key={nome} className={tarja} title={`${nome} indisponível`}>
          <UserX className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate">{nome}</span>
        </div>
      ))}
    </>
  );
}

// --- Coluna de dia (droppable) ---
function DroppableDay({
  iso,
  titulo,
  dataLabel,
  isHoje,
  onNovo,
  children,
}: {
  iso: string;
  titulo: string;
  dataLabel: string;
  isHoje: boolean;
  onNovo: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: iso });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[220px] flex-col gap-1.5 rounded-xl border p-2 transition ${
        isOver
          ? "border-slate-900 bg-slate-100"
          : isHoje
            ? "border-slate-900 bg-slate-900/5"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className={`text-xs font-bold ${isHoje ? "text-slate-900" : "text-slate-500"}`}>
            {titulo}
          </p>
          <p className="text-[10px] text-slate-400">{dataLabel}</p>
        </div>
        <button
          onClick={onNovo}
          title="Adicionar card neste dia"
          className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

// --- Card arrastável ---
function DraggableCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer ${isDragging ? "opacity-30" : ""}`}
    >
      <CardPreview card={card} />
    </div>
  );
}

// --- Prévia visual do card (usada na coluna e no overlay) ---
function CardPreview({ card, arrastando }: { card: Card; arrastando?: boolean }) {
  return (
    <div
      className={`rounded-lg border bg-white p-1.5 shadow-sm ${
        card.cancelado ? "border-red-200 opacity-60" : "border-slate-200"
      } ${arrastando ? "ring-2 ring-slate-900" : "hover:border-slate-400"}`}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 flex-shrink-0 text-slate-300" />
        <span className="text-[11px] font-bold text-slate-900">{card.horario}</span>
        {card.cancelado && (
          <span className="ml-auto rounded bg-red-100 px-1 text-[8px] font-bold text-red-600">
            CANC
          </span>
        )}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-0.5">
        <span
          className={`rounded px-1 py-px text-[8px] font-bold uppercase text-white ${TIPO_BADGE_TV[card.tipo]}`}
        >
          {labelTipo(card.tipo)}
        </span>
        <span
          className={`rounded px-1 py-px text-[8px] font-bold uppercase text-white ${ATENDIMENTO_BADGE[card.tipoAtendimento]}`}
        >
          {labelAtendimento(card.tipoAtendimento)}
        </span>
      </div>
      <p className={`mt-0.5 truncate text-[11px] font-bold text-slate-800 ${card.cancelado ? "line-through" : ""}`}>
        {card.cliente}
      </p>
      {card.veiculo && (
        <p className="truncate text-[10px] text-slate-500">🚚 {card.veiculo}</p>
      )}
      <p className="truncate text-[10px] text-slate-400">{card.equipamento}</p>
      {/* Bolinhas dos 4 sinaleiros */}
      <div className="mt-1 flex items-center gap-1">
        {SINALEIRO_CAMPOS.map(({ campo, label }) => (
          <span
            key={campo}
            title={label}
            className={`h-2 w-2 rounded-full ${SINALEIRO_COR[card[campo as SinaleiroCampo]]}`}
          />
        ))}
      </div>
    </div>
  );
}

// --- Wrapper genérico de modal ---
function ModalWrapper({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Modal de detalhe/edição/ações do card ---
export function CardModal({
  card,
  onClose,
  onChanged,
  onCopied,
  onDeleted,
}: {
  card: Card;
  onClose: () => void;
  onChanged: () => void;
  onCopied: (novo: { data?: string } | null) => void;
  onDeleted: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [erro, setErro] = useState("");
  const [motorista, setMotorista] = useState(card.motorista ?? "");
  const [ajudante, setAjudante] = useState(card.ajudante ?? "");
  const [salvandoEquipe, setSalvandoEquipe] = useState(false);
  const [processando, setProcessando] = useState(false);

  // Sincroniza campos de equipe quando o card muda
  useEffect(() => {
    setMotorista(card.motorista ?? "");
    setAjudante(card.ajudante ?? "");
  }, [card.id, card.motorista, card.ajudante]);

  async function patch(body: Record<string, unknown>) {
    setErro("");
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErro(j.error || "Não foi possível salvar.");
    }
    return res.ok;
  }

  async function toggleSinaleiro(campo: SinaleiroCampo) {
    const atual = card[campo];
    const proximo = proximoSinaleiro(atual);
    const ok = await patch({ [campo]: proximo });
    if (ok) onChanged();
  }

  async function salvarEquipe() {
    setSalvandoEquipe(true);
    const ok = await patch({ motorista, ajudante });
    setSalvandoEquipe(false);
    if (ok) onChanged();
  }

  async function toggleCancelado() {
    setProcessando(true);
    const ok = await patch({ cancelado: !card.cancelado });
    setProcessando(false);
    if (ok) onChanged();
  }

  async function excluir() {
    if (
      !window.confirm(
        `Excluir permanentemente o card de "${card.cliente}"? Esta ação não pode ser desfeita.`
      )
    )
      return;
    setProcessando(true);
    const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    setProcessando(false);
    if (res.ok) onDeleted();
  }

  if (editando) {
    return (
      <ModalWrapper titulo="Editar Card" onClose={onClose}>
        <CardForm
          inicial={cardParaFormulario(card)}
          onSuccess={() => {
            setEditando(false);
            onChanged();
          }}
          onCancel={() => setEditando(false)}
        />
      </ModalWrapper>
    );
  }

  if (copiando) {
    return (
      <ModalWrapper titulo="Copiar Card" onClose={onClose}>
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Os dados de &quot;{card.cliente}&quot; foram copiados. Ajuste o que for diferente (data,
          horário, equipamento...) e salve para criar um novo card. Sinaleiros e cancelamento
          começam do zero.
        </p>
        <CardForm
          inicial={{ ...cardParaFormulario(card), id: undefined }}
          onSuccess={(novo) => onCopied(novo as { data?: string } | null)}
          onCancel={() => setCopiando(false)}
        />
      </ModalWrapper>
    );
  }

  const campoInput =
    "w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-900";

  return (
    <ModalWrapper titulo={card.cliente} onClose={onClose}>
      <div className="space-y-4">
        {/* Cabeçalho: badges + status */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${TIPO_BADGE_TV[card.tipo]}`}
          >
            {labelTipo(card.tipo)}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${ATENDIMENTO_BADGE[card.tipoAtendimento]}`}
          >
            {labelAtendimento(card.tipoAtendimento)}
          </span>
          {card.cancelado && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
              CANCELADO
            </span>
          )}
          <span className="ml-auto text-sm font-bold text-slate-900">
            {formatarData(card.data)} — {card.horario}
          </span>
        </div>

        {/* Sinaleiros de 3 estados */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">
            Sinaleiros (clique para alternar)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SINALEIRO_CAMPOS.map(({ campo, label }) => {
              const status = card[campo as SinaleiroCampo];
              return (
                <button
                  key={campo}
                  onClick={() => toggleSinaleiro(campo as SinaleiroCampo)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 transition hover:border-slate-400"
                >
                  <span className={`h-5 w-5 rounded-full ${SINALEIRO_COR[status]}`} />
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                  <span className="text-[10px] text-slate-400">
                    {SINALEIRO_LABELS[status]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalhes */}
        <dl className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          <Linha rotulo="Equipamento" valor={card.equipamento} />
          <Linha rotulo="Local" valor={card.local} />
          <Linha rotulo="Veículo" valor={card.veiculo} />
          <Linha rotulo="Tensão" valor={card.tensao} />
          <Linha rotulo="Período" valor={card.periodo} />
          <Linha rotulo="Franquia" valor={card.franquia} />
          <Linha rotulo="Combustível" valor={card.combustivel} />
          <Linha rotulo="Instalação" valor={card.instalacao} />
          <Linha rotulo="Nº Contrato" valor={card.numeroContrato} />
          <Linha rotulo="Nº Orçamento" valor={card.numeroOrcamento} />
          <Linha rotulo="Acessórios" valor={card.acessorios} />
          <Linha rotulo="Observações" valor={card.obs} />
          {card.createdBy?.name && (
            <Linha rotulo="Criado por" valor={card.createdBy.name} />
          )}
        </dl>

        {/* Edição inline de equipe */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Equipe</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Motorista</p>
              <SelecaoMultipla
                key={`m-${card.id}`}
                valor={card.motorista ?? ""}
                opcoes={MOTORISTAS}
                onChange={setMotorista}
                classeCampo={campoInput}
                rotuloAdicionar="Adicionar motorista"
                rotuloRemover="Remover motorista"
                normalizar={normalizarPessoaFormulario}
                temporaria={TEMPORARIA}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Ajudante</p>
              <SelecaoMultipla
                key={`a-${card.id}`}
                valor={card.ajudante ?? ""}
                opcoes={MOTORISTAS}
                onChange={setAjudante}
                classeCampo={campoInput}
                rotuloAdicionar="Adicionar ajudante"
                rotuloRemover="Remover ajudante"
                normalizar={normalizarPessoaFormulario}
                temporaria={TEMPORARIA}
              />
            </div>
          </div>
          <button
            onClick={salvarEquipe}
            disabled={salvandoEquipe}
            className="mt-2 flex items-center gap-1 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {salvandoEquipe ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Salvar equipe
          </button>
        </div>

        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {erro}
          </p>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" /> Editar
          </button>
          <button
            onClick={() => setCopiando(true)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" /> Copiar
          </button>
          <button
            onClick={toggleCancelado}
            disabled={processando}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60 ${
              card.cancelado
                ? "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                : "border border-red-300 text-red-700 hover:bg-red-50"
            }`}
          >
            {card.cancelado ? (
              <>
                <RotateCcw className="h-4 w-4" /> Reativar Card
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" /> Cancelar Card
              </>
            )}
          </button>
          <button
            onClick={excluir}
            disabled={processando}
            className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>
      </div>
    </ModalWrapper>
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
