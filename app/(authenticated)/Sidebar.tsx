"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Calendar,
  Printer,
  History,
  Wrench,
  Tv,
  LogOut,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  role: "ADMIN" | "TECNICO";
  nome: string;
};

const STORAGE_KEY = "sidebar-minimizada";

// Barra lateral com navegação condicionada ao papel do usuário.
// Pode ser minimizada (apenas ícones) ou expandida (ícones + texto),
// com a preferência persistida no localStorage.
export function Sidebar({ role, nome }: Props) {
  const pathname = usePathname();
  const [minimizada, setMinimizada] = useState(false);
  const [pronta, setPronta] = useState(false);

  // Carrega a preferência salva ao montar
  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === "true") setMinimizada(true);
    setPronta(true);
  }, []);

  function alternar() {
    setMinimizada((m) => {
      const novo = !m;
      localStorage.setItem(STORAGE_KEY, String(novo));
      return novo;
    });
  }

  const itens = [
    { href: "/calendario", label: "Calendário", icon: Calendar, roles: ["ADMIN", "TECNICO"] },
    { href: "/impressao", label: "Impressão", icon: Printer, roles: ["ADMIN"] },
    { href: "/historico", label: "Histórico", icon: History, roles: ["ADMIN", "TECNICO"] },
    { href: "/manutencao", label: "Manutenção", icon: Wrench, roles: ["ADMIN", "TECNICO"] },
  ].filter((i) => i.roles.includes(role));

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300",
        minimizada ? "w-16" : "w-56"
      )}
      // Evita "piscar" antes de ler o localStorage
      style={{ visibility: pronta ? "visible" : "hidden" }}
    >
      {/* Botão de toggle */}
      <button
        onClick={alternar}
        title={minimizada ? "Expandir menu" : "Minimizar menu"}
        aria-label={minimizada ? "Expandir menu" : "Minimizar menu"}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
      >
        {minimizada ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Cabeçalho / marca */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-slate-200 py-4",
          minimizada ? "justify-center px-2" : "px-5"
        )}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900">
          <Truck className="h-5 w-5 text-white" />
        </div>
        {!minimizada && (
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold text-slate-900">
              Controle Logístico
            </p>
            <p className="truncate text-xs text-slate-500">{nome}</p>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 p-3">
        {itens.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={minimizada ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition",
                minimizada ? "justify-center px-2" : "px-3",
                ativo
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!minimizada && item.label}
              {/* Tooltip ao hover quando minimizada */}
              {minimizada && (
                <span className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Painel TV é rota pública, abre em nova aba */}
        <a
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          title={minimizada ? "Painel TV" : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100",
            minimizada ? "justify-center px-2" : "px-3"
          )}
        >
          <Tv className="h-4 w-4 flex-shrink-0" />
          {!minimizada && "Painel TV"}
          {minimizada && (
            <span className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Painel TV
            </span>
          )}
        </a>
      </nav>

      {/* Rodapé: papel + sair */}
      <div className="border-t border-slate-200 p-3">
        {!minimizada && (
          <span className="mb-2 block px-3 text-xs font-semibold uppercase text-slate-400">
            {role === "ADMIN" ? "Administrador" : "Técnico"}
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={minimizada ? "Sair" : undefined}
          className={cn(
            "group relative flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-red-600 transition hover:bg-red-50",
            minimizada ? "justify-center px-2" : "px-3"
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!minimizada && "Sair"}
          {minimizada && (
            <span className="pointer-events-none absolute left-full z-20 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Sair
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
