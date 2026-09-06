'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Search,
  Download,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  XCircle,
  Eye,
  Filter,
  FileSpreadsheet,
  FileText,
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

interface SaleItem {
  id: string
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

export default function RelatoriosVendasPage() {
  const [vendas, setVendas] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros principais da tela
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [pagamentoFiltro, setPagamentoFiltro] = useState('todos')
  
  // Datas padrão (Mês atual)
  const dataAtual = new Date()
  const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).toISOString().split('T')[0]
  const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).toISOString().split('T')[0]

  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(ultimoDiaMes)

  // Modal de Detalhes e Modal de Exportação
  const [vendaSelecionada, setVendaSelecionada] = useState<Sale | null>(null)
  const [modalExportarAberto, setModalExportarAberto] = useState(false)

  // Filtros internos específicos do Modal de Exportação
  const [statusExportFiltro, setStatusExportFiltro] = useState('todos')
  const [pagamentoExportFiltro, setPagamentoExportFiltro] = useState('todos')

  async function carregarVendas() {
    setLoading(true)

    let query = supabase
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
          quantity,
          unit_price,
          subtotal,
          products (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (dataInicio) {
      query = query.gte('created_at', `${dataInicio}T00:00:00`)
    }
    if (dataFim) {
      query = query.lte('created_at', `${dataFim}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao carregar relatório de vendas:', error)
      alert('Erro ao carregar dados do relatório.')
    } else if (data) {
      setVendas(data as unknown as Sale[])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarVendas()
  }, [dataInicio, dataFim])

  // Função para definir períodos rápidos
  const definirPeriodo = (tipo: 'mes' | '30d' | 'ano') => {
    const hoje = new Date()
    let inicio = ''
    let fim = hoje.toISOString().split('T')[0]

    if (tipo === 'mes') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
    } else if (tipo === '30d') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      inicio = d.toISOString().split('T')[0]
    } else if (tipo === 'ano') {
      inicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0]
    }

    setDataInicio(inicio)
    setDataFim(fim)
  }

  // Filtragem principal da tela
  const vendasFiltradas = vendas.filter((venda) => {
    const nomeCliente = venda.clients?.name || venda.clients?.company_name || 'Cliente não informado'
    const codigoVenda = venda.id.substring(0, 8)

    const bateBusca =
      nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
      codigoVenda.toLowerCase().includes(busca.toLowerCase())

    const statusVenda = venda.payment_status === 'cancelled' ? 'cancelled' : 'completed'
    const bateStatus = statusFiltro === 'todos' || statusVenda === statusFiltro

    const batePagamento = pagamentoFiltro === 'todos' || venda.payment_method === pagamentoFiltro

    return bateBusca && bateStatus && batePagamento
  })

  // Filtragem específica para o Modal de Exportação
  const vendasParaExportar = vendas.filter((venda) => {
    const statusVenda = venda.payment_status === 'cancelled' ? 'cancelled' : 'completed'
    const bateStatus = statusExportFiltro === 'todos' || statusVenda === statusExportFiltro
    const batePagamento = pagamentoExportFiltro === 'todos' || venda.payment_method === pagamentoExportFiltro
    return bateStatus && batePagamento
  })

  // Cálculos para os Cards de Resumo
  const totalVendasQtd = vendasFiltradas.length

  const faturamentoTotal = vendasFiltradas
    .filter((v) => v.payment_status !== 'cancelled')
    .reduce((acc, v) => acc + Number(v.total_amount), 0)

  const valorCanceladoTotal = vendasFiltradas
    .filter((v) => v.payment_status === 'cancelled')
    .reduce((acc, v) => acc + Number(v.total_amount), 0)

  const vendasAtivas = vendasFiltradas.filter((v) => v.payment_status !== 'cancelled')
  const ticketMedio = vendasAtivas.length > 0 ? faturamentoTotal / vendasAtivas.length : 0

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

  // Ação de Exportar para Excel (CSV)
  const executarExportacaoExcel = () => {
    let csvContent = 'data:text/csv;charset=utf-8,' 
      + 'ID Venda,Data,Cliente,Forma Pagamento,Status,Valor Total\n'

    vendasParaExportar.forEach((v) => {
      const id = `#${v.id.substring(0, 8)}`
      const data = new Date(v.created_at).toLocaleDateString('pt-BR')
      const cliente = v.clients?.name || v.clients?.company_name || 'Cliente não informado'
      const pagamento = formatarMetodoPagamento(v.payment_method)
      const status = v.payment_status === 'cancelled' ? 'Cancelada' : 'Concluída'
      const valor = Number(v.total_amount).toFixed(2)

      csvContent += `"${id}","${data}","${cliente}","${pagamento}","${status}","${valor}"\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_vendas_${dataInicio}_ate_${dataFim}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setModalExportarAberto(false)
  }

  // Ação de Exportar para PDF (Gera visualização de impressão formatada)
  const executarExportacaoPDF = () => {
    const janelaPrint = window.open('', '_blank')
    if (!janelaPrint) return

    const htmlConteudo = `
      <html>
        <head>
          <title>Relatório de Vendas</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
            h2 { margin-bottom: 5px; color: #111; }
            p { color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; }
            .text-right { text-align: right; }
            .badge { padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .completed { background: #d1fae5; color: #065f46; }
            .cancelled { background: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <h2>Relatório de Vendas</h2>
          <p>Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} até ${new Date(dataFim).toLocaleDateString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                <th>ID Venda</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th class="text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${vendasParaExportar.map(v => {
                const isCancelada = v.payment_status === 'cancelled'
                return `
                  <tr>
                    <td>#${v.id.substring(0, 8)}</td>
                    <td>${new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>${v.clients?.name || v.clients?.company_name || 'Cliente não informado'}</td>
                    <td>${formatarMetodoPagamento(v.payment_method)}</td>
                    <td><span class="badge ${isCancelada ? 'cancelled' : 'completed'}">${isCancelada ? 'Cancelada' : 'Concluída'}</span></td>
                    <td class="text-right">R$ ${Number(v.total_amount).toFixed(2)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `

    janelaPrint.document.write(htmlConteudo)
    janelaPrint.document.close()
    setModalExportarAberto(false)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatório de Vendas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Acompanhamento de pedidos, faturamento e desempenho comercial.
          </p>
        </div>

        <Button 
          onClick={() => {
            setStatusExportFiltro(statusFiltro)
            setPagamentoExportFiltro(pagamentoFiltro)
            setModalExportarAberto(true)
          }} 
          className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
        >
          <Download className="h-4 w-4" /> Exportar Relatório
        </Button>
      </div>

      {/* Seção de Período e Filtros de Data */}
      <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" /> Período:
            </span>
            <Button
              variant={dataInicio === primeiroDiaMes ? 'default' : 'outline'}
              size="sm"
              onClick={() => definirPeriodo('mes')}
              className={dataInicio === primeiroDiaMes ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
            >
              Mês Atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => definirPeriodo('30d')}
            >
              Últimos 30 Dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => definirPeriodo('ano')}
            >
              Este Ano
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-38 text-xs h-9"
              />
              <span>até</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-38 text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Filtros Secundários com Select Nativo padronizado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="todos">Todos os Status</option>
            <option value="completed">Concluída</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <select
            value={pagamentoFiltro}
            onChange={(e) => setPagamentoFiltro(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="todos">Todas as Formas de Pagamento</option>
            <option value="pix">PIX</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="debit_card">Cartão de Débito</option>
            <option value="cash">Dinheiro</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou ID..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* 4 Cards de Resumo Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">TOTAL DE VENDAS</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalVendasQtd}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">FATURAMENTO TOTAL</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">R$ {faturamentoTotal.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">TICKET MÉDIO</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">R$ {ticketMedio.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">VALOR CANCELADO</p>
            <p className="text-2xl font-bold text-red-600 mt-1">R$ {valorCanceladoTotal.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Lista de Vendas */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Lista de Vendas ({vendasFiltradas.length})</h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Venda</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  Carregando relatório...
                </TableCell>
              </TableRow>
            ) : vendasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  Nenhuma venda encontrada no período ou filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              vendasFiltradas.map((venda) => {
                const isCancelada = venda.payment_status === 'cancelled'

                return (
                  <TableRow key={venda.id} className={isCancelada ? 'bg-red-50/30' : ''}>
                    <TableCell className="font-semibold text-indigo-600">
                      #{venda.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {new Date(venda.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {venda.clients?.name || venda.clients?.company_name || 'Cliente não informado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {formatarMetodoPagamento(venda.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {isCancelada ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-[10px]">
                          ⊗ Cancelada
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px]">
                          ✓ Concluída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${isCancelada ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      R$ {Number(venda.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVendaSelecionada(venda)}
                        className="h-8 text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Detalhes da Venda */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">
                  Venda #{vendaSelecionada.id.substring(0, 8)}
                </h3>
                <p className="text-xs text-slate-500">
                  Realizada em: {new Date(vendaSelecionada.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setVendaSelecionada(null)}>
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm bg-slate-50 p-3 rounded-lg border space-y-1">
                <p><strong className="text-slate-600">Cliente:</strong> {vendaSelecionada.clients?.name || 'Não informado'}</p>
                <p><strong className="text-slate-600">Pagamento:</strong> {formatarMetodoPagamento(vendaSelecionada.payment_method)}</p>
                <p><strong className="text-slate-600">Status:</strong> {vendaSelecionada.payment_status === 'cancelled' ? 'Cancelada' : 'Concluída'}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Itens</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendaSelecionada.sale_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-800">
                            {item.products?.name || 'Produto Removido'}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
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
                <span className="font-semibold text-slate-700">Valor Total</span>
                <span className={`text-xl font-bold ${vendaSelecionada.payment_status === 'cancelled' ? 'line-through text-slate-400' : 'text-indigo-600'}`}>
                  R$ {Number(vendaSelecionada.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setVendaSelecionada(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportação Avançada (Com Excel e PDF idêntico às outras telas) */}
      {modalExportarAberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Relatório de Vendas</h3>
                <p className="text-xs text-slate-400">Opções de Exportação e Filtros</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setModalExportarAberto(false)}
                className="text-white hover:bg-slate-800"
              >
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Filter className="h-4 w-4 text-indigo-600" />
                <span>FILTRAR DADOS PARA EXPORTAÇÃO</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Status da Venda:</label>
                  <select
                    value={statusExportFiltro}
                    onChange={(e) => setStatusExportFiltro(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="completed">Concluída</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Forma de Pagamento:</label>
                  <select
                    value={pagamentoExportFiltro}
                    onChange={(e) => setPagamentoExportFiltro(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="todos">Todas as Formas</option>
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-100 text-indigo-700 p-3 rounded-lg text-center text-sm font-medium">
                Serão exportados <strong>{vendasParaExportar.length}</strong> registro(s) com os filtros atuais.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalExportarAberto(false)}
              >
                Cancelar
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={executarExportacaoExcel}
                  disabled={vendasParaExportar.length === 0}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
                </Button>

                <Button
                  onClick={executarExportacaoPDF}
                  disabled={vendasParaExportar.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                >
                  <FileText className="h-4 w-4" /> Exportar PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}