import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CardForm } from "../../CardForm";

// Página de edição de card (somente ADMIN)
export default async function EditarCardPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const card = await prisma.card.findUnique({ where: { id: params.id } });
  if (!card) notFound();

  const inicial = {
    id: card.id,
    tipo: card.tipo,
    data: card.data.toISOString().slice(0, 10),
    horario: card.horario,
    cliente: card.cliente,
    equipamento: card.equipamento,
    tensao: card.tensao ?? "",
    veiculo: card.veiculo ?? "",
    periodo: card.periodo ?? "",
    franquia: card.franquia ?? "",
    local: card.local,
    combustivel: card.combustivel ?? "",
    instalacao: card.instalacao ?? "",
    acessorios: card.acessorios ?? "",
    obs: card.obs ?? "",
    motorista: card.motorista ?? "",
    ajudante: card.ajudante ?? "",
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Editar Card</h1>
      <CardForm inicial={inicial} />
    </div>
  );
}
