'use client'

import Link from 'next/link'
import {
  DollarSign,
  ShoppingCart,
  CalendarCheck,
  Building2,
  ArrowRight,
} from 'lucide-react'

const modulosRelatorios = [
  {
    titulo: 'Financeiro',
    descricao: 'DRE simplificado, entradas, saídas, lucro líquido e categorias.',
    href: '/relatorios/financeiro',
    icone: DollarSign,
    corIcone: 'text-emerald-600 bg-emerald-50',
    borderHover: 'hover:border-emerald-300',
  },
  {
    titulo: 'Vendas & Pedidos',
    descricao: 'Faturamento total, ticket médio, histórico de vendas e mais vendidose.',
    href: '/relatorios/vendas',
    icone: ShoppingCart,
    corIcone: 'text-indigo-600 bg-indigo-50',
    borderHover: 'hover:border-indigo-300',
  },
  {
    titulo: 'Visitas & Agenda',
    descricao: 'Relatórios de atendimentos, agendamentos e produtividade.',
    href: '/relatorios/agendamentos',
    icone: CalendarCheck,
    corIcone: 'text-blue-600 bg-blue-50',
    borderHover: 'hover:border-blue-300',
  },
  {
    titulo: 'Salões & Clientes',
    descricao: 'Filtro por localização (cidade/UF), perfil PF/PJ e carteira.',
    href: '/relatorios/clientes',
    icone: Building2,
    corIcone: 'text-purple-600 bg-purple-50',
    borderHover: 'hover:border-purple-300',
  },
]

export default function RelatoriosPage() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Central de Relatórios
        </h1>
        <p className="text-sm text-slate-500">
          Selecione uma área abaixo para acessar as métricas e análises do seu negócio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modulosRelatorios.map((modulo) => {
          const Icone = modulo.icone
          return (
            <Link
              key={modulo.href}
              href={modulo.href}
              className={`bg-white p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between group ${modulo.borderHover}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${modulo.corIcone}`}>
                    <Icone className="h-6 w-6" />
                  </div>
                  <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {modulo.titulo}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {modulo.descricao}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t text-xs font-semibold text-indigo-600 flex items-center gap-1">
                Acessar relatório →
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}