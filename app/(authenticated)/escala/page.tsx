import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EscalaClient } from "./EscalaClient";

export default async function EscalaPage() {
  const session = await getServerSession(authOptions);
  return <EscalaClient podeEditar={session?.user.role === "ADMIN"} />;
}
