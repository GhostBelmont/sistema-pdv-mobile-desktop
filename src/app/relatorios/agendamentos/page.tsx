'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Search,
  Download,
  CalendarCheck,
  Clock,
  CheckCircle2,
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

interface Appointment {
  id: string
  title: string
  appointment_date: string
  status: string
  notes: string | null
  created_at: string
  clients: {
    name: string
    company_name?: string
  } | null
}

export default function RelatoriosVisitasPage() {
  const [visitas, setVisitas] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros principais da tela
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  
  // Datas padrão (Mês atual)
  const dataAtual = new Date()
  const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).toISOString().split('T')[0]
  const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).toISOString().split('T')[0]

  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(ultimoDiaMes)

  // Modal de Detalhes e Modal de Exportação
  const [visitaSelecionada, setVisitaSelecionada] = useState<Appointment | null>(null)
  const [modalExportarAberto, setModalExportarAberto] = useState(false)

  // Filtros internos específicos do Modal de Exportação
  const [statusExportFiltro, setStatusExportFiltro] = useState('todos')

  async function carregarVisitas() {
    setLoading(true)

    let query = supabase
      .from('appointments')
      .select(`
        id,
        title,
        appointment_date,
        status,
        notes,
        created_at,
        clients (
          name,
          company_name
        )
      `)
      .order('appointment_date', { ascending: false })

    if (dataInicio) {
      query = query.gte('appointment_date', `${dataInicio}T00:00:00`)
    }
    if (dataFim) {
      query = query.lte('appointment_date', `${dataFim}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao carregar relatório de visitas:', error)
      alert('Erro ao carregar dados do relatório.')
    } else if (data) {
      setVisitas(data as unknown as Appointment[])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarVisitas()
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
  const visitasFiltradas = visitas.filter((visita) => {
    const nomeCliente = visita.clients?.name || visita.clients?.company_name || 'Cliente não informado'
    const tituloVisita = visita.title || ''

    const bateBusca =
      nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
      tituloVisita.toLowerCase().includes(busca.toLowerCase())

    const bateStatus = statusFiltro === 'todos' || visita.status === statusFiltro

    return bateBusca && bateStatus
  })

  // Filtragem específica para o Modal de Exportação
  const visitasParaExportar = visitas.filter((visita) => {
    const bateStatus = statusExportFiltro === 'todos' || visita.status === statusExportFiltro
    return bateStatus
  })

  // Cálculos para os Cards de Resumo
  const totalVisitasQtd = visitasFiltradas.length
  const totalAgendadas = visitasFiltradas.filter((v) => v.status === 'scheduled' || v.status === 'agendada' || !v.status).length
  const totalRealizadas = visitasFiltradas.filter((v) => v.status === 'completed' || v.status === 'realizada').length
  const totalCanceladas = visitasFiltradas.filter((v) => v.status === 'cancelled' || v.status === 'cancelada').length

  const formatarStatus = (status: string) => {
    switch (status) {
      case 'completed':
      case 'realizada':
        return { label: 'Realizada', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
      case 'cancelled':
      case 'cancelada':
        return { label: 'Cancelada', classe: 'bg-red-100 text-red-700 border-red-200' }
      case 'scheduled':
      case 'agendada':
      default:
        return { label: 'Agendada', classe: 'bg-indigo-100 text-indigo-700 border-indigo-200' }
    }
  }

  // Ação de Exportar para Excel (CSV)
  const executarExportacaoExcel = () => {
    let csvContent = 'data:text/csv;charset=utf-8,' 
      + 'Título,Data/Hora,Cliente,Status,Observações\n'

    visitasParaExportar.forEach((v) => {
      const titulo = `"${v.title || ''}"`
      const data = new Date(v.appointment_date).toLocaleString('pt-BR')
      const cliente = `"${v.clients?.name || v.clients?.company_name || 'Cliente não informado'}"`
      const status = formatarStatus(v.status).label
      const notes = `"${(v.notes || '').replace(/"/g, '""')}"`

      csvContent += `${titulo},"${data}",${cliente},"${status}",${notes}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_visitas_${dataInicio}_ate_${dataFim}.csv`)
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
          <title>Relatório de Agendamento de Visitas</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
            h2 { margin-bottom: 5px; color: #111; }
            p { color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; }
            .badge { padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .realizada { background: #d1fae5; color: #065f46; }
            .cancelada { background: #fee2e2; color: #991b1b; }
            .agendada { background: #e0e7ff; color: #3730a3; }
          </style>
        </head>
        <body>
          <h2>Relatório de Agendamento de Visitas</h2>
          <p>Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} até ${new Date(dataFim).toLocaleDateString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                <th>Título / Assunto</th>
                <th>Data e Hora</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${visitasParaExportar.map(v => {
                const statusInfo = formatarStatus(v.status)
                const classeBadge = v.status === 'completed' || v.status === 'realizada' ? 'realizada' : v.status === 'cancelled' || v.status === 'cancelada' ? 'cancelada' : 'agendada'
                return `
                  <tr>
                    <td><b>${v.title}</b></td>
                    <td>${new Date(v.appointment_date).toLocaleString('pt-BR')}</td>
                    <td>${v.clients?.name || v.clients?.company_name || 'Cliente não informado'}</td>
                    <td><span class="badge ${classeBadge}">${statusInfo.label}</span></td>
                    <td>${v.notes || '-'}</td>
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatório de Visitas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Acompanhamento de agendamentos, status de atendimento e histórico de visitas.
          </p>
        </div>

        <Button 
          onClick={() => {
            setStatusExportFiltro(statusFiltro)
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

        {/* Filtros Secundários */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="todos">Todos os Status</option>
            <option value="scheduled">Agendada</option>
            <option value="completed">Realizada</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou título..."
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
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">TOTAL DE VISITAS</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalVisitasQtd}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <CalendarCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">AGENDADAS</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalAgendadas}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">REALIZADAS</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalRealizadas}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wider">CANCELADAS</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{totalCanceladas}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Lista de Visitas */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Lista de Agendamentos ({visitasFiltradas.length})</h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título / Assunto</TableHead>
              <TableHead>Data e Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  Carregando agendamentos...
                </TableCell>
              </TableRow>
            ) : visitasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  Nenhuma visita encontrada no período ou filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              visitasFiltradas.map((visita) => {
                const statusInfo = formatarStatus(visita.status)

                return (
                  <TableRow key={visita.id}>
                    <TableCell className="font-semibold text-slate-800">
                      {visita.title}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {new Date(visita.appointment_date).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {visita.clients?.name || visita.clients?.company_name || 'Cliente não informado'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${statusInfo.classe} text-[10px]`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisitaSelecionada(visita)}
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

      {/* Modal de Detalhes da Visita */}
      {visitaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">{visitaSelecionada.title}</h3>
                <p className="text-xs text-slate-500">
                  Criado em: {visitaSelecionada.created_at ? new Date(visitaSelecionada.created_at).toLocaleString('pt-BR') : 'N/A'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setVisitaSelecionada(null)}>
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm bg-slate-50 p-3 rounded-lg border space-y-2">
                <p><strong className="text-slate-600">Cliente:</strong> {visitaSelecionada.clients?.name || 'Não informado'}</p>
                <p><strong className="text-slate-600">Data e Hora:</strong> {new Date(visitaSelecionada.appointment_date).toLocaleString('pt-BR')}</p>
                <p><strong className="text-slate-600">Status:</strong> {formatarStatus(visitaSelecionada.status).label}</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observações / Notas</h4>
                <div className="bg-slate-50 p-3 rounded-lg border text-sm text-slate-700 min-h-20 whitespace-pre-wrap">
                  {visitaSelecionada.notes || 'Nenhuma observação registrada para esta visita.'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setVisitaSelecionada(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportação Avançada */}
      {modalExportarAberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Relatório de Visitas</h3>
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Status da Visita:</label>
                <select
                  value={statusExportFiltro}
                  onChange={(e) => setStatusExportFiltro(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="scheduled">Agendada</option>
                  <option value="completed">Realizada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-100 text-indigo-700 p-3 rounded-lg text-center text-sm font-medium">
                Serão exportados <strong>{visitasParaExportar.length}</strong> registro(s) com os filtros atuais.
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
                  disabled={visitasParaExportar.length === 0}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
                </Button>

                <Button
                  onClick={executarExportacaoPDF}
                  disabled={visitasParaExportar.length === 0}
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