'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
  CalendarPlus,
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

interface Client {
  id: string
  name: string
  company_name?: string
}

interface Appointment {
  id: string
  title: string
  appointment_date: string
  status: 'scheduled' | 'completed' | 'canceled'
  notes?: string
  client_id?: string
  clients?: {
    name: string
    company_name?: string
  } | null
}

export default function VisitasPage() {
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([])
  const [clientes, setClientes] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroData, setFiltroData] = useState<string>('')

  // Formulário
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')

  async function carregarDados() {
    setLoading(true)

    // Buscar clientes para o select
    const { data: dataClientes } = await supabase
      .from('clients')
      .select('id, name, company_name')
      .order('name', { ascending: true })

    if (dataClientes) setClientes(dataClientes)

    // Buscar agendamentos com dados dos clientes
    const { data: dataAgendamentos, error } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        appointment_date,
        status,
        notes,
        client_id,
        clients (
          name,
          company_name
        )
      `)
      .order('appointment_date', { ascending: true })

    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
    } else if (dataAgendamentos) {
      setAgendamentos(dataAgendamentos as unknown as Appointment[])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function handleCriarAgendamento(e: React.FormEvent) {
    e.preventDefault()

    if (!title || !date || !time) {
      alert('Por favor, preencha o título, a data e o horário.')
      return
    }

    setSalvando(true)

    try {
      const dateTimeIso = new Date(`${date}T${time}:00`).toISOString()

      const { error } = await supabase.from('appointments').insert([
        {
          title,
          client_id: clientId || null,
          appointment_date: dateTimeIso,
          status: 'scheduled',
          notes,
        },
      ])

      if (error) throw error

      alert('Agendamento criado com sucesso!')
      setTitle('')
      setClientId('')
      setDate('')
      setTime('09:00')
      setNotes('')
      carregarDados()
    } catch (err: any) {
      alert('Erro ao salvar agendamento: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleAlterarStatus(id: string, novoStatus: 'completed' | 'canceled' | 'scheduled') {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error

      carregarDados()
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message)
    }
  }

  // Funções para geração de links de calendário externos
  function gerarLinkGoogleCalendar(agendamento: Appointment) {
    const dataInicio = new Date(agendamento.appointment_date)
    const dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000)

    const formatarDataIsoUtc = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d+/g, '')

    const titleEncoded = encodeURIComponent(agendamento.title)
    const clienteNome = agendamento.clients?.company_name
      ? `${agendamento.clients.company_name} (${agendamento.clients.name})`
      : agendamento.clients?.name || 'Cliente não especificado'

    const detailsEncoded = encodeURIComponent(
      `Cliente: ${clienteNome}\nObservações: ${agendamento.notes || 'Nenhuma'}`
    )
    const dates = `${formatarDataIsoUtc(dataInicio)}/${formatarDataIsoUtc(dataFim)}`

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleEncoded}&dates=${dates}&details=${detailsEncoded}`
  }

  function gerarLinkOutlook(agendamento: Appointment) {
    const dataInicio = new Date(agendamento.appointment_date)
    const dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000)

    const titleEncoded = encodeURIComponent(agendamento.title)
    const clienteNome = agendamento.clients?.company_name
      ? `${agendamento.clients.company_name} (${agendamento.clients.name})`
      : agendamento.clients?.name || 'Cliente não especificado'

    const detailsEncoded = encodeURIComponent(
      `Cliente: ${clienteNome}\nObservações: ${agendamento.notes || 'Nenhuma'}`
    )

    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${titleEncoded}&body=${detailsEncoded}&startdt=${dataInicio.toISOString()}&enddt=${dataFim.toISOString()}`
  }

  // Filtragem local
  const agendamentosFiltrados = agendamentos.filter((item) => {
    const dataItem = item.appointment_date.split('T')[0]

    const bateStatus =
      filtroStatus === 'todos' ? true : item.status === filtroStatus

    const bateData = filtroData ? dataItem === filtroData : true

    return bateStatus && bateData
  })

  const formatarStatus = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Agendado</Badge>
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Concluído</Badge>
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agendamentos & Visitas</h1>
        <p className="text-slate-500">
          Gerencie compromissos, visitas técnicas, entregas e reuniões com seus clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Criar Agendamento */}
        <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4 h-fit">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b pb-3">
            <Plus className="h-5 w-5 text-indigo-600" /> Novo Agendamento
          </h2>

          <form onSubmit={handleCriarAgendamento} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Título / Compromisso *
              </label>
              <Input
                placeholder="Ex: Visita técnica / Entrega de pedido"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Cliente / Salão (Opcional)
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name ? `${c.company_name} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Data *
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Horário *
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Observações
              </label>
              <Input
                placeholder="Detalhes adicionais do compromisso..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={salvando}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {salvando ? 'Agendando...' : 'Criar Agendamento'}
            </Button>
          </form>
        </div>

        {/* Tabela de Agendamentos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="todos">Todos os Status</option>
                <option value="scheduled">Agendados</option>
                <option value="completed">Concluídos</option>
                <option value="canceled">Cancelados</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <Input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="h-9 text-xs"
              />
              {filtroData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltroData('')}
                  className="text-xs text-slate-500 h-9"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data & Hora</TableHead>
                  <TableHead>Compromisso / Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                      Carregando agendamentos...
                    </TableCell>
                  </TableRow>
                ) : agendamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                      Nenhum agendamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  agendamentosFiltrados.map((item) => {
                    const dataObj = new Date(item.appointment_date)
                    const dataFmt = dataObj.toLocaleDateString('pt-BR')
                    const horaFmt = dataObj.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5 text-indigo-600" /> {dataFmt}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {horaFmt}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-800">{item.title}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3" />
                            {item.clients?.company_name
                              ? `${item.clients.company_name} (${item.clients.name})`
                              : item.clients?.name || 'Sem cliente associado'}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-slate-400 italic flex items-center gap-1 mt-1">
                              <FileText className="h-3 w-3" /> {item.notes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatarStatus(item.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Botão Adicionar ao Google Agenda */}
                            <a
                              href={gerarLinkGoogleCalendar(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Adicionar ao Google Agenda"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </a>

                            {/* Botões de Mudar Status */}
                            {item.status === 'scheduled' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAlterarStatus(item.id, 'completed')}
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                  title="Marcar como Concluído"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAlterarStatus(item.id, 'canceled')}
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                  title="Cancelar Agendamento"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {item.status !== 'scheduled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAlterarStatus(item.id, 'scheduled')}
                                className="text-xs text-slate-400 hover:text-slate-600"
                              >
                                Reabrir
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
        </div>
      </div>
    </div>
  )
}