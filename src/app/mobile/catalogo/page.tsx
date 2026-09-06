"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Plus, Minus, Search, ArrowRight, Package } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  image_url?: string;
}

interface CartItem {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

export default function MobileCatalogoPage() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});

  useEffect(() => {
    carregarProdutos();
    const salvo = localStorage.getItem("carrinho_catalogo");
    if (salvo) {
      try {
        const itens: CartItem[] = JSON.parse(salvo);
        const map: Record<string, number> = {};
        itens.forEach((i) => {
          map[i.product_id] = i.quantity;
        });
        setCarrinho(map);
      } catch (e) {
        console.error("Erro ao carregar carrinho salvo", e);
      }
    }
  }, []);

  async function carregarProdutos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, selling_price, stock_quantity, image_url")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data) setProdutos(data as Product[]);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setLoading(false);
    }
  }

  function alterarQuantidade(produto: Product, delta: number) {
    const atual = carrinho[produto.id] || 0;
    const novaQtd = atual + delta;

    if (novaQtd > produto.stock_quantity) {
      alert(`Estoque máximo atingido! Disponível: ${produto.stock_quantity}`);
      return;
    }

    const novoCarrinho = { ...carrinho };
    if (novaQtd <= 0) {
      delete novoCarrinho[produto.id];
    } else {
      novoCarrinho[produto.id] = novaQtd;
    }

    setCarrinho(novoCarrinho);
    salvarNoLocalStorage(novoCarrinho);
  }

  function salvarNoLocalStorage(mapaCarrinho: Record<string, number>) {
    const itensFormatados: CartItem[] = [];
    
    for (const [prodId, qtd] of Object.entries(mapaCarrinho)) {
      const prod = produtos.find((p) => p.id === prodId);
      if (prod) {
        itensFormatados.push({
          product_id: prod.id,
          name: prod.name,
          unit_price: prod.selling_price,
          quantity: qtd,
        });
      }
    }

    localStorage.setItem("carrinho_catalogo", JSON.stringify(itensFormatados));
  }

  const totalItens = Object.values(carrinho).reduce((a, b) => a + b, 0);

  const produtosFiltrados = produtos.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Catálogo de Produtos</h1>
          <Link
            href="/mobile/pdv?origem=catalogo"
            className="relative bg-pink-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-pink-700 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Ver Carrinho</span>
            {totalItens > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                {totalItens}
              </span>
            )}
          </Link>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Grid de Produtos (Em Blocos) */}
      <div className="p-4 flex-1">
        {loading ? (
          <p className="text-center py-12 text-gray-400 text-xs">Carregando catálogo...</p>
        ) : produtosFiltrados.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-xs">Nenhum produto encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {produtosFiltrados.map((produto) => {
              const qtdNoCarrinho = carrinho[produto.id] || 0;

              return (
                <div
                  key={produto.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
                >
                  {/* Foto Grande em Destaque */}
                  <div className="w-full h-36 bg-gray-100 relative overflow-hidden">
                    {produto.image_url ? (
                      <img 
                        src={produto.image_url} 
                        alt={produto.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
                        <Package className="h-8 w-8 stroke-1" />
                        <span className="text-[10px]">Sem foto</span>
                      </div>
                    )}
                    {/* Badge de Estoque */}
                    <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                      Estq: {produto.stock_quantity}
                    </span>
                  </div>

                  {/* Informações do Produto */}
                  <div className="p-3 flex flex-col flex-1 justify-between space-y-2">
                    <div>
                      <h2 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                        {produto.name}
                      </h2>
                      <p className="text-sm font-black text-pink-600 mt-1">
                        R$ {produto.selling_price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    {/* Botões de Ação / Quantidade */}
                    <div className="pt-1">
                      {qtdNoCarrinho > 0 ? (
                        <div className="flex items-center justify-between bg-pink-50 border border-pink-200 rounded-xl overflow-hidden p-0.5">
                          <button
                            onClick={() => alterarQuantidade(produto, -1)}
                            className="w-8 h-8 flex items-center justify-center text-pink-700 hover:bg-pink-100 rounded-lg font-bold transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-black text-pink-700">
                            {qtdNoCarrinho}
                          </span>
                          <button
                            onClick={() => alterarQuantidade(produto, 1)}
                            className="w-8 h-8 flex items-center justify-center text-pink-700 hover:bg-pink-100 rounded-lg font-bold transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => alterarQuantidade(produto, 1)}
                          className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé Flutuante do Carrinho */}
      {totalItens > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3.5 shadow-2xl flex items-center justify-between z-20">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Selecionado</span>
            <span className="text-xs font-extrabold text-gray-800">{totalItens} item(ns) no carrinho</span>
          </div>
          <Link
            href="/mobile/pdv?origem=catalogo"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>Ir para o Checkout</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}