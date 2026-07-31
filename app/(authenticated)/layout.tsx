import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

// Layout protegido com barra lateral
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={session.user.role as "ADMIN" | "TECNICO"}
        nome={session.user.name ?? "Usuário"}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
