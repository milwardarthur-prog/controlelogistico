"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ResizeObserver from "resize-observer-polyfill";
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
  veiculo?: string | null;
  local: string;
  motorista?: string | null;
  ajudante?: string | null;
  acessorios?: string | null;
  obs?: string | null;
  cancelado: boolean;
  createdBy?: { name: string } | null;
  createdAt: string;
};

const INTERVALO_POLL = 60000; // 60s
const SEGUNDOS_POR_CARD = 14; // velocidade lenta e confortável para leitura (~14s por card)
const MIN_CARDS_LOOP = 4; // mínimo de cards no track para um loop suave
const ESCALA_MINIMA = 0.6; // abaixo disso, aciona o plano B (ocultar campos)

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
  // Mede a altura real disponível da faixa via ResizeObserver, para que os
  // cards tenham uma altura fixa em px e possam se auto-ajustar por medição.
  const containerRef = useRef<HTMLDivElement>(null);
  const [alturaLinha, setAlturaLinha] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Medição robusta via getBoundingClientRect (funciona em Chromium antigo)
    const updateAltura = () => {
      if (containerRef.current) {
        setAlturaLinha(containerRef.current.getBoundingClientRect().height);
      }
    };

    // Medição inicial imediata
    updateAltura();

    // Preferimos ResizeObserver (com polyfill importado); se por algum motivo
    // falhar em Smart TVs antigas, caímos para o listener de resize da janela.
    let obs: ResizeObserver | null = null;
    try {
      obs = new ResizeObserver(updateAltura);
      obs.observe(el);
    } catch {
      window.addEventListener("resize", updateAltura);
    }

    return () => {
      if (obs) obs.disconnect();
      else window.removeEventListener("resize", updateAltura);
    };
  }, []);

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

  // Altura do card = altura da faixa menos o padding vertical do track (p-2 = 8px * 2).
  const alturaCard = Math.max(alturaLinha - 16, 0);

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
      <div
        ref={containerRef}
        className="relative flex flex-1 items-stretch overflow-hidden"
      >
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
              <TvCard key={`${c.id}-${i}`} card={c} alturaDisponivel={alturaCard} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Ajusta o tamanho do nome do cliente conforme o comprimento
function classeFonteCliente(cliente: string): string {
  if (cliente.length > 34) return "text-lg";
  if (cliente.length > 22) return "text-xl";
  return "text-2xl";
}

// Horário é texto livre (ex: "1° HORÁRIO", "APÓS BELMIRO BRAGA"), não apenas
// um relógio — reduz a fonte para caber numa única linha do cabeçalho fixo.
function classeFonteHorario(horario: string): string {
  if (horario.length > 18) return "text-xs";
  if (horario.length > 12) return "text-base";
  return "text-xl";
}

// Campos de conteúdo variável do card. Renderizado tanto no elemento visível
// (que recebe a escala) quanto no elemento invisível de medição (measureRef).
// Manter os dois idênticos é essencial para que a medição seja fiel.
function ConteudoCampos({
  card,
  mostrarObs,
  mostrarAcessorios,
}: {
  card: Card;
  mostrarObs: boolean;
  mostrarAcessorios: boolean;
}) {
  return (
    <>
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
      {card.acessorios && mostrarAcessorios && (
        <p className="whitespace-normal break-words">
          <span className="font-bold text-gray-400">Acess.:</span> {card.acessorios}
        </p>
      )}
      {card.obs && mostrarObs && (
        <p className="whitespace-normal break-words italic text-gray-400">
          Obs: {card.obs}
        </p>
      )}
    </>
  );
}

