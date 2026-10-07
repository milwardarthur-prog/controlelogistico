"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { semAcento } from "@/lib/texto";

export const SEPARADOR_MULTIPLA = " + ";

type Temporaria = { rotulo: string; prefixo: string };

type Props = {
  valor: string;
  opcoes: readonly string[];
  onChange: (valor: string) => void;
  classeCampo: string;
  rotuloAdicionar: string;
  rotuloRemover: string;
  // Opções que podem aparecer em mais de uma caixa (ex: "Outro")
  permiteRepetir?: readonly string[];
  // Como cada parte do texto salvo aparece ao abrir (padrão: alinha com a lista ignorando caixa/acento)
  normalizar?: (parte: string) => string;
  // Opção extra que abre um campo de texto para digitar um nome fora da lista
  temporaria?: Temporaria;
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
  normalizar,
  temporaria,
}: Props) {
  const normalizarParte =
    normalizar ??
    ((parte: string) => {
      const k = semAcento(parte).toLowerCase();
      return opcoes.find((o) => semAcento(o).toLowerCase() === k) ?? parte;
    });

  const [itens, setItens] = useState<string[]>(() => {
    if (!valor.trim()) return [""];
    const partes = valor
      .split(/\s*\+\s*|\s+\/\s+/)
      .map((p) => normalizarParte(p.trim()))
      .filter(Boolean);
    return partes.length ? partes : [""];
  });

  const prefixoMin = temporaria ? temporaria.prefixo.trim().toLowerCase() : "";
  const ehTemp = (t: string) => Boolean(temporaria) && t.toLowerCase().startsWith(prefixoMin);
  const nomeTemp = (t: string) => t.slice(prefixoMin.length).replace(/^ /, "");

  function montar(tokens: string[]): string {
    return tokens
      .map((t) => {
        if (!ehTemp(t)) return t.trim();
        const nome = nomeTemp(t).trim().replace(/\s+/g, " ");
        return nome ? temporaria!.prefixo + nome : "";
      })
      .filter(Boolean)
      .join(SEPARADOR_MULTIPLA);
  }

  // Ao abrir um card antigo, grava no formulário a grafia padronizada que a tela já mostra
  // ("VALMI" -> "Valmir"), para o que se vê ser o que é salvo.
  useEffect(() => {
    const padronizado = montar(itens);
    if (padronizado !== valor) onChange(padronizado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function atualizar(proximos: string[]) {
    setItens(proximos);
    onChange(montar(proximos));
  }

  return (
    <div className="space-y-2">
      {itens.map((selecionado, i) => {
        const temp = ehTemp(selecionado);
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <select
                value={temp ? temporaria!.rotulo : selecionado}
                onChange={(e) => {
                  const proximos = [...itens];
                  proximos[i] =
                    temporaria && e.target.value === temporaria.rotulo
                      ? temporaria.prefixo
                      : e.target.value;
                  atualizar(proximos);
                }}
                className={classeCampo}
              >
                <option value="">Selecione...</option>
                {/* Cards antigos têm texto livre; mantém o valor atual selecionável para não apagá-lo ao editar */}
                {selecionado && !temp && !opcoes.includes(selecionado) && (
                  <option value={selecionado}>{selecionado} (fora do padrão)</option>
                )}
                {opcoes
                  .filter((o) => o === selecionado || permiteRepetir.includes(o) || !itens.includes(o))
                  .map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                {temporaria && <option value={temporaria.rotulo}>{temporaria.rotulo}</option>}
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
            {temp && (
              <input
                value={nomeTemp(selecionado)}
                onChange={(e) => {
                  const proximos = [...itens];
                  proximos[i] = temporaria!.prefixo + e.target.value.replace(/[+/&,]/g, "");
                  atualizar(proximos);
                }}
                placeholder="Nome da pessoa"
                className={classeCampo}
              />
            )}
          </div>
        );
      })}
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
