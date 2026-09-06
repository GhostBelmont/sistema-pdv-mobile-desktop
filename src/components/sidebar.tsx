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
  BarChart3,
  Store
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { currentTenant } from '@/config/tenant' // Importando as configs do cliente

export function Sidebar() {
  const pathname = usePathname()

  // Montando os itens do menu baseados nas labels configuradas para o cliente atual
  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: currentTenant.labels.clientes, href: '/clientes', icon: Building2 },
    { name: 'Visitas / Agenda', href: '/visitas', icon: Calendar },
    { name: currentTenant.labels.produtos, href: '/estoque', icon: Package },
    { name: 'Catálogo', href: '/catalogo', icon: BookOpen },
    { name: currentTenant.labels.vendas, href: '/vendas', icon: ShoppingCart },
    { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  ]

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen border-r border-slate-800">
      {/* Topo com o Logo ERF PDV */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg font-bold text-sm tracking-wider">
            ERF
          </div>
          <span>ERF <span className="text-indigo-400">PDV</span></span>
        </h1>
      </div>

      {/* Indicador do Cliente Atual (Ex: Raiz Latina / Loja de Roupas) */}
      <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
        <Store className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
        <span className="truncate font-medium text-slate-300" title={currentTenant.name}>
          {currentTenant.name}
        </span>
      </div>

      {/* Menu de navegação */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}