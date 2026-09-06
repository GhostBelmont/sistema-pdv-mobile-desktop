'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, AlertTriangle, Trash2, Pencil, Upload, Image as ImageIcon } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: string
  name: string
  brand?: string
  category?: string
  sku?: string
  cost_price: number
  selling_price: number
  stock_quantity: number
  min_stock_quantity: number
  expiration_date?: string
  description?: string
  image_url?: string
}

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Product[]>([])
  const [busca, setBusca] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enviandoImagem, setEnviandoImagem] = useState(false)

  const [produtoEditando, setProdutoEditando] = useState<Product | null>(null)

  // Campos do Formulário
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [sku, setSku] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [minStockQuantity, setMinStockQuantity] = useState('5')
  const [expirationDate, setExpirationDate] = useState('')
  const [description, setDescription] = useState('')
  
  // Imagem
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  function resetForm() {
    setName('')
    setBrand('')
    setCategory('')
    setSku('')
    setCostPrice('')
    setSellingPrice('')
    setStockQuantity('')
    setMinStockQuantity('5')
    setExpirationDate('')
    setDescription('')
    setImageUrl('')
    setImageFile(null)
    setImagePreview('')
    setProdutoEditando(null)
  }

  function handleNovoProduto() {
    resetForm()
    setOpen(true)
  }

  function handleEditarProduto(produto: Product) {
    setProdutoEditando(produto)
    setName(produto.name || '')
    setBrand(produto.brand || '')
    setCategory(produto.category || '')
    setSku(produto.sku || '')
    setCostPrice(produto.cost_price ? String(produto.cost_price) : '')
    setSellingPrice(produto.selling_price ? String(produto.selling_price) : '')
    setStockQuantity(produto.stock_quantity ? String(produto.stock_quantity) : '0')
    setMinStockQuantity(
      produto.min_stock_quantity ? String(produto.min_stock_quantity) : '5'
    )
    setExpirationDate(produto.expiration_date || '')
    setDescription(produto.description || '')
    setImageUrl(produto.image_url || '')
    setImagePreview(produto.image_url || '')
    setImageFile(null)
    setOpen(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  async function uploadImagem(file: File): Promise<string | null> {
    try {
      setEnviandoImagem(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Erro no upload da imagem:', uploadError)
        return null
      }

      const { data } = supabase.storage.from('products').getPublicUrl(filePath)
      return data.publicUrl
    } catch (err) {
      console.error('Erro inesperado no upload:', err)
      return null
    } finally {
      setEnviandoImagem(false)
    }
  }

  async function carregarProdutos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data) {
      setProdutos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function handleSalvarProduto(e: React.FormEvent) {
    e.preventDefault()

    let finalImageUrl = imageUrl

    if (imageFile) {
      const uploadedUrl = await uploadImagem(imageFile)
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl
      }
    }

    const dadosProduto = {
      name,
      brand: brand || null,
      category: category || null,
      sku: sku || null,
      cost_price: parseFloat(costPrice) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      stock_quantity: parseInt(stockQuantity) || 0,
      min_stock_quantity: parseInt(minStockQuantity) || 5,
      expiration_date: expirationDate || null,
      description: description || null,
      image_url: finalImageUrl || null,
    }

    let error

    if (produtoEditando) {
      const res = await supabase
        .from('products')
        .update(dadosProduto)
        .eq('id', produtoEditando.id)
      error = res.error
    } else {
      const res = await supabase.from('products').insert([dadosProduto])
      error = res.error
    }

    if (!error) {
      resetForm()
      setOpen(false)
      carregarProdutos()
    } else {
      alert('Erro ao salvar produto: ' + error.message)
    }
  }

  async function handleDeletarProduto(id: string) {
    if (confirm('Deseja realmente excluir este produto?')) {
      await supabase.from('products').delete().eq('id', id)
      carregarProdutos()
    }
  }

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.name.toLowerCase().includes(busca.toLowerCase()) ||
      p.brand?.toLowerCase().includes(busca.toLowerCase()) ||
      p.category?.toLowerCase().includes(busca.toLowerCase()) ||
      p.sku?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque & Produtos</h1>
          <p className="text-slate-500">
            Gerencie seu inventário de produtos capilares.
          </p>
        </div>

        <Button
          onClick={handleNovoProduto}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>

        <Dialog
          open={open}
          onOpenChange={(val) => {
            setOpen(val)
            if (!val) resetForm()
          }}
        >
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {produtoEditando ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvarProduto} className="space-y-4 mt-2">
              {/* Campo de Upload da Imagem */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Foto do Produto
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer text-xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      PNG, JPG ou WEBP. A imagem será exibida no catálogo de vendas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Shampoo Pós-Química 1L"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Marca e Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Marca / Linha</label>
                  <Input
                    placeholder="Ex: Haskell, Loreal"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Categoria</label>
                  <Input
                    placeholder="Ex: Tratam. / Lavatório"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              {/* SKU e Validade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Código / SKU</label>
                  <Input
                    placeholder="Ex: 7891234567890"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Data de Validade</label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Preços */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Preço de Custo (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Preço de Venda (R$) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Estoque */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Qtd. em Estoque <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    placeholder="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Estoque Mínimo</label>
                  <Input
                    type="number"
                    value={minStockQuantity}
                    onChange={(e) => setMinStockQuantity(e.target.value)}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-sm font-medium text-slate-700">Descrição / Observações</label>
                <Input
                  placeholder="Ex: Uso exclusivo para lavatório ou observações adicionais"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={enviandoImagem}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {enviandoImagem
                    ? 'Enviando imagem...'
                    : produtoEditando
                    ? 'Atualizar Produto'
                    : 'Salvar Produto'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border">
        <Search className="text-slate-400 ml-2 h-5 w-5" />
        <Input
          placeholder="Buscar produto por nome, marca, categoria ou código/SKU..."
          className="border-0 focus-visible:ring-0 shadow-none"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Foto</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Marca / Linha</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço de Custo</TableHead>
              <TableHead className="text-right">Preço de Venda</TableHead>
              <TableHead className="text-center">Qtd.</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Carregando produtos...
                </TableCell>
              </TableRow>
            ) : produtosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  Nenhum produto cadastrado até o momento.
                </TableCell>
              </TableRow>
            ) : (
              produtosFiltrados.map((prod) => {
                const emAlerta = prod.stock_quantity <= prod.min_stock_quantity
                return (
                  <TableRow key={prod.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-md bg-slate-100 border overflow-hidden flex items-center justify-center">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{prod.name}</div>
                      {prod.sku && (
                        <div className="text-[11px] text-slate-400">SKU: {prod.sku}</div>
                      )}
                    </TableCell>
                    <TableCell>{prod.brand || '-'}</TableCell>
                    <TableCell>{prod.category || '-'}</TableCell>
                    <TableCell className="text-right">
                      R$ {Number(prod.cost_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {Number(prod.selling_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{prod.stock_quantity}</span>
                        {emAlerta && (
                          <Badge variant="destructive" className="px-1 py-0 text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" /> Baixo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                          onClick={() => handleEditarProduto(prod)}
                          title="Editar Produto"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeletarProduto(prod.id)}
                          title="Excluir Produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
  )
}