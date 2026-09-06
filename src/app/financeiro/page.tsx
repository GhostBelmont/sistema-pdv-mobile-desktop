'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  DollarSign,
  PlusCircle,
  ArrowUpCircle,
  ArrowDownCircle,
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

interface CashFlowItem {
  id: string
  type: 'entrada' | 'saida'
  category: string
  amount: number
  description: string
  date: string
  created_at: string
}

export default function FinanceiroPage() {
  const [transacoes, setTransacoes] = useState<CashFlowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário de Nova Transação Manual
  const [type, setType] = useState<'entrada' | 'saida'>('saida')
  const [category, setCategory] = useState('Despesa Operacional')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function carregarFinanceiro() {
    setLoading(true)

    const { data, error } = await supabase
      .from('cash_flow')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Erro ao buscar fluxo de caixa:', error)
    } else if (data) {
      const formatado = data.map((item: any) => ({
        ...item,
        amount: Number(item.amount ?? 0),
        type: item.type?.toLowerCase() === 'entrada' ? 'entrada' : 'saida',
      }))
      setTransacoes(formatado)
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarFinanceiro()
  }, [])

  async function handleNovaTransacao(e: React.FormEvent) {
    e.preventDefault()

    const valorNumerico = parseFloat(amount)
    if (!valorNumerico || valorNumerico <= 0) {
      alert('Informe um valor válido maior que zero.')
      return
    }

    setSalvando(true)

    try {
      const { error } = await supabase.from('cash_flow').insert([
        {
          type,
          category,
          amount: valorNumerico,
          description: description || (type === 'entrada' ? 'Receita Manual' : 'Despesa Manual'),
          date,
        },
      ])

      if (error) throw error

      alert('Movimentação cadastrada com sucesso!')
      setAmount('')
      setDescription('')
      carregarFinanceiro()
    } catch (err: any) {
      alert('Erro ao salvar movimentação: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  // Cálculos dos Totais
  const totalEntradas = transacoes
    .filter((t) => t.type === 'entrada')
    .reduce((acc, t) => acc + t.amount, 0)

  const totalSaidas = transacoes
    .filter((t) => t.type === 'saida')
    .reduce((acc, t) => acc + t.amount, 0)

  const saldoTotal = totalEntradas - totalSaidas

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro & Fluxo de Caixa</h1>
        <p className="text-slate-500">
          Acompanhe suas receitas, despesas e o saldo geral da sua distribuição.
        </p>
      </div>

      {/* Cards Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Entradas</p>
            <p className="text-2xl font-bold text-emerald-600">
              R$ {totalEntradas.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <ArrowUpCircle className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Saídas</p>
            <p className="text-2xl font-bold text-red-600">
              R$ {totalSaidas.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-full text-red-600">
            <ArrowDownCircle className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Saldo Atual</p>
            <p
              className={`text-2xl font-bold ${
                saldoTotal >= 0 ? 'text-indigo-600' : 'text-red-600'
              }`}
            >
              R$ {saldoTotal.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <DollarSign className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Formulário + Tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4 h-fit">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b pb-3">
            <PlusCircle className="h-5 w-5 text-indigo-600" /> Nova Movimentação
          </h2>

          <form onSubmit={handleNovaTransacao} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Tipo de Transação
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('entrada')
                    setCategory('Receita Operacional')
                  }}
                  className={`py-2 text-xs font-semibold rounded-md border ${
                    type === 'entrada'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Entrada (Receita)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('saida')
                    setCategory('Despesa Operacional')
                  }}
                  className={`py-2 text-xs font-semibold rounded-md border ${
                    type === 'saida'
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Saída (Despesa)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Categoria
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {type === 'entrada' ? (
                  <>
                    <option value="Venda">Venda</option>
                    <option value="Receita Operacional">Receita Operacional</option>
                    <option value="Outros">Outros</option>
                  </>
                ) : (
                  <>
                    <option value="Despesa Operacional">Despesa Operacional</option>
                    <option value="Compra de Estoque">Compra de Estoque</option>
                    <option value="Transporte / Combustível">Transporte / Combustível</option>
                    <option value="Marketing / Vendas">Marketing / Vendas</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Outros">Outros</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Valor (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Data
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
                Descrição / Observação
              </label>
              <Input
                type="text"
                placeholder="Ex: Compra de material, Combustível, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={salvando}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {salvando ? 'Registrando...' : 'Salvar Movimentação'}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Histórico de Transações</h3>
            <Badge variant="outline">{transacoes.length} registro(s)</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    Carregando histórico financeiro...
                  </TableCell>
                </TableRow>
              ) : transacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    Nenhuma movimentação registrada no fluxo de caixa.
                  </TableCell>
                </TableRow>
              ) : (
                transacoes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-slate-600 text-xs font-medium whitespace-nowrap">
                      {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      {t.type === 'entrada' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                          Entrada
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">
                          Saída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-800 text-xs font-medium">
                      {t.category}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs max-w-[200px] truncate">
                      {t.description || '-'}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold whitespace-nowrap ${
                        t.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {t.type === 'entrada' ? '+ ' : '- '}R$ {t.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}