function TvCard({
  card,
  alturaDisponivel,
}: {
  card: Card;
  alturaDisponivel: number;
}) {
  const piscando = !card.cancelado && isCardPiscando(card.createdAt, card.data);

  // Moldura fixa — não precisam de ref, pois têm altura definida em CSS.
  // Alterar aqui se o layout do cabeçalho/rodapé mudar.
  const PADDING_CARD = 32;        // p-4 topo + base (16 + 16)
  const ALTURA_CABECALHO = 32;    // h-8
  const ALTURA_CLIENTE = 52;      // h-[52px]
  const GAP_TOTAL = 16;           // 2 gaps de 8px (gap-2) entre cabeçalho/cliente/conteúdo
  const ESPACO_FIXO = PADDING_CARD + ALTURA_CABECALHO + ALTURA_CLIENTE + GAP_TOTAL;

  // Elemento INVISÍVEL de medição: largura real do card, SEM transform.
  // A escala é lida somente deste elemento, nunca do elemento visível — assim
  // a compensação de largura (width: calc) não realimenta o scrollHeight medido.
  const measureRef = useRef<HTMLDivElement>(null);

  const [escala, setEscala] = useState(1);
  const [mostrarObs, setMostrarObs] = useState(true);
  const [mostrarAcessorios, setMostrarAcessorios] = useState(true);

  // Reseta os campos visíveis sempre que os dados do card mudam (novo card no
  // ciclo do marquee) ou quando a altura disponível muda, para reavaliar do zero.
  useLayoutEffect(() => {
    setMostrarObs(true);
    setMostrarAcessorios(true);
  }, [
    card.id,
    card.equipamento,
    card.local,
    card.veiculo,
    card.motorista,
    card.ajudante,
    card.acessorios,
    card.obs,
    alturaDisponivel,
  ]);

  // Mede o conteúdo no elemento invisível (measureRef) e calcula a escala.
  // Depende de mostrarObs/mostrarAcessorios (para o plano B) mas NÃO de `escala`
  // — isso quebra o ciclo de medição instável.
  useLayoutEffect(() => {
    if (!measureRef.current || !alturaDisponivel) return;

    const espacoConteudo = alturaDisponivel - ESPACO_FIXO;
    if (espacoConteudo <= 0) return;

    // scrollHeight do CLONE invisível (largura real, sem escala aplicada)
    const scrollH = measureRef.current.scrollHeight;

    if (scrollH <= espacoConteudo) {
      setEscala(1);
      return;
    }

    const fator = espacoConteudo / scrollH;

    if (fator >= ESCALA_MINIMA) {
      setEscala(fator);
      return;
    }

    // Plano B: reduzir conteúdo antes de encolher demais.
    // 1º) ocultar observação; 2º) ocultar acessórios.
    // Cada ocultação dispara nova execução (dependência mudou) → remede o clone.
    if (mostrarObs && card.obs) {
      setMostrarObs(false);
      return;
    }
    if (mostrarAcessorios && card.acessorios) {
      setMostrarAcessorios(false);
      return;
    }

    // Sem mais campos opcionais para ocultar: aplica o piso de escala (0.60).
    setEscala(ESCALA_MINIMA);
  }, [card, alturaDisponivel, mostrarObs, mostrarAcessorios]);

  const alturaEstilo =
    alturaDisponivel > 0 ? { height: `${alturaDisponivel}px` } : undefined;

  return (
    <div
      className={`relative flex w-[460px] max-w-[560px] flex-shrink-0 flex-col gap-2 overflow-hidden rounded-lg border-4 bg-gray-900 p-4 ${
        piscando ? "card-novo" : "border-gray-700"
      }`}
      style={alturaEstilo}
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

      {/* Cabeçalho fixo: badges + horário — h-8 = 32px */}
      <div className="flex h-8 flex-shrink-0 items-center justify-between gap-1 overflow-hidden">
        <div className="flex flex-shrink-0 items-center gap-1">
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
        <span
          className={`min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-right font-black text-yellow-400 ${classeFonteHorario(card.horario)}`}
        >
          {card.horario}
        </span>
      </div>

      {/* Cliente + data — h-[52px] = 52px */}
      <div className="h-[52px] flex-shrink-0 overflow-hidden">
        <p
          className={`overflow-hidden text-ellipsis whitespace-nowrap font-black leading-tight ${classeFonteCliente(card.cliente)}`}
        >
          {card.cliente}
        </p>
        <p className="text-sm text-gray-300">{formatarData(card.data)}</p>
      </div>

      {/* Bloco de conteúdo variável: auto-fit por escala medida no clone.
          O container externo ocupa o espaço restante (flex-1) e recorta. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Clone invisível de medição: largura real (w-full), SEM transform.
            É a única fonte do scrollHeight usado para calcular a escala. */}
        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 w-full space-y-1 text-base leading-snug"
        >
          <ConteudoCampos
            card={card}
            mostrarObs={mostrarObs}
            mostrarAcessorios={mostrarAcessorios}
          />
        </div>

        {/* Conteúdo visível: recebe apenas a escala já calculada. */}
        <div
          className="space-y-1 text-base leading-snug"
          style={{
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            width: `calc(100% / ${escala})`,
          }}
        >
          <ConteudoCampos
            card={card}
            mostrarObs={mostrarObs}
            mostrarAcessorios={mostrarAcessorios}
          />
        </div>
      </div>
    </div>
  );
}
