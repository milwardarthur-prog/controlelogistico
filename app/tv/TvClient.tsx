"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  formatarData,
  nomeDiaSemana,
  chaveData,
  isCardPiscando,
  labelTipo,
  labelAtendimento,
  TIPO_BADGE_TV,
  ATENDIMENTO_BADGE,
  SINALEIRO_COR,
  SINALEIRO_CAMPOS,
  type TipoCard,
  type TipoAtendimento,
  type SinaleiroStatus,
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
  acessorios?: string | null;
  obs?: string | null;
  cancelado: boolean;
  comercialOk: SinaleiroStatus;
  logisticaOk: SinaleiroStatus;
  administrativoOk: SinaleiroStatus;
  manutencaoOk: SinaleiroStatus;
  createdBy?: { name: string } | null;
  createdAt: string;
};

const INTERVALO_POLL = 60000; // 60s
const SEGUNDOS_POR_CARD = 14; // velocidade lenta e confortável para leitura (~14s por card)
const MIN_CARDS_LOOP = 4; // mínimo de cards no track para um loop suave

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

function LinhaDia({ label, cards }: { label: string; cards: Card[] }) {
  // Constrói a lista base garantindo um mínimo de cards para o loop ficar suave.
  // Se houver poucos cards, repete-os até atingir MIN_CARDS_LOOP.
  const base = useMemo(() => {
    if (cards.length === 0) return [];
    let arr = [...cards];
    while (arr.length < MIN_CARDS_LOOP) {
      arr = arr.concat(cards);
    }
    return arr;
  }, [cards]);

  // O track é duplicado (base + base) para permitir o translateX(-50%) sem salto.
  const track = useMemo(() => [...base, ...base], [base]);

  // Duração proporcional ao número de cards da base (uma cópia).
  const duracao = Math.max(base.length * SEGUNDOS_POR_CARD, SEGUNDOS_POR_CARD);

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

      {/* Esteira horizontal contínua */}
      <div className="relative flex flex-1 items-stretch overflow-hidden">
        {cards.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-2xl font-bold text-gray-600">
            Sem agendamentos
          </div>
        ) : (
          <div
            className="marquee-track items-stretch gap-3 p-2"
            style={{ animationDuration: `${duracao}s` }}
          >
            {track.map((c, i) => (
              <TvCard key={`${c.id}-${i}`} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Calcula a classe de fonte com base no volume total de conteúdo do card.
// Cards com mais texto recebem fonte progressivamente menor (tamanho físico fixo).
function classeFonteConteudo(card: Card): string {
  const total = [
    card.equipamento,
    card.local,
    card.acessorios,
    card.obs,
    card.veiculo,
    card.motorista,
    card.ajudante,
  ]
    .filter(Boolean)
    .join("").length;

  if (total > 320) return "text-[11px] leading-tight";
  if (total > 200) return "text-xs leading-snug";
  if (total > 110) return "text-sm leading-snug";
  return "text-base leading-snug";
}

// Ajusta o tamanho do nome do cliente conforme o comprimento
function classeFonteCliente(cliente: string): string {
  if (cliente.length > 34) return "text-lg";
  if (cliente.length > 22) return "text-xl";
  return "text-2xl";
}

function TvCard({ card }: { card: Card }) {
  const piscando = !card.cancelado && isCardPiscando(card.createdAt, card.data);
  const fonteConteudo = classeFonteConteudo(card);

  return (
    <div
      className={`relative flex h-full w-[460px] max-w-[560px] flex-shrink-0 flex-col rounded-lg border-4 bg-gray-900 p-4 ${
        piscando ? "card-novo" : "border-gray-700"
      }`}
    >
      {/* Overlay de CANCELADO com carimbo */}
      {card.cancelado && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative h-full w-full">
            <Image
              src="/cancelado.png"
              alt="CANCELADO"
              fill
              className="object-contain p-2 drop-shadow-lg"
              sizes="560px"
              priority
            />
          </div>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between gap-1">
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${TIPO_BADGE_TV[card.tipo]}`}
          >
            {labelTipo(card.tipo)}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${ATENDIMENTO_BADGE[card.tipoAtendimento]}`}
          >
            {labelAtendimento(card.tipoAtendimento)}
          </span>
        </div>
        <span className="text-xl font-black text-yellow-400">{card.horario}</span>
      </div>

      <p
        className={`break-words font-black leading-tight ${classeFonteCliente(card.cliente)}`}
      >
        {card.cliente}
      </p>
      <p className="mb-2 text-sm text-gray-300">{formatarData(card.data)}</p>

      {/* Bloco de conteúdo: fonte adaptativa, sem line-clamp/truncate.
          Todos os campos quebram linha (whitespace-normal + break-words). */}
      <div className={`min-h-0 flex-1 space-y-1 ${fonteConteudo}`}>
        <p className="whitespace-normal break-words">
          <span className="font-bold text-gray-400">Equip.:</span> {card.equipamento}
        </p>
        <p className="whitespace-normal break-words">
          <span className="font-bold text-gray-400">Local:</span> {card.local}
        </p>
        {card.veiculo && (
          <p className="whitespace-normal break-words">
            <span className="font-bold text-gray-400">Veículo:</span> {card.veiculo}
          </p>
        )}
        {card.motorista && (
          <p className="whitespace-normal break-words">
            <span className="font-bold text-gray-400">Técnico:</span> {card.motorista}
          </p>
        )}
        {card.ajudante && (
          <p className="whitespace-normal break-words">
            <span className="font-bold text-gray-400">Ajudante:</span> {card.ajudante}
          </p>
        )}
        {card.acessorios && (
          <p className="whitespace-normal break-words">
            <span className="font-bold text-gray-400">Acess.:</span> {card.acessorios}
          </p>
        )}
        {card.obs && (
          <p className="whitespace-normal break-words italic text-gray-400">
            Obs: {card.obs}
          </p>
        )}
      </div>

      {/* Sinaleiros por setor (3 estados: amarelo/verde/vermelho) */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-700 pt-2 text-xs font-bold">
        {SINALEIRO_CAMPOS.map(({ campo, label }) => (
          <span key={campo} className="flex items-center gap-1">
            <span className={`h-3 w-3 rounded-full ${SINALEIRO_COR[card[campo]]}`} />
            {label}
          </span>
        ))}
      </div>

      {card.createdBy?.name && (
        <p className="mt-0.5 text-[10px] text-gray-500">
          Criado por: {card.createdBy.name}
        </p>
      )}
    </div>
  );
}
