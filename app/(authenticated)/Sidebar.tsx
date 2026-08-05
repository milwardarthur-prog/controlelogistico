"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  PlusCircle,
  Calendar,
  Printer,
  History,
  Wrench,
  Tv,
  LogOut,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  role: "ADMIN" | "TECNICO";
  nome: string;
};

// Barra lateral com navegação condicionada ao papel do usuário
export function Sidebar({ role, nome }: Props) {
  const pathname = usePathname();

  const itens = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "TECNICO"] },
    { href: "/cards/novo", label: "Novo Card", icon: PlusCircle, roles: ["ADMIN"] },
    { href: "/calendario", label: "Calendário", icon: Calendar, roles: ["ADMIN", "TECNICO"] },
    { href: "/impressao", label: "Impressão", icon: Printer, roles: ["ADMIN"] },
    { href: "/historico", label: "Histórico", icon: History, roles: ["ADMIN", "TECNICO"] },
    { href: "/manutencao", label: "Manutenção", icon: Wrench, roles: ["ADMIN", "TECNICO"] },
  ].filter((i) => i.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Controle Logístico</p>
          <p className="text-xs text-slate-500">{nome}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {itens.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                ativo
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Painel TV é rota pública, abre em nova aba */}
        <a
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          <Tv className="h-4 w-4" />
          Painel TV
        </a>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <span className="mb-2 block px-3 text-xs font-semibold uppercase text-slate-400">
          {role === "ADMIN" ? "Administrador" : "Técnico"}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
