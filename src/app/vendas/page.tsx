'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Plus, Trash2, CheckCircle2, User, Package, DollarSign, History } from 'lucide-react'
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

interface Client {
  id: string
  name: string
  company_name?: string
  type: 'person' | 'salon'
}

interface Product {
  id: string
  name: string
  selling_price: number
  stock_quantity: number
}

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
}

export default function VendasPage() {
  const [clientes, setClientes] = useState<Client[]>([])
  const [produtos, setProdutos] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Estado do Formulário
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [itemQuantity, setItemQuantity] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<string>('pix')

  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([])

  async function carregarDados() {
    setLoading(true)

    // Buscar Clientes
    const { data: dataClientes, error: errClientes } = await supabase
      .from('clients')
      .select('id, name, company_name, type')
      .order('name', { ascending: true })

    if (errClientes) console.error('Erro ao buscar clientes:', errClientes)

    // Buscar Produtos em Estoque
    const { data: dataProdutos, error: errProdutos } = await supabase
      .from('products')
      .select('id, name, selling_price, stock_quantity')
      .order('name', { ascending: true })

    let listaProdutosFormatados: Product[] = []

    if (errProdutos) {
      console.error('Erro ao buscar produtos:', errProdutos)
      alert('Erro ao carregar produtos: ' + errProdutos.message)
    } else if (dataProdutos) {
      listaProdutosFormatados = dataProdutos.map((p: any) => ({
        id: p.id,
        name: p.name || 'Produto sem nome',
        selling_price: Number(p.selling_price ?? 0),
        stock_quantity: Number(p.stock_quantity ?? 0),
      }))

      setProdutos(listaProdutosFormatados)
    }

    if (dataClientes) setClientes(dataClientes)

    // PROCESSAR CARRINHO VINDO DO CATÁLOGO
    const params = new URLSearchParams(window.location.search)
    if (params.get('origem') === 'catalogo') {
      const dadosSalvos = localStorage.getItem('carrinho_catalogo')
      if (dadosSalvos) {
        try {
          const itensCatalogo: { product_id: string; quantity: number; unit_price: number; name: string }[] = JSON.parse(dadosSalvos)

          const novosItensCarrinho: CartItem[] = []

          for (const item of itensCatalogo) {
            // Busca o produto correspondente carregado do BD
            const prodCadastrado = listaProdutosFormatados.find((p) => p.id === item.product_id)

            const produtoRef: Product = prodCadastrado || {
              id: item.product_id,
              name: item.name,
              selling_price: item.unit_price,
              stock_quantity: 999, // fallback caso o estoque não tenha retornado a tempo
            }

            novosItensCarrinho.push({
              product: produtoRef,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.quantity * item.unit_price,
            })
          }

          setCart(novosItensCarrinho)
          localStorage.removeItem('carrinho_catalogo')
        } catch (err) {
          console.error('Erro ao processar itens do catálogo:', err)
        }
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function handleAdicionarItem() {
    if (!selectedProductId) return

    const produto = produtos.find((p) => p.id === selectedProductId)
    if (!produto) return

    if (itemQuantity > produto.stock_quantity && produto.stock_quantity > 0) {
      alert(`Quantidade em estoque insuficiente! Disponível: ${produto.stock_quantity}`)
      return
    }

    const itemExistenteIndex = cart.findIndex((item) => item.product.id === produto.id)

    if (itemExistenteIndex > -1) {
      const novoCarrinho = [...cart]
      const quantidadeAtual = novoCarrinho[itemExistenteIndex].quantity
      const novaQuantidade = quantidadeAtual + itemQuantity

      if (novaQuantidade > produto.stock_quantity && produto.stock_quantity > 0) {
        alert(`Quantidade em estoque insuficiente! Disponível: ${produto.stock_quantity}`)
        return
      }

      novoCarrinho[itemExistenteIndex].quantity = novaQuantidade
      novoCarrinho[itemExistenteIndex].subtotal = novaQuantidade * produto.selling_price
      setCart(novoCarrinho)
    } else {
      setCart([
        ...cart,
        {
          product: produto,
          quantity: itemQuantity,
          unit_price: produto.selling_price,
          subtotal: itemQuantity * produto.selling_price,
        },
      ])
    }

    setSelectedProductId('')
    setItemQuantity(1)
  }

  function handleRemoverItem(index: number) {
    const novoCarrinho = cart.filter((_, i) => i !== index)
    setCart(novoCarrinho)
  }

  const totalVenda = cart.reduce((acc, item) => acc + item.subtotal, 0)

  async function handleFinalizarVenda() {
    if (cart.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho!')
      return
    }

    setSalvando(true)

    try {
      const { data: venda, error: erroVenda } = await supabase
        .from('sales')
        .insert([
          {
            client_id: selectedClientId || null,
            total_amount: totalVenda,
            payment_method: paymentMethod,
            payment_status: 'paid',
          },
        ])
        .select()
        .single()

      if (erroVenda) throw erroVenda

      for (const item of cart) {
        const { error: erroItem } = await supabase.from('sale_items').insert([
          {
            sale_id: venda.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          },
        ])

        if (erroItem) throw erroItem

        const novoEstoque = Math.max(0, item.product.stock_quantity - item.quantity)

        await supabase
          .from('products')
          .update({ stock_quantity: novoEstoque })
          .eq('id', item.product.id)
      }

      const clienteNome = clientes.find((c) => c.id === selectedClientId)?.name || 'Cliente Avulso'
      const hoje = new Date().toISOString().split('T')[0]

      const { error: erroCashFlow } = await supabase.from('cash_flow').insert([
        {
          type: 'entrada',
          category: 'Venda',
          amount: totalVenda,
          description: `Venda #${venda.id.substring(0, 8)} - ${clienteNome}`,
          sale_id: venda.id,
          date: hoje,
        },
      ])

      if (erroCashFlow) {
        console.error('Erro ao gerar lançamento financeiro:', erroCashFlow)
      }

      alert('Venda realizada e lançada no Financeiro com sucesso!')

      setCart([])
      setSelectedClientId('')
      setPaymentMethod('pix')
      carregarDados()
    } catch (err: any) {
      alert('Erro ao finalizar venda: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ponto de Venda (PDV)</h1>
          <p className="text-slate-500">
            Registre novas vendas, dê baixa automática no estoque e alimente o fluxo de caixa.
          </p>
        </div>

        <Link href="/vendas/historico">
          <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <History className="mr-2 h-4 w-4" /> Ver Histórico de Vendas
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" /> Cliente / Salão
            </h2>
            <div>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Cliente Avulso (Não identificado)</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'salon' && c.company_name
                      ? `${c.company_name} (Resp: ${c.name})`
                      : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" /> Selecionar Produtos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-7">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Produto
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Selecione um produto...</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {p.selling_price.toFixed(2)} ({p.stock_quantity} em estoque)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Qtd.
                </label>
                <Input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Number(e.target.value))}
                />
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="button"
                  onClick={handleAdicionarItem}
                  disabled={!selectedProductId}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-600" /> Itens no Carrinho
              </h3>
              <Badge variant="outline">{cart.length} item(ns)</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Preço Un.</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      O carrinho está vazio. Adicione produtos acima.
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-slate-900">
                        {item.product.name}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        R$ {item.unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-800">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        R$ {item.subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          onClick={() => handleRemoverItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6 sticky top-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <DollarSign className="h-5 w-5 text-indigo-600" /> Resumo da Venda
            </h2>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pix', label: 'PIX' },
                  { id: 'credit_card', label: 'Cartão Crédito' },
                  { id: 'debit_card', label: 'Cartão Débito' },
                  { id: 'cash', label: 'Dinheiro' },
                ].map((metodo) => (
                  <button
                    key={metodo.id}
                    type="button"
                    onClick={() => setPaymentMethod(metodo.id)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      paymentMethod === metodo.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {metodo.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>R$ {totalVenda.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t">
                <span>Total</span>
                <span className="text-indigo-600">R$ {totalVenda.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handleFinalizarVenda}
              disabled={cart.length === 0 || salvando}
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {salvando ? (
                'Processando...'
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Finalizar Venda
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}