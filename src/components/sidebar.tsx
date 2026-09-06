'use client'

import Link from 'next/link'
import Image from 'next/image'
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
import { currentTenant } from '@/config/tenant'

export function Sidebar() {
  const pathname = usePathname()

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
      {/* Topo com o Símbolo Vermelho no lugar do bloco azul + ERF PDV */}
      <div className="p-5 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          {/* Símbolo Vermelho do Infinito / Logo Símbolo */}
          <div className="relative h-8 w-8 bg-white rounded-md flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
            <Image 
              src="/images/logo-simbolo.png" // Ajuste o nome do arquivo se necessário (ex: /logo-simbolo.jpg)
              alt="Símbolo ERF" 
              width={24} 
              height={24} 
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            ERF <span className="text-indigo-400">PDV</span>
          </h1>
        </div>

        {/* Assinatura da Empresa Desenvolvedora (Logotipo Completo) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
          <div className="relative h-7 w-7 bg-white rounded flex items-center justify-center p-0.5 overflow-hidden shrink-0">
            <Image 
              src="/images/logo.jpg" // O logotipo completo da RFH Tech IT
              alt="RFH Tech IT" 
              width={28} 
              height={28} 
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold leading-none">
              Desenvolvido por
            </span>
            <span className="text-xs font-bold text-slate-200 tracking-wide mt-0.5">
              RFH TECH IT
            </span>
          </div>
        </div>
      </div>

      {/* Indicador do Cliente Atual (Ex: Raiz Latina / Loja de Roupas) */}
      <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
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