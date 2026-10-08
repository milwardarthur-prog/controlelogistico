// Rótulos do registro de atividades. Fica separado de lib/atividades.ts (que usa o banco)
// para a tela poder importar sem levar código de servidor.
export const ACOES = {
  CRIOU: "Criou",
  EDITOU: "Editou",
  MOVEU: "Mudou de dia",
  CANCELOU: "Cancelou",
  REATIVOU: "Reativou",
  EXCLUIU: "Excluiu",
  SINALEIRO: "Sinaleiro",
  INDISPONIVEL: "Marcou indisponível",
  DISPONIVEL: "Desmarcou indisponível",
  MANUTENCAO_CRIADA: "Cadastrou manutenção",
  MANUTENCAO_EXCLUIDA: "Excluiu manutenção",
} as const;

export type Acao = keyof typeof ACOES;

export const ENTIDADES = {
  CARD: "Card",
  INDISPONIBILIDADE: "Escala",
  MANUTENCAO: "Manutenção",
} as const;

export type Entidade = keyof typeof ENTIDADES;
