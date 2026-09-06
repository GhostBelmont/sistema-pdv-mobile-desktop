'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Building2, 
  Calendar, 
  Package, 
  ShoppingCart, 
  BookOpen, 
  DollarSign, 
  LayoutDashboard,
  BarChart3 // 👈 Novo ícone
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Salões / Clientes', href: '/clientes', icon: Building2 },
  { name: 'Visitas / Agenda', href: '/visitas', icon: Calendar },
  { name: 'Estoque', href: '/estoque', icon: Package },
  { name: 'Catálogo', href: '/catalogo', icon: BookOpen },
  { name: 'Pedidos / Vendas', href: '/vendas', icon: ShoppingCart },
  { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 }, // 👈 Novo item
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Package className="h-6 w-6 text-indigo-400" />
          Sistema Capilar
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}