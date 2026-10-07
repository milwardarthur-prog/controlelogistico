import { pessoasDoTexto } from "@/lib/pessoas";

// Chaves das duas linhas especiais da grade (as demais usam o nome da pessoa).
export const SEM_TECNICO = "__sem__";
export const TEMPORARIO = "__temp__";

type ComEquipe = { motorista?: string | null; ajudante?: string | null };

// Em que linhas da grade o card aparece: uma por pessoa da lista, uma para temporários e
// textos fora da lista, ou "Sem técnico" quando ninguém foi escalado.
export function linhasDoCard(card: ComEquipe): { chave: string; papel: "motorista" | "ajudante" }[] {
  const vistos = new Set<string>();
  const saida: { chave: string; papel: "motorista" | "ajudante" }[] = [];
  const adicionar = (texto: string | null | undefined, papel: "motorista" | "ajudante") => {
    for (const p of pessoasDoTexto(texto)) {
      const chave = p.tipo === "lista" ? p.nome : TEMPORARIO;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      saida.push({ chave, papel });
    }
  };
  adicionar(card.motorista, "motorista");
  adicionar(card.ajudante, "ajudante");
  return saida.length > 0 ? saida : [{ chave: SEM_TECNICO, papel: "motorista" }];
}
