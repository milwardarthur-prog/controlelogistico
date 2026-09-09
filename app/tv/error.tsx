"use client";

import { useEffect } from "react";

export default function TvError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registra o erro no console para diagnóstico (visível em navegadores de Smart TV via ferramentas de dev)
    console.error("Erro no Painel de TV:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        backgroundColor: "#000000",
        color: "#ffffff",
        padding: "32px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: 800,
          color: "#f87171",
          margin: 0,
        }}
      >
        Erro no Painel de TV
      </h1>
      <p
        style={{
          fontSize: "22px",
          color: "#d1d5db",
          maxWidth: "800px",
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        Ocorreu um problema ao exibir o painel. Tente novamente. Se o erro
        persistir, atualize a página no navegador da TV.
      </p>
      {error?.message ? (
        <p
          style={{
            fontSize: "16px",
            color: "#9ca3af",
            maxWidth: "800px",
            margin: 0,
            wordBreak: "break-word",
          }}
        >
          Detalhes: {error.message}
        </p>
      ) : null}
      <button
        onClick={() => reset()}
        style={{
          marginTop: "12px",
          fontSize: "24px",
          fontWeight: 700,
          color: "#ffffff",
          backgroundColor: "#2563eb",
          border: "none",
          borderRadius: "12px",
          padding: "16px 40px",
          cursor: "pointer",
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
