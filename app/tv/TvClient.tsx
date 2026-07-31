"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatarData, nomeDiaSemana, chaveData, isCardNovo } from "@/lib/utils";

type Card = {
  id: string;
  tipo: "ENTREGA" | "RETIRADA";
  data: string;
  horario: string;
  cliente: string;
  equipamento: string;
  veiculo?: string | null;
  local: string;
  motorista?: string | null;
  acessorios?: string | null;
  obs?: string | null;
  cancelado: boolean;
  createdAt: string;
};

const CARDS_POR_LINHA = 2; // quantidade fixa exibida por linha
const INTERVALO_ROTACAO = 8000; // 8s
const INTERVALO_POLL = 60000; // 60s

function isoOffset(n: number) {
  const d = new Date();
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + n);
  return base.toISOString().slice(0, 10);
}

export function TvClient() {
  const [cards, setCards] = useState<Card[]>([]);
  const hojeIso = isoOffset(0);
  const amanhaIso = isoOffset(1);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards?inicio=${hojeIso}&fim=${amanhaIso}`, {
        cache: "no-store",
      });
      if (res.ok) setCards(await res.json());
    } catch {
      // silencioso — mantém dados anteriores em caso de falha de rede
    }
  }, [hojeIso, amanhaIso]);

  // Polling a cada 60s para buscar novos dados sem reload total
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, INTERVALO_POLL);
    return () => clearInterval(t);
  }, [carregar]);

  const cardsHoje = useMemo(
    () => cards.filter((c) => chaveData(c.data) === hojeIso),
    [cards, hojeIso]
  );
  const cardsAmanha = useMemo(
    () => cards.filter((c) => chaveData(c.data) === amanhaIso),
    [cards, amanhaIso]
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black text-white">
      <LinhaDia label={nomeDiaSemana(hojeIso)} cards={cardsHoje} />
      <div className="h-1 w-full bg-white" />
      <LinhaDia label={nomeDiaSemana(amanhaIso)} cards={cardsAmanha} />
    </div>
  );
}

function LinhaDia({
  label,
  cards,
}: {
  label: string;
  cards: Card[];
}) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(cards.length / CARDS_POR_LINHA));

  // Rotação automática quando há mais cards do que cabem na linha
  useEffect(() => {
    if (totalPaginas <= 1) {
      setPagina(0);
      return;
    }
    const t = setInterval(() => {
      setPagina((p) => (p + 1) % totalPaginas);
    }, INTERVALO_ROTACAO);
    return () => clearInterval(t);
  }, [totalPaginas]);

  useEffect(() => {
    // Garante que a página atual é válida quando a lista muda
    if (pagina >= totalPaginas) setPagina(0);
  }, [pagina, totalPaginas]);

  const inicio = pagina * CARDS_POR_LINHA;
  const visiveis = cards.slice(inicio, inicio + CARDS_POR_LINHA);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Label vertical do dia */}
      <div className="flex w-16 flex-shrink-0 items-center justify-center bg-black">
        <span
          className="text-lg font-black uppercase tracking-widest"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {label}
        </span>
      </div>

      {/* Cards de tamanho fixo */}
      <div className="flex flex-1 items-stretch gap-2 p-2">
        {visiveis.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-2xl font-bold text-gray-600">
            Sem agendamentos
          </div>
        ) : (
          visiveis.map((c) => <TvCard key={c.id} card={c} />)
        )}
        {/* Preenche espaços vazios para manter tamanho fixo */}
        {visiveis.length > 0 &&
          Array.from({ length: CARDS_POR_LINHA - visiveis.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1" />
          ))}
      </div>

      {/* Indicador de páginas */}
      {totalPaginas > 1 && (
        <div className="flex w-6 flex-col items-center justify-center gap-1.5">
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === pagina ? "bg-yellow-400" : "bg-gray-600"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TvCard({ card }: { card: Card }) {
  const novo = !card.cancelado && isCardNovo(card.createdAt);

  return (
    <div
      className={`relative flex flex-1 flex-col overflow-hidden rounded-lg border-4 bg-gray-900 p-3 ${
        novo ? "card-novo" : "border-gray-700"
      }`}
    >
      {/* Overlay de CANCELADO com fita zebrada */}
      {card.cancelado && (
        <div className="fita-cancelado pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-70">
          <span className="rotate-[-12deg] rounded bg-black/80 px-4 py-1 text-3xl font-black tracking-widest text-white">
            CANCELADO
          </span>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between">
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold ${
            card.tipo === "ENTREGA" ? "bg-emerald-600" : "bg-amber-600"
          }`}
        >
          {card.tipo}
        </span>
        <span className="text-xl font-black text-yellow-400">{card.horario}</span>
      </div>

      <p className="truncate text-2xl font-black leading-tight">{card.cliente}</p>
      <p className="mb-1 truncate text-sm text-gray-300">{formatarData(card.data)}</p>

      <div className="space-y-0.5 text-sm leading-snug">
        <p><span className="font-bold text-gray-400">Equip.:</span> {card.equipamento}</p>
        {card.veiculo && <p><span className="font-bold text-gray-400">Veículo:</span> {card.veiculo}</p>}
        <p className="line-clamp-2"><span className="font-bold text-gray-400">Local:</span> {card.local}</p>
        {card.motorista && <p><span className="font-bold text-gray-400">Técnico:</span> {card.motorista}</p>}
        {card.acessorios && (
          <p className="line-clamp-2"><span className="font-bold text-gray-400">Acess.:</span> {card.acessorios}</p>
        )}
        {card.obs && <p className="line-clamp-1 italic text-gray-400">Obs: {card.obs}</p>}
      </div>
    </div>
  );
}
