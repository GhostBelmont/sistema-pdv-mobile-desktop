import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  );

  // Redireciona apenas quando o acesso for na raiz exata
  if (isMobile) {
    redirect("/mobile/catalogo");
  }

  redirect("/dashboard");
}