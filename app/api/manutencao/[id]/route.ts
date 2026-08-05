import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE /api/manutencao/[id] — remove uma manutenção (somente ADMIN).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  await prisma.manutencaoVeiculo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
