"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Users, Calendar, Store, ClipboardList } from "lucide-react";
import { currentTenant } from "@/config/tenant"; // Importando as configs do cliente atual

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    {
      label: "Catálogo",
      href: "/mobile/catalogo",
      icon: Store,
    },
    {
      label: "Carrinho",
      href: "/mobile/pdv",
      icon: ShoppingBag,
    },
    {
      label: "Pedidos",
      href: "/mobile/pedidos",
      icon: ClipboardList,
    },
    {
      label: "Clientes",
      href: "/mobile/clientes",
      icon: Users,
    },
    {
      label: "Visitas",
      href: "/mobile/visitas",
      icon: Calendar,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      {/* Cabeçalho Fixo Superior Mobile - Padronizado ERF PDV */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative h-7 w-7 bg-white rounded-md flex items-center justify-center p-0.5 overflow-hidden shrink-0 border border-gray-100 shadow-xs">
            <Image 
              src="/images/logo-simbolo.png" 
              alt="Símbolo ERF" 
              width={22} 
              height={22} 
              className="object-contain"
            />
          </div>
          <h1 className="text-base font-bold tracking-tight text-gray-900">
            ERF <span className="text-indigo-600">PDV</span>
          </h1>
        </div>

        {/* Assinatura compacta superior da desenvolvedora */}
        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
          <Image 
            src="/images/logo-simbolo.png" 
            alt="RFH Tech IT" 
            width={14} 
            height={14} 
            className="object-contain"
          />
          <span className="text-[9px] font-bold text-gray-600 tracking-wider">
            RFH TECH IT
          </span>
        </div>
      </header>

      {/* Faixa com o Nome do Cliente Atual (Customizável por Tenant) */}
      <div className="bg-indigo-900 text-indigo-100 px-4 py-1.5 flex items-center justify-between text-xs shadow-inner">
        <div className="flex items-center gap-1.5 truncate">
          <Store className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
          <span className="font-medium truncate tracking-wide">
            {currentTenant.name}
          </span>
        </div>
        <span className="text-[10px] bg-indigo-800/80 text-indigo-200 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider shrink-0">
          Ativo
        </span>
      </div>

      {/* Conteúdo da Página Atual */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Rodapé sutil com a assinatura corporativa antes da barra de navegação */}
      <footer className="fixed bottom-16 left-0 right-0 z-20 bg-gray-100/90 backdrop-blur-xs py-1 border-t border-gray-200 text-center">
        <p className="text-[10px] text-gray-500 font-medium">
          Desenvolvido por <span className="font-bold text-gray-700">RFH TECH IT</span>
        </p>
      </footer>

      {/* Barra de Navegação Inferior Fixa */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                  isActive
                    ? "text-indigo-600 font-semibold"
                    : "text-gray-500 hover:text-gray-900 font-normal"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                <span className="text-[10px] truncate px-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}