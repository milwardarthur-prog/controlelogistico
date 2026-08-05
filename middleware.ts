export { default } from "next-auth/middleware";

// Protege as rotas do grupo autenticado.
// A rota pública /tv e /login não passam por aqui.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cards/:path*",
    "/calendario/:path*",
    "/impressao/:path*",
    "/historico/:path*",
    "/manutencao/:path*",
  ],
};
