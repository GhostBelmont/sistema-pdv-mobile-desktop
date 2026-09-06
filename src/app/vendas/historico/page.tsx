'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Search,
  Eye,
  Trash2,
  Receipt,
  ArrowLeft,
  DollarSign,
  ShoppingBag,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface SaleItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  products: {
    name: string
  } | null
}

interface Sale {
  id: string
  created_at: string
  total_amount: number
  payment_method: string
  payment_status: string
  clients: {
    name: string
    company_name?: string
  } | null
  sale_items: SaleItem[]
}

export default function HistoricoVendasPage() {
  const [vendas, setVendas] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [dataFiltro, setDataFiltro] = useState('')

  // Modal de Detalhes
  const [vendaSelecionada, setVendaSelecionada] = useState<Sale | null>(null)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  async function carregarVendas() {
    setLoading(true)

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        created_at,
        total_amount,
        payment_method,
        payment_status,
        clients (
          name,
          company_name
        ),
        sale_items (
          id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          products (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar vendas:', error)
      alert('Erro ao carregar vendas: ' + error.message)
    } else if (data) {
      setVendas(data as unknown as Sale[])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarVendas()
  }, [])

  // Cancelar / Estornar Venda (Atualizando o status para 'cancelled' sem apagar o registro)
  async function handleCancelarVenda(venda: Sale) {
    if (venda.payment_status === 'cancelled') {
      alert('Esta venda já está cancelada.')
      return
    }

    const confirmar = confirm(
      `Deseja realmente cancelar a Venda #${venda.id.substring(0, 8)}?\n\n` +
      `Isso irá:\n` +
      `1. Devolver os produtos ao estoque.\n` +
      `2. Remover a receita do fluxo financeiro.\n` +
      `3. Marcar a venda como CANCELADA no histórico.`
    )

    if (!confirmar) return

    setCancelandoId(venda.id)

    try {
      // 1. Estornar Estoque
      for (const item of venda.sale_items) {
        if (!item.product_id) continue

        const { data: prod } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single()

        const estoqueAtual = prod?.stock_quantity ?? 0

        await supabase
          .from('products')
          .update({ stock_quantity: estoqueAtual + item.quantity })
          .eq('id', item.product_id)
      }

      // 2. Remover do Fluxo Financeiro (Apaga o lançamento de caixa vinculado)
      const { error: errCashFlow } = await supabase
        .from('cash_flow')
        .delete()
        .eq('sale_id', venda.id)

      if (errCashFlow) {
        console.warn('Aviso sobre fluxo de caixa:', errCashFlow.message)
      }

      // 3. Atualizar estritamente o status da Venda para "cancelled" (Sem deletar a venda)
      const { error: errUpdate } = await supabase
        .from('sales')
        .update({ payment_status: 'cancelled' })
        .eq('id', venda.id)

      if (errUpdate) throw errUpdate

      alert('Venda cancelada com sucesso! Estoque estornado e financeiro atualizado.')
      if (vendaSelecionada?.id === venda.id) setVendaSelecionada(null)
      carregarVendas()
    } catch (err: any) {
      alert('Erro ao cancelar venda: ' + err.message)
    } finally {
      setCancelandoId(null)
    }
  }

  // Filtragem local
  const vendasFiltradas = vendas.filter((venda) => {
    const nomeCliente = venda.clients?.name || venda.clients?.company_name || 'Cliente Avulso'
    const codigoVenda = venda.id.substring(0, 8)
    const dataVenda = venda.created_at.split('T')[0]

    const bateBusca =
      nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
      codigoVenda.toLowerCase().includes(busca.toLowerCase())

    const bateData = dataFiltro ? dataVenda === dataFiltro : true

    return bateBusca && bateData
  })

  // Cálculos de Resumo dos Filtros (Ignora vendas canceladas)
  const totalFiltrado = vendasFiltradas
    .filter((v) => v.payment_status !== 'cancelled')
    .reduce((acc, v) => acc + Number(v.total_amount), 0)

  const formatarMetodoPagamento = (metodo: string) => {
    switch (metodo) {
      case 'pix':
        return 'PIX'
      case 'credit_card':
        return 'Cartão Crédito'
      case 'debit_card':
        return 'Cartão Débito'
      case 'cash':
        return 'Dinheiro'
      default:
        return metodo || 'N/A'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/vendas">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Consulte vendas realizadas, veja os itens de cada pedido ou faça estornos.
          </p>
        </div>

        <Link href="/vendas">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <ShoppingBag className="mr-2 h-4 w-4" /> Ir para PDV
          </Button>
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {dataFiltro ? `Vendas em ${new Date(dataFiltro + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Total das Vendas Ativas'}
            </p>
            <p className="text-2xl font-bold text-indigo-600">R$ {totalFiltrado.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Qtd. de Pedidos</p>
            <p className="text-2xl font-bold text-slate-800">{vendasFiltradas.length} venda(s)</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-full text-slate-600">
            <Receipt className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filtros de Pesquisa */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente ou código da venda (#12345678)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="sm:w-48 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <Input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
          />
        </div>

        {(busca || dataFiltro) && (
          <Button
            variant="ghost"
            onClick={() => {
              setBusca('')
              setDataFiltro('')
            }}
            className="text-xs text-slate-500"
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código / Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Qtd. Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  Carregando vendas...
                </TableCell>
              </TableRow>
            ) : vendasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  Nenhuma venda encontrada para os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              vendasFiltradas.map((venda) => {
                const isCancelada = venda.payment_status === 'cancelled'

                return (
                  <TableRow key={venda.id} className={isCancelada ? 'bg-red-50/40 opacity-75' : ''}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        #{venda.id.substring(0, 8)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(venda.created_at).toLocaleString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {venda.clients?.company_name
                        ? `${venda.clients.company_name} (${venda.clients.name})`
                        : venda.clients?.name || 'Cliente Avulso'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {formatarMetodoPagamento(venda.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {isCancelada ? (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 uppercase text-[10px]">
                          Cancelada
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 uppercase text-[10px]">
                          Concluída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {venda.sale_items?.reduce((a, b) => a + b.quantity, 0) || 0}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${isCancelada ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      R$ {Number(venda.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVendaSelecionada(venda)}
                          className="h-8 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </Button>
                        {!isCancelada && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={cancelandoId === venda.id}
                            onClick={() => handleCancelarVenda(venda)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Cancelar / Estornar Venda"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Detalhamento da Venda */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">
                    Detalhes da Venda #{vendaSelecionada.id.substring(0, 8)}
                  </h3>
                  {vendaSelecionada.payment_status === 'cancelled' && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 uppercase text-[10px]">
                      Cancelada
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Realizada em: {new Date(vendaSelecionada.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVendaSelecionada(null)}
              >
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-md border">
                <div>
                  <span className="text-slate-500 block text-xs">Cliente</span>
                  <span className="font-semibold text-slate-800">
                    {vendaSelecionada.clients?.name || 'Cliente Avulso'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Forma de Pagamento</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {formatarMetodoPagamento(vendaSelecionada.payment_method)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Itens da Venda
                </h4>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Preço Un.</TableHead>
                        <TableHead className="text-center">Qtd.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendaSelecionada.sale_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-800">
                            {item.products?.name || 'Produto Removido'}
                          </TableCell>
                          <TableCell className="text-center text-slate-600">
                            R$ {Number(item.unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            R$ {Number(item.subtotal).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-base font-semibold text-slate-700">Total Geral</span>
                <span className={`text-2xl font-bold ${vendaSelecionada.payment_status === 'cancelled' ? 'line-through text-slate-400' : 'text-indigo-600'}`}>
                  R$ {Number(vendaSelecionada.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
              {vendaSelecionada.payment_status !== 'cancelled' ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelarVenda(vendaSelecionada)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Cancelar / Estornar Venda
                </Button>
              ) : (
                <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
                  <XCircle className="h-4 w-4" /> Esta venda já foi estornada.
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVendaSelecionada(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}