"use client";

import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Users, Calendar, Store, ClipboardList } from "lucide-react";

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
      {/* Conteúdo da Página Atual */}
      <main className="flex-1 pb-20">{children}</main>

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
                    ? "text-pink-600 font-semibold"
                    : "text-gray-500 hover:text-gray-900 font-normal"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-pink-600" : "text-gray-400"}`} />
                <span className="text-[10px] truncate px-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}