import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ImpressaoClient } from "./ImpressaoClient";

// Modo impressão (somente ADMIN)
export default async function ImpressaoPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return <ImpressaoClient />;
}
