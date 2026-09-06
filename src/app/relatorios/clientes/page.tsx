'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Users,
  Building2,
  User,
  Download,
  ArrowLeft,
  UserCheck,
  Search,
  MapPin,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExportModal } from '@/components/ExportModal'

interface Cliente {
  id: string
  name?: string
  nome?: string
  company_name?: string
  razao_social?: string
  cpf_cnpj?: string
  document?: string
  cnpj?: string
  cpf?: string
  phone?: string
  telefone?: string
  whatsapp?: string
  city?: string
  cidade?: string
  state?: string
  uf?: string
  estado?: string
  status?: string
  active?: boolean
  created_at?: string
}

export default function RelatorioClientesPage() {
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [modalExportOpen, setModalExportOpen] = useState(false)

  // Métricas
  const [totalClientes, setTotalClientes] = useState(0)
  const [qtdPJ, setQtdPJ] = useState(0)
  const [qtdPF, setQtdPF] = useState(0)
  const [qtdAtivos, setQtdAtivos] = useState(0)

  // Listas para filtros do Modal
  const [cidades, setCidades] = useState<string[]>([])
  const [estados, setEstados] = useState<string[]>([])

  const isPessoaJuridica = (item: Cliente) => {
    const doc = (item.cpf_cnpj || item.document || item.cnpj || '').replace(/\D/g, '')
    if (doc.length === 14) return true
    if (item.company_name || item.razao_social) return true
    return false
  }

  async function carregarClientes() {
    setLoading(true)

    try {
      let { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error || !data || data.length === 0) {
        const resAlt = await supabase
          .from('clientes')
          .select('*')
          .order('created_at', { ascending: false })

        if (resAlt.data) data = resAlt.data
      }

      const lista = (data as Cliente[]) || []
      setClientes(lista)

      // Popula selects do Modal
      const cids = Array.from(new Set(lista.map((c) => c.city || c.cidade).filter(Boolean))) as string[]
      const ufs = Array.from(new Set(lista.map((c) => c.state || c.uf || c.estado).filter(Boolean))) as string[]
      setCidades(cids)
      setEstados(ufs)

      // Métricas
      let pjCount = 0
      let pfCount = 0
      let ativosCount = 0

      lista.forEach((c) => {
        if (isPessoaJuridica(c)) pjCount++
        else pfCount++

        const st = (c.status || '').toLowerCase()
        if (c.active !== false && !st.includes('inac') && !st.includes('desat')) {
          ativosCount++
        }
      })

      setTotalClientes(lista.length)
      setQtdPJ(pjCount)
      setQtdPF(pfCount)
      setQtdAtivos(ativosCount)
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  const clientesFiltrados = clientes.filter((c) => {
    const termo = busca.toLowerCase()
    const nome = (c.name || c.nome || c.company_name || c.razao_social || '').toLowerCase()
    const doc = (c.cpf_cnpj || c.document || c.cnpj || c.cpf || '').toLowerCase()
    const cidade = (c.city || c.cidade || '').toLowerCase()
    return nome.includes(termo) || cidade.includes(termo) || doc.includes(termo)
  })

  // Dados formatados para o Modal de Exportação
  const dadosExportacao = clientes.map((item) => {
    const ehPJ = isPessoaJuridica(item)
    const st = (item.status || '').toLowerCase()
    const isInativo = item.active === false || st.includes('inac') || st.includes('desat')

    return {
      ...item,
      tipo_pessoa: ehPJ ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)',
      nome_cliente: item.company_name || item.razao_social || item.name || item.nome || 'Cliente sem nome',
      contato_fone: item.phone || item.telefone || item.whatsapp || '-',
      cidade_uf: `${item.city || item.cidade || '-'}/${item.state || item.uf || item.estado || '-'}`,
      status_texto: isInativo ? 'Inativo' : 'Ativo',
      data_cadastro: item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-',
    }
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/relatorios"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Relatório de Clientes & Salões
            </h1>
            <p className="text-sm text-slate-500">
              Visão geral da base de clientes, separação por PF/PJ e dados de contato.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => setModalExportOpen(true)}
        >
          <Download className="h-4 w-4" /> Exportar Relatório
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Base Total</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{totalClientes}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Pessoa Jurídica (PJ)</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{qtdPJ}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Pessoa Física (PF)</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <User className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{qtdPF}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Ativos</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{qtdAtivos}</h3>
        </div>
      </div>

      {/* Tabela com Busca */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" /> Lista de Clientes Cadastrados ({clientesFiltrados.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border rounded-lg text-xs outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center py-8 text-slate-400 text-xs">Carregando clientes...</p>
        ) : clientesFiltrados.length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-xs">
            Nenhum cliente ou salão encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-400 font-semibold uppercase">
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Cliente / Razão Social</th>
                  <th className="pb-2">Contato</th>
                  <th className="pb-2">Cidade</th>
                  <th className="pb-2">Data Cadastro</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {clientesFiltrados.map((item) => {
                  const ehPJ = isPessoaJuridica(item)
                  const nome = item.company_name || item.razao_social || item.name || item.nome || 'Cliente sem nome'
                  const fone = item.phone || item.telefone || item.whatsapp || '-'
                  const cidade = item.city || item.cidade || '-'
                  const dt = item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'

                  const st = (item.status || '').toLowerCase()
                  const isInativo = item.active === false || st.includes('inac') || st.includes('desat')

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            ehPJ ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {ehPJ ? 'PJ' : 'PF'}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-slate-800">{nome}</td>
                      <td className="py-2.5 text-slate-600">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {fone}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" /> {cidade}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500">{dt}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            isInativo ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isInativo ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExportModal
        isOpen={modalExportOpen}
        onClose={() => setModalExportOpen(false)}
        tituloRelatorio="Relatório de Clientes & Salões"
        subtitulo="Listagem detalhada da base de clientes"
        dadosOriginais={dadosExportacao}
        cidadesDisponiveis={cidades}
        estadosDisponiveis={estados}
        temFiltroTipoPessoa={true}
        colunasPDF={[
          { header: 'Tipo', dataKey: 'tipo_pessoa' },
          { header: 'Cliente / Razão Social', dataKey: 'nome_cliente' },
          { header: 'Contato', dataKey: 'contato_fone' },
          { header: 'Cidade/UF', dataKey: 'cidade_uf' },
          { header: 'Data Cadastro', dataKey: 'data_cadastro' },
          { header: 'Status', dataKey: 'status_texto' },
        ]}
        colunasExcel={[
          { header: 'Tipo de Pessoa', key: 'tipo_pessoa' },
          { header: 'Cliente / Nome', key: 'nome_cliente' },
          { header: 'Telefone / Whatsapp', key: 'contato_fone' },
          { header: 'Cidade/UF', key: 'cidade_uf' },
          { header: 'Data de Cadastro', key: 'data_cadastro' },
          { header: 'Status', key: 'status_texto' },
        ]}
      />
    </div>
  )
}