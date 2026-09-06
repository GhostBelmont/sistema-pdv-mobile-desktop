'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  X,
  FileSpreadsheet,
  FileText,
  Filter,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  tituloRelatorio: string // ex: "Relatório de Clientes & Salões"
  subtitulo?: string // ex: "Base de Clientes Cadastrados"
  dadosOriginais: any[] // Lista completa de dados atuais
  colunasPDF: { header: string; dataKey: string }[] // Ex: [{ header: 'Nome', dataKey: 'nome' }]
  colunasExcel: { header: string; key: string }[] // Ex: [{ header: 'Telefone', key: 'telefone' }]
  // Lista de cidades e estados disponíveis para popular os selects do filtro
  cidadesDisponiveis?: string[]
  estadosDisponiveis?: string[]
  temFiltroTipoPessoa?: boolean // Para exibir opção PF/PJ se aplicável
}

export function ExportModal({
  isOpen,
  onClose,
  tituloRelatorio,
  subtitulo = 'Relatório Geral Gerado pelo Sistema',
  dadosOriginais,
  colunasPDF,
  colunasExcel,
  cidadesDisponiveis = [],
  estadosDisponiveis = [],
  temFiltroTipoPessoa = false,
}: ExportModalProps) {
  // Filtros internos do Modal
  const [cidadeSel, setCidadeSel] = useState('')
  const [estadoSel, setEstadoSel] = useState('')
  const [tipoPessoaSel, setTipoPessoaSel] = useState<'todos' | 'PF' | 'PJ'>('todos')
  const [statusSel, setStatusSel] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  if (!isOpen) return null

  // Aplica os filtros escolhidos no Modal sobre a lista
  const filtrarDados = () => {
    return dadosOriginais.filter((item) => {
      // Cidade
      if (cidadeSel) {
        const itemCidade = (item.city || item.cidade || '').toLowerCase()
        if (itemCidade !== cidadeSel.toLowerCase()) return false
      }

      // Estado
      if (estadoSel) {
        const itemUF = (item.state || item.uf || item.estado || '').toLowerCase()
        if (itemUF !== estadoSel.toLowerCase()) return false
      }

      // Tipo de Pessoa (PF / PJ)
      if (temFiltroTipoPessoa && tipoPessoaSel !== 'todos') {
        const doc = (item.cpf_cnpj || item.document || item.cnpj || '').replace(/\D/g, '')
        const ehPJ = doc.length === 14 || Boolean(item.company_name || item.razao_social)
        if (tipoPessoaSel === 'PJ' && !ehPJ) return false
        if (tipoPessoaSel === 'PF' && ehPJ) return false
      }

      // Status
      if (statusSel !== 'todos') {
        const st = (item.status || '').toLowerCase()
        const isInativo = item.active === false || st.includes('inac') || st.includes('desat')
        if (statusSel === 'ativo' && isInativo) return false
        if (statusSel === 'inativo' && !isInativo) return false
      }

      return true
    })
  }

  // --- GERAR EXCEL (.XLSX) ---
  const exportarExcel = () => {
    const dadosFiltrados = filtrarDados()

    // Formata o JSON para as chaves configuradas
    const dadosFormatados = dadosFiltrados.map((item) => {
      const linha: Record<string, any> = {}
      colunasExcel.forEach((col) => {
        linha[col.header] = item[col.key] ?? '-'
      })
      return linha
    })

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio')

    // Nome do arquivo sanitizado
    const nomeArquivo = `${tituloRelatorio.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, nomeArquivo)
    onClose()
  }

  // --- GERAR PDF LIMPO ---
  const exportarPDF = () => {
    const dadosFiltrados = filtrarDados()
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // 1. Cabeçalho limpo do documento
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(tituloRelatorio, 14, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`${subtitulo} • Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 27)

    doc.setDrawColor(220)
    doc.line(14, 31, 196, 31)

    // 2. Prepara os dados da tabela
    const bodyTabela = dadosFiltrados.map((item) =>
      colunasPDF.map((col) => item[col.dataKey] ?? '-')
    )

    // 3. Renderiza Tabela
    autoTable(doc, {
      startY: 35,
      head: [colunasPDF.map((col) => col.header)],
      body: bodyTabela,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42], // Slate 900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 35, bottom: 20, left: 14, right: 14 },
      didDrawPage: (data) => {
        // Rodapé com paginação
        const totalPaginas = doc.internal.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `Página ${data.pageNumber} de ${totalPaginas}`,
          196,
          285,
          { align: 'right' }
        )
      },
    })

    const nomeArquivo = `${tituloRelatorio.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(nomeArquivo)
    onClose()
  }

  const totalFiltrado = filtrarDados().length

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border overflow-hidden flex flex-col">
        {/* Topo do Modal */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-400" />
            <div>
              <h2 className="font-bold text-base">{tituloRelatorio}</h2>
              <p className="text-xs text-slate-300">Opções de Exportação e Filtros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo: Filtros */}
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 border-b pb-2">
            <Filter className="h-4 w-4 text-blue-600" /> Filtrar Dados para Exportação
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Filtro Tipo de Pessoa */}
            {temFiltroTipoPessoa && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Tipo de Pessoa:</label>
                <select
                  value={tipoPessoaSel}
                  onChange={(e: any) => setTipoPessoaSel(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:border-blue-500 font-medium"
                >
                  <option value="todos">Todos (PF e PJ)</option>
                  <option value="PF">Apenas Pessoa Física (PF)</option>
                  <option value="PJ">Apenas Pessoa Jurídica (PJ)</option>
                </select>
              </div>
            )}

            {/* Filtro Status */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Status:</label>
              <select
                value={statusSel}
                onChange={(e: any) => setStatusSel(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:border-blue-500 font-medium"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativo">Apenas Ativos</option>
                <option value="inativo">Apenas Inativos</option>
              </select>
            </div>

            {/* Filtro Cidade */}
            {cidadesDisponiveis.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Cidade:</label>
                <select
                  value={cidadeSel}
                  onChange={(e) => setCidadeSel(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">Todas as Cidades</option>
                  {cidadesDisponiveis.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Estado / UF */}
            {estadosDisponiveis.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Estado (UF):</label>
                <select
                  value={estadoSel}
                  onChange={(e) => setEstadoSel(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">Todos os Estados</option>
                  {estadosDisponiveis.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-800 font-medium text-center">
            Serão exportados <strong>{totalFiltrado}</strong> registro(s) com os filtros atuais.
          </div>
        </div>

        {/* Rodapé: Botões de Ação */}
        <div className="p-4 bg-slate-50 border-t flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={exportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
          </Button>
          <Button
            size="sm"
            onClick={exportarPDF}
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
          >
            <FileText className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  )
}