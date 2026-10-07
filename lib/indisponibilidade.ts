import { prisma } from "@/lib/db";
import { pessoasDoTexto } from "@/lib/pessoas";
import { formatarData } from "@/lib/utils";

type Escala = { data: Date; motorista?: string | null; ajudante?: string | null };

// Nomes da lista oficial citados em motorista/ajudante. Temporários e textos que não
// batem com ninguém da lista não têm indisponibilidade cadastrada, então nunca são bloqueados.
export function pessoasDaLista(...textos: (string | null | undefined)[]): string[] {
  const nomes = new Set<string>();
  for (const t of textos) {
    for (const p of pessoasDoTexto(t)) {
      if (p.tipo === "lista") nomes.add(p.nome);
    }
  }
  return Array.from(nomes);
}

function diaUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Retorna a mensagem de erro se alguém da nova escala está indisponível no dia do card.
// Com `anterior`, só confere quem acabou de ser escalado (ou todos, se o dia mudou), para
// que editar outros campos de um card que já estava em conflito não fique bloqueado.
export async function validarEscalacao(nova: Escala, anterior?: Escala | null): Promise<string | null> {
  const dia = diaUtc(nova.data);
  const mesmoDia = Boolean(anterior) && diaUtc(anterior!.data).getTime() === dia.getTime();
  const jaEscalados = mesmoDia ? pessoasDaLista(anterior!.motorista, anterior!.ajudante) : [];
  const conferir = pessoasDaLista(nova.motorista, nova.ajudante).filter((n) => !jaEscalados.includes(n));
  if (conferir.length === 0) return null;

  const indisponiveis = await prisma.indisponibilidadeTecnico.findMany({
    where: { data: dia, pessoa: { in: conferir } },
    select: { pessoa: true },
    orderBy: { pessoa: "asc" },
  });
  if (indisponiveis.length === 0) return null;

  const nomes = indisponiveis.map((i) => i.pessoa);
  const quem =
    nomes.length === 1
      ? `${nomes[0]} está indisponível`
      : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]} estão indisponíveis`;
  return `${quem} em ${formatarData(dia)}. Escolha outra pessoa ou outro dia.`;
}
