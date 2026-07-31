import { TvClient } from "./TvClient";

// Painel TV — rota PÚBLICA (sem autenticação), otimizada para Smart TV
export const dynamic = "force-dynamic";

export default function TvPage() {
  return <TvClient />;
}
