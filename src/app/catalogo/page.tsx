'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Package,
  Tag,
  Filter,
  Grid,
  List as ListIcon,
  ShoppingBag,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Trash2,
  ImageIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  sku?: string
  name: string
  brand?: string
  category?: string
  selling_price: number
  cost_price: number
  stock_quantity: number
  min_stock_alert?: number
  unit?: string
  image_url?: string
  category_id?: string
  categories?: {
    name: string
  } | null
}

interface CartItem {
  product: Product
  quantity: number
}

export default function CatalogoPage() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<Product[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todas')
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid')

  // Carrinho / Seleção do Cliente
  const [carrinho, setCarrinho] = useState<CartItem[]>([])

  async function carregarDados() {
    setLoading(true)

    try {
      // 1. Buscar Categorias
      const { data: dataCats } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true })

      if (dataCats) setCategorias(dataCats)

      // 2. Buscar Produtos
      const { data: dataProds, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('name', { ascending: true })

      if (error) {
        const { data: dataSimples } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true })

        if (dataSimples) setProdutos(dataSimples as Product[])
      } else if (dataProds) {
        setProdutos(dataProds as unknown as Product[])
      }
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Manipulação do Carrinho
  const adicionarAoCarrinho = (produto: Product) => {
    setCarrinho((prev) => {
      const existe = prev.find((item) => item.product.id === produto.id)
      if (existe) {
        return prev.map((item) =>
          item.product.id === produto.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product: produto, quantity: 1 }]
    })
  }

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho((prev) => {
      const existe = prev.find((item) => item.product.id === produtoId)
      if (!existe) return prev
      if (existe.quantity === 1) {
        return prev.filter((item) => item.product.id !== produtoId)
      }
      return prev.map((item) =>
        item.product.id === produtoId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    })
  }

  const getQtdNoCarrinho = (produtoId: string) => {
    return carrinho.find((item) => item.product.id === produtoId)?.quantity || 0
  }

  const totalItensCarrinho = carrinho.reduce((acc, item) => acc + item.quantity, 0)
  const valorTotalCarrinho = carrinho.reduce(
    (acc, item) => acc + item.product.selling_price * item.quantity,
    0
  )

  const irParaVendas = () => {
    const dadosPedido = carrinho.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.selling_price,
    }))

    localStorage.setItem('carrinho_catalogo', JSON.stringify(dadosPedido))
    router.push('/vendas?origem=catalogo')
  }

  const getNomeCategoria = (prod: Product) => {
    if (prod.categories?.name) return prod.categories.name
    if (prod.category) return prod.category
    return 'Geral'
  }

  const produtosFiltrados = produtos.filter((prod) => {
    const termo = busca.toLowerCase()
    const nomeCategoria = getNomeCategoria(prod).toLowerCase()
    const marca = (prod.brand || '').toLowerCase()

    const bateBusca =
      prod.name.toLowerCase().includes(termo) ||
      (prod.sku && prod.sku.toLowerCase().includes(termo)) ||
      marca.includes(termo) ||
      nomeCategoria.includes(termo)

    const bateCategoria =
      categoriaSelecionada === 'todas'
        ? true
        : prod.category_id === categoriaSelecionada ||
          prod.category === categoriaSelecionada

    return bateBusca && bateCategoria
  })

  return (
    <div className="space-y-6 pb-24">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Catálogo de Produtos
          </h1>
          <p className="text-slate-500">
            Mostruário digital para apresentação ao cliente e seleção rápida.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <Button
              variant={visualizacao === 'grid' ? 'white' : 'ghost'}
              size="sm"
              onClick={() => setVisualizacao('grid')}
              className={`h-8 px-3 ${
                visualizacao === 'grid' ? 'shadow-sm font-semibold' : 'text-slate-500'
              }`}
            >
              <Grid className="h-4 w-4 mr-1.5" /> Cards
            </Button>
            <Button
              variant={visualizacao === 'lista' ? 'white' : 'ghost'}
              size="sm"
              onClick={() => setVisualizacao('lista')}
              className={`h-8 px-3 ${
                visualizacao === 'lista' ? 'shadow-sm font-semibold' : 'text-slate-500'
              }`}
            >
              <ListIcon className="h-4 w-4 mr-1.5" /> Lista
            </Button>
          </div>

          <Link href="/estoque">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, marca ou SKU..."
            className="pl-9 h-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <button
            onClick={() => setCategoriaSelecionada('todas')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              categoriaSelecionada === 'todas'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({produtos.length})
          </button>
          {categorias.map((cat) => {
            const qtd = produtos.filter(
              (p) => p.category_id === cat.id || p.category === cat.name
            ).length
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaSelecionada(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  categoriaSelecionada === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({qtd})
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid com Fotos dos Produtos */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border">
          Carregando catálogo...
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border space-y-3">
          <Package className="h-10 w-10 mx-auto text-slate-300" />
          <p className="font-medium text-slate-600">Nenhum produto cadastrado no momento.</p>
          <Link href="/estoque" className="inline-block pt-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Cadastrar Produto no Estoque
            </Button>
          </Link>
        </div>
      ) : visualizacao === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {produtosFiltrados.map((prod) => {
            const nomeCat = getNomeCategoria(prod)
            const qtdSelecionada = getQtdNoCarrinho(prod.id)

            return (
              <div
                key={prod.id}
                className={`bg-white rounded-xl border transition-all overflow-hidden flex flex-col justify-between ${
                  qtdSelecionada > 0
                    ? 'ring-2 ring-indigo-600 border-indigo-600 shadow-md'
                    : 'shadow-sm hover:shadow-md border-slate-200'
                }`}
              >
                {/* Imagem do Produto */}
                <div className="relative h-48 w-full bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
                      <ImageIcon className="h-10 w-10" />
                      <span className="text-[10px] uppercase font-bold text-slate-400">Sem Foto</span>
                    </div>
                  )}

                  <span className="absolute top-3 left-3 text-[10px] font-semibold text-indigo-700 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm border border-slate-100 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {nomeCat}
                  </span>
                </div>

                {/* Dados do Produto */}
                <div className="p-4 space-y-2">
                  <div>
                    {prod.brand && (
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {prod.brand}
                      </span>
                    )}
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">
                      {prod.name}
                    </h3>
                  </div>
                </div>

                {/* Rodapé do Card com Preço e Seleção */}
                <div className="p-4 pt-0 mt-auto">
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-slate-900">
                        R$ {Number(prod.selling_price).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {qtdSelecionada === 0 ? (
                      <Button
                        size="sm"
                        onClick={() => adicionarAoCarrinho(prod)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-8 px-3 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Selecionar</span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 bg-indigo-50 p-1 rounded-lg border border-indigo-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removerDoCarrinho(prod.id)}
                          className="h-6 w-6 text-indigo-700 hover:bg-indigo-100 rounded-md"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold text-indigo-900 px-1">
                          {qtdSelecionada}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => adicionarAoCarrinho(prod)}
                          className="h-6 w-6 text-indigo-700 hover:bg-indigo-100 rounded-md"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Modo Lista com miniatura da foto */
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {produtosFiltrados.map((prod) => {
              const nomeCat = getNomeCategoria(prod)
              const qtdSelecionada = getQtdNoCarrinho(prod.id)

              return (
                <div
                  key={prod.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    qtdSelecionada > 0 ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-slate-100 border overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {prod.name}
                        {prod.brand && (
                          <span className="text-xs font-normal text-slate-400 ml-2">
                            ({prod.brand})
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{nomeCat}</span>
                        {prod.sku && <span>• SKU: {prod.sku}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end">
                    <span className="text-lg font-extrabold text-slate-900">
                      R$ {Number(prod.selling_price).toFixed(2).replace('.', ',')}
                    </span>

                    {qtdSelecionada === 0 ? (
                      <Button
                        size="sm"
                        onClick={() => adicionarAoCarrinho(prod)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-8 px-3 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Selecionar
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-indigo-100/60 p-1 rounded-lg">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removerDoCarrinho(prod.id)}
                          className="h-7 w-7 text-indigo-700 hover:bg-indigo-200 rounded-md"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-sm font-bold text-indigo-900 px-1">
                          {qtdSelecionada}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => adicionarAoCarrinho(prod)}
                          className="h-7 w-7 text-indigo-700 hover:bg-indigo-200 rounded-md"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Barra Flutuante de Seleção */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-indigo-600 rounded-xl">
              <ShoppingCart className="h-5 w-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                {totalItensCarrinho}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Itens Selecionados</p>
              <p className="text-lg font-bold text-white">
                R$ {valorTotalCarrinho.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCarrinho([])}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              onClick={irParaVendas}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold shadow-md"
            >
              <span>Ir para Vendas</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}