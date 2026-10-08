import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nomeDoUsuario, registrarAtividade } from "@/lib/atividades";
import { formatarData } from "@/lib/utils";

// DELETE /api/manutencao/[id] — remove uma manutenção (somente ADMIN).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  const existente = await prisma.manutencaoVeiculo.findUnique({ where: { id: params.id } });
  await prisma.manutencaoVeiculo.delete({ where: { id: params.id } });
  if (existente) {
    await registrarAtividade({
      usuario: nomeDoUsuario(session),
      acao: "MANUTENCAO_EXCLUIDA",
      entidade: "MANUTENCAO",
      resumo: `${existente.veiculo} · ${formatarData(existente.inicio)} a ${formatarData(existente.fim)}`,
    });
  }
  return NextResponse.json({ ok: true });
}
