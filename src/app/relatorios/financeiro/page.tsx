'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download, 
  Calendar, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  Loader2,
  X,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

import { supabase } from '@/lib/supabase'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CashFlowItem {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  sale_id: string | null;
  date: string;
  created_at: string;
}

export default function FinancialReport() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [periodPreset, setPeriodPreset] = useState<'current_month' | 'last_30' | 'year' | 'custom'>('current_month');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [data, setData] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  // Estados do Modal de Exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportType, setExportType] = useState<string>('all');
  const [exportCategory, setExportCategory] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // --- BUSCA DADOS DO SUPABASE COM FILTRO FLEXÍVEL ---
  const fetchCashFlowData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cash_flow')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (searchQuery.trim() !== '') {
        query = query.ilike('description', `%${searchQuery.trim()}%`);
      }

      const { data: result, error } = await query;

      if (error) {
        console.error('Erro ao buscar fluxo de caixa:', error.message);
        setData([]);
      } else {
        let filtered = result || [];

        // Filtro de tipo flexível (trata variações salvas no banco em PT ou EN)
        if (typeFilter === 'income') {
          filtered = filtered.filter(item => {
            const t = item.type?.toLowerCase();
            return ['income', 'entrada', 'receita', 'venda'].includes(t);
          });
        } else if (typeFilter === 'expense') {
          filtered = filtered.filter(item => {
            const t = item.type?.toLowerCase();
            return ['expense', 'saída', 'saida', 'despesa'].includes(t);
          });
        }

        setData(filtered);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, typeFilter, categoryFilter, searchQuery]);

  const fetchCategories = async () => {
    const { data: categoriesData } = await supabase.from('cash_flow').select('category');
    if (categoriesData) {
      const uniqueCats = Array.from(new Set(categoriesData.map(item => item.category).filter(Boolean)));
      setCategoriesList(uniqueCats);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCashFlowData();
  }, [fetchCashFlowData]);

  const handlePresetChange = (preset: 'current_month' | 'last_30' | 'year') => {
    setPeriodPreset(preset);
    const now = new Date();

    if (preset === 'current_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(first);
      setEndDate(last);
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      const startYr = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const endYr = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      setStartDate(startYr);
      setEndDate(endYr);
    }
  };

  const totals = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const val = Number(item.amount) || 0;
        const t = item.type?.toLowerCase();
        if (['income', 'entrada', 'receita', 'venda'].includes(t)) {
          acc.income += val;
        } else {
          acc.expense += val;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [data]);

  const netBalance = totals.income - totals.expense;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- DADOS FILTRADOS PARA O MODAL DE EXPORTAÇÃO ---
  const exportFilteredData = useMemo(() => {
    return data.filter(item => {
      const t = item.type?.toLowerCase();
      const isIncome = ['income', 'entrada', 'receita', 'venda'].includes(t);
      
      if (exportType === 'income' && !isIncome) return false;
      if (exportType === 'expense' && isIncome) return false;
      if (exportCategory !== 'all' && item.category !== exportCategory) return false;

      return true;
    });
  }, [data, exportType, exportCategory]);

  // --- EXPORTAR EXCEL (CSV) ---
  const handleExportExcel = () => {
    if (exportFilteredData.length === 0) {
      alert('Nenhum registro encontrado com os filtros selecionados.');
      return;
    }

    setIsExporting(true);
    try {
      const headers = ['ID', 'Data', 'Tipo', 'Categoria', 'Descrição', 'Venda Vinculada', 'Valor (R$)'];
      const rows = exportFilteredData.map(item => {
        const formattedDate = item.date ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
        const formattedAmount = Number(item.amount || 0).toFixed(2).replace('.', ',');
        const isIncome = ['income', 'entrada', 'receita', 'venda'].includes(item.type?.toLowerCase());

        return [
          item.id,
          formattedDate,
          isIncome ? 'Entrada' : 'Saída',
          `"${(item.category || '').replace(/"/g, '""')}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          item.sale_id ? `#${item.sale_id}` : '',
          `"${isIncome ? '' : '-'}${formattedAmount}"`
        ];
      });

      const csvContent = [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_financeiro_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // --- EXPORTAR PDF ---
  const handleExportPDF = () => {
    if (exportFilteredData.length === 0) {
      alert('Nenhum registro encontrado com os filtros selecionados.');
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('Relatório Financeiro', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Período: ${startDate.split('-').reverse().join('/')} até ${endDate.split('-').reverse().join('/')}`, 14, 27);

      const tableRows = exportFilteredData.map(item => {
        const isIncome = ['income', 'entrada', 'receita', 'venda'].includes(item.type?.toLowerCase());
        const formattedDate = item.date ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
        const formattedAmount = `${isIncome ? '+ ' : '- '}${formatCurrency(Number(item.amount) || 0)}`;

        return [
          formattedDate,
          item.description || 'Sem descrição',
          item.category || 'Geral',
          item.sale_id ? `#${item.sale_id.slice(0, 8)}` : '—',
          formattedAmount
        ];
      });

      autoTable(doc, {
        startY: 35,
        head: [['Data', 'Descrição', 'Categoria', 'Venda', 'Valor']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          4: { fontStyle: 'bold' }
        }
      });

      doc.save(`relatorio_financeiro_${startDate}_a_${endDate}.pdf`);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen relative">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatório Financeiro</h1>
          <p className="text-sm text-slate-500">Balanço de entradas, saídas e extrato do fluxo de caixa.</p>
        </div>
        
        <button 
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar Relatório
        </button>
      </div>

      {/* BARRA DE FILTROS DA TELA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Período:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
              <button 
                onClick={() => handlePresetChange('current_month')}
                className={`px-3 py-1.5 rounded-md transition ${periodPreset === 'current_month' ? 'bg-white shadow-sm text-slate-900 font-semibold' : 'hover:text-slate-900'}`}
              >
                Mês Atual
              </button>
              <button 
                onClick={() => handlePresetChange('last_30')}
                className={`px-3 py-1.5 rounded-md transition ${periodPreset === 'last_30' ? 'bg-white shadow-sm text-slate-900 font-semibold' : 'hover:text-slate-900'}`}
              >
                Últimos 30 Dias
              </button>
              <button 
                onClick={() => handlePresetChange('year')}
                className={`px-3 py-1.5 rounded-md transition ${periodPreset === 'year' ? 'bg-white shadow-sm text-slate-900 font-semibold' : 'hover:text-slate-900'}`}
              >
                Este Ano
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setPeriodPreset('custom'); }}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setPeriodPreset('custom'); }}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Filter className="w-4 h-4" />
          </div>

          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="income">Entradas (Receitas)</option>
            <option value="expense">Saídas (Despesas)</option>
          </select>

          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Categorias</option>
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por descrição..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* CARDS DE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entradas (Receitas)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totals.income)}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saídas (Despesas)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(totals.expense)}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600"><TrendingDown className="w-5 h-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Líquido</p>
            <p className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{formatCurrency(netBalance)}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><DollarSign className="w-5 h-5" /></div>
        </div>
      </div>

      {/* TABELA DE EXTRATO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm">Extrato do Período ({data.length})</h2>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
            <span>Carregando dados do banco...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Nenhuma transação encontrada no período selecionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Categoria</th>
                  <th className="px-6 py-3">Venda Vinculada</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => {
                  const isIncome = ['income', 'entrada', 'receita', 'venda'].includes(item.type?.toLowerCase());
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                        {item.date ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isIncome ? <span className="p-1 bg-emerald-100 text-emerald-700 rounded"><ArrowUpRight className="w-3 h-3" /></span> : <span className="p-1 bg-rose-100 text-rose-700 rounded"><ArrowDownLeft className="w-3 h-3" /></span>}
                          <span className="font-medium text-slate-800">{item.description || 'Sem descrição'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium text-[11px]">{item.category || 'Geral'}</span></td>
                      <td className="px-6 py-4 text-slate-400">{item.sale_id ? <span className="text-blue-600 hover:underline">#{item.sale_id.slice(0, 8)}</span> : '—'}</td>
                      <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncome ? '+ ' : '- '}
                        {formatCurrency(Number(item.amount) || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL DE OPÇÕES DE EXPORTAÇÃO E FILTROS --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-base">Relatório Financeiro</h3>
                <p className="text-xs text-slate-300">Opções de Exportação e Filtros</p>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filtrar Dados para Exportação</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Tipo de Movimento:</label>
                  <select 
                    value={exportType}
                    onChange={e => setExportType(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas as Movimentações</option>
                    <option value="income">Apenas Entradas (Receitas)</option>
                    <option value="expense">Apenas Saídas (Despesas)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Categoria:</label>
                  <select 
                    value={exportCategory}
                    onChange={e => setExportCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas as Categorias</option>
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center text-xs font-medium text-blue-700">
                Serão exportados <strong>{exportFilteredData.length}</strong> registro(s) com os filtros atuais.
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportExcel}
                  disabled={isExporting || exportFilteredData.length === 0}
                  className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  Exportar Excel
                </button>

                <button 
                  onClick={handleExportPDF}
                  disabled={isExporting || exportFilteredData.length === 0}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Exportar PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}