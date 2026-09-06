'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Grid, List as ListIcon } from 'lucide-react'

interface Produto {
  id: string
  name: string
  price: number
  category?: string
  image_url?: string
  description?: string
  active?: boolean
}

export default function CatalogoPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid')

  useEffect(() => {
    fetchProdutos()
  }, [])

  async function fetchProdutos() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      if (data) setProdutos(data)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Catálogo de Produtos</h1>
          <p className="text-xs text-gray-500">Gerencie e visualize seus itens</p>
        </div>

        {/* Botões de Alternância de Visualização */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border">
          <Button
            size="sm"
            onClick={() => setVisualizacao('grid')}
            className={`h-8 px-3 ${
              visualizacao === 'grid' 
                ? 'shadow-sm font-semibold bg-white text-slate-900 hover:bg-white' 
                : 'bg-transparent text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Grid className="h-4 w-4 mr-1.5" /> Cards
          </Button>
          <Button
            size="sm"
            onClick={() => setVisualizacao('lista')}
            className={`h-8 px-3 ${
              visualizacao === 'lista' 
                ? 'shadow-sm font-semibold bg-white text-slate-900 hover:bg-white' 
                : 'bg-transparent text-slate-500 hover:bg-slate-200'
            }`}
          >
            <ListIcon className="h-4 w-4 mr-1.5" /> Lista
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando catálogo...</div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Nenhum produto cadastrado.</div>
        ) : visualizacao === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {produtos.map((prod) => (
              <div key={prod.id} className="bg-white rounded-xl shadow-sm border p-3 flex flex-col justify-between">
                <div>
                  <div className="h-32 bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">Sem imagem</span>
                    )}
                  </div>
                  <h2 className="text-xs font-bold text-gray-900 line-clamp-1">{prod.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{prod.category || 'Geral'}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-pink-600">
                    R$ {Number(prod.price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {produtos.map((prod) => (
              <div key={prod.id} className="bg-white rounded-xl shadow-sm border p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-400">Foto</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-gray-900">{prod.name}</h2>
                    <p className="text-[11px] text-gray-500">{prod.category || 'Geral'}</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-pink-600">
                  R$ {Number(prod.price || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}