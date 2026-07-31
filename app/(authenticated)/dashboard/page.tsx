import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  return <DashboardClient role={session!.user.role as "ADMIN" | "TECNICO"} />;
}
