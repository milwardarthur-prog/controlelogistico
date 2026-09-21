"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export const SEPARADOR_MULTIPLA = " + ";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Texto salvo ("24-250 + Bongo") -> lista de caixas. Alinha a grafia com a lista
// oficial ignorando maiúsculas/acentos (ex: "SEBASTIAO" -> "Sebastião").
function separar(texto: string, opcoes: readonly string[]): string[] {
  if (!texto.trim()) return [""];
  return texto.split(/\s*\+\s*|\s+\/\s+/).map((parte) => {
    const v = parte.trim();
    const chave = semAcento(v).toLowerCase();
    return opcoes.find((o) => semAcento(o).toLowerCase() === chave) ?? v;
  });
}

type Props = {
  valor: string;
  opcoes: readonly string[];
  onChange: (valor: string) => void;
  classeCampo: string;
  rotuloAdicionar: string;
  rotuloRemover: string;
  // Opções que podem aparecer em mais de uma caixa (ex: "Outro")
  permiteRepetir?: readonly string[];
};

// Caixa de seleção com botão para adicionar mais itens. O resultado é guardado em
// um único texto, unido por " + ", sem necessidade de mudar o banco.
export function SelecaoMultipla({
  valor,
  opcoes,
  onChange,
  classeCampo,
  rotuloAdicionar,
  rotuloRemover,
  permiteRepetir = [],
}: Props) {
  const [itens, setItens] = useState<string[]>(() => separar(valor, opcoes));

  function atualizar(proximos: string[]) {
    setItens(proximos);
    onChange(proximos.filter(Boolean).join(SEPARADOR_MULTIPLA));
  }

  return (
    <div className="space-y-2">
      {itens.map((selecionado, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={selecionado}
            onChange={(e) => {
              const proximos = [...itens];
              proximos[i] = e.target.value;
              atualizar(proximos);
            }}
            className={classeCampo}
          >
            <option value="">Selecione...</option>
            {/* Cards antigos têm texto livre; mantém o valor atual selecionável para não apagá-lo ao editar */}
            {selecionado && !opcoes.includes(selecionado) && (
              <option value={selecionado}>{selecionado} (fora do padrão)</option>
            )}
            {opcoes
              .filter((o) => o === selecionado || permiteRepetir.includes(o) || !itens.includes(o))
              .map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
          </select>
          {itens.length > 1 && (
            <button
              type="button"
              onClick={() => atualizar(itens.filter((_, j) => j !== i))}
              className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-100"
              aria-label={rotuloRemover}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {itens[itens.length - 1] && (
        <button
          type="button"
          onClick={() => setItens([...itens, ""])}
          className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          <Plus className="h-4 w-4" /> {rotuloAdicionar}
        </button>
      )}
    </div>
  );
}
