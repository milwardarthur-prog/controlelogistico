import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AtividadesClient } from "./AtividadesClient";

export default async function AtividadesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") redirect("/calendario");
  return <AtividadesClient />;
}
