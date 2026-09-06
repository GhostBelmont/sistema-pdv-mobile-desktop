'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Package, 
  AlertTriangle, 
  ShoppingBag, 
  ArrowDownRight, 
  ArrowUpRight, 
  DollarSign, 
  Clock, 
  Receipt, 
  User, 
  CheckCircle2 
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MetricCardProps {
  title: string
  value: string
  description?: string
  icon: React.ElementType
  colorClass: string
  onClick?: () => void
  clickable?: boolean
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  colorClass,
  onClick,
  clickable = false,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-2xl border shadow-sm space-y-2 transition-all ${
        clickable ? 'cursor-pointer hover:border-amber-400 hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <div className={`p-2 rounded-xl ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <h3 className="text-xl font-extrabold text-slate-900">{value}</h3>
        {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  const [totalProdutosVendidos, setTotalProdutosVendidos] = useState(0)
  const [produtosBaixoEstoque, setProdutosBaixoEstoque] = useState(0)
  const [quantidadePedidos, setQuantidadePedidos] = useState(0)
  const [vendasConcluidas, setVendasConcluidas] = useState(0)
  const [vendasCanceladas, setVendasCanceladas] = useState(0)
  
  const [totalEntrada, setTotalEntrada] = useState(0)
  const [totalSaida, setTotalSaida] = useState(0)
  const [totalFaturado, setTotalFaturado] = useState(0)

  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([])
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([])
  const [topProdutos, setTopProdutos] = useState<any[]>([])

  async function carregarDashboard() {
    setLoading(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      
      const { data: agendamentos } = await supabase
        .from('appointments')
        .select('*, clients(name), services(name)')
        .gte('start_time', `${hoje}T00:00:00`)
        .lte('start_time', `${hoje}T23:59:59`)
        .order('start_time', { ascending: true })

      if (agendamentos) {
        const agendamentosFiltrados = agendamentos.filter(item => {
          const titulo = String(item.title || item.services?.name || '').toLowerCase()
          return !titulo.includes('entrega de pedido')
        })
        setAgendamentosHoje(agendamentosFiltrados)
      } else {
        setAgendamentosHoje([])
      }

      const { data: produtos } = await supabase.from('products').select('*')
      if (produtos) {
        const comEstoqueBaixo = produtos.filter(
          (p) => p.stock_quantity <= (p.min_stock_quantity || 5)
        )
        setProdutosBaixoEstoque(comEstoqueBaixo.length)
      }

      let { data: transacoes } = await supabase.from('transactions').select('*')
      if (!transacoes || transacoes.length === 0) {
        const { data: cashFlow } = await supabase.from('cash_flow').select('*')
        if (cashFlow) transacoes = cashFlow
      }

      let somaEntradas = 0
      let somaSaidas = 0
      if (transacoes && transacoes.length > 0) {
        transacoes.forEach((t) => {
          const valor = Number(t.amount || t.value || t.valor) || 0
          const tipo = String(t.type || t.tipo || '').toLowerCase()
          if (tipo === 'entrada' || tipo === 'receita' || tipo === 'income') {
            somaEntradas += valor
          } else if (tipo === 'saida' || tipo === 'despesa' || tipo === 'outcome' || tipo === 'expense') {
            somaSaidas += valor
          }
        })
      }

      setTotalEntrada(somaEntradas)
      setTotalSaida(somaSaidas)
      setTotalFaturado(somaEntradas - somaSaidas)

      const { data: vendas } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })

      if (vendas) {
        setQuantidadePedidos(vendas.length)
        const concluidas = vendas.filter(v => v.payment_status !== 'cancelled').length
        const canceladas = vendas.filter(v => v.payment_status === 'cancelled').length
        setVendasConcluidas(concluidas)
        setVendasCanceladas(canceladas)
        setUltimasVendas(vendas.slice(0, 5))
      }

      const { data: itensVendidos } = await supabase
        .from('sale_items')
        .select('product_id, quantity, products(name, image_url)')

      if (itensVendidos && itensVendidos.length > 0) {
        let qtdTotalVendida = 0
        const agrupar: Record<string, { name: string; image_url?: string; totalQtd: number }> = {}

        itensVendidos.forEach((item: any) => {
          qtdTotalVendida += item.quantity
          const id = item.product_id
          const nome = item.products?.name || 'Produto Removido'
          const img = item.products?.image_url

          if (!agrupar[id]) {
            agrupar[id] = { name: nome, image_url: img, totalQtd: 0 }
          }
          agrupar[id].totalQtd += item.quantity
        })

        setTotalProdutosVendidos(qtdTotalVendida)

        const ranking = Object.values(agrupar)
          .sort((a, b) => b.totalQtd - a.totalQtd)
          .slice(0, 5)

        setTopProdutos(ranking)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDashboard()
  }, [])

  return (
    <div className="space-y-6 pb-12 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Visão Geral / Dashboard
          </h1>
          <p className="text-slate-500">
            Acompanhe as métricas operacionais, financeiras e agenda em tempo real.
          </p>
        </div>
        <Button onClick={carregarDashboard} variant="outline" size="sm" className="gap-2">
          Atualizar Dados
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Prod. Vendidos"
          value={`${totalProdutosVendidos} un.`}
          description="Itens comercializados"
          icon={Package}
          colorClass="bg-blue-50 text-blue-600"
        />
        <MetricCard
          title="Alerta Estoque"
          value={`${produtosBaixoEstoque} prod.`}
          description="Clique para gerenciar"
          icon={AlertTriangle}
          colorClass={produtosBaixoEstoque > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}
          clickable
          onClick={() => router.push('/estoque')}
        />
        <MetricCard
          title="Qtd. Pedidos"
          value={String(quantidadePedidos)}
          description={`${vendasConcluidas} concluídas | ${vendasCanceladas} canceladas`}
          icon={ShoppingBag}
          colorClass="bg-purple-50 text-purple-600"
        />
        <MetricCard
          title="Total Entrada"
          value={`R$ ${totalEntrada.toFixed(2).replace('.', ',')}`}
          description="Receita bruta obtida"
          icon={ArrowUpRight}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="Total Saída"
          value={`R$ ${totalSaida.toFixed(2).replace('.', ',')}`}
          description="Despesas operacionais"
          icon={ArrowDownRight}
          colorClass="bg-rose-50 text-rose-600"
        />
        <MetricCard
          title="Total Faturado"
          value={`R$ ${totalFaturado.toFixed(2).replace('.', ',')}`}
          description="Saldo atual em caixa"
          icon={DollarSign}
          colorClass="bg-indigo-50 text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" /> Agendamentos de Hoje
            </h2>
            <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
              {agendamentosHoje.length}
            </span>
          </div>

          {loading ? (
            <p className="text-center py-6 text-slate-400 text-xs">Carregando agendamentos...</p>
          ) : agendamentosHoje.length === 0 ? (
            <div className="text-center py-8 space-y-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="text-slate-600 font-medium text-xs">Sem agendamentos para hoje.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {agendamentosHoje.map((item) => {
                const hora = item.start_time
                  ? new Date(item.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '00:00'
                const nomeCliente = item.clients?.name || 'Cliente'
                const nomeServico = item.services?.name || item.title || 'Atendimento'

                return (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 px-2 rounded-lg bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center">
                        {hora}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" /> {nomeCliente}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">{nomeServico}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" /> Vendas Feitas
            </h2>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
              {ultimasVendas.length} Recentes
            </span>
          </div>

          {loading ? (
            <p className="text-center py-6 text-slate-400 text-xs">Carregando vendas...</p>
          ) : ultimasVendas.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs">Nenhuma venda registrada.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {ultimasVendas.map((venda) => {
                const isCancelada = venda.payment_status === 'cancelled'

                return (
                  <div key={venda.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold ${isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          Pedido #{venda.id.slice(0, 8)}
                        </p>
                        {isCancelada && (
                          <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            Cancelada
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {new Date(venda.created_at).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(venda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-xs font-extrabold ${isCancelada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      R$ {Number(venda.total_amount).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" /> Produtos Mais Vendidos
            </h2>
          </div>

          {loading ? (
            <p className="text-center py-6 text-slate-400 text-xs">Carregando ranking...</p>
          ) : topProdutos.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs">Sem dados suficientes.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {topProdutos.map((prod, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 border overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</p>
                      <p className="text-[10px] text-slate-400">{prod.totalQtd} un. vendidas</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}