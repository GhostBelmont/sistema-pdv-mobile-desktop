"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Trash2, CheckCircle2, User, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  company_name?: string;
  type: 'person' | 'salon';
}

interface Product {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function MobilePDVPage() {
  const [clientes, setClientes] = useState<Client[]>([]);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);

      // 1. Buscar Clientes
      const { data: dataClientes } = await supabase
        .from('clients')
        .select('id, name, company_name, type')
        .order('name', { ascending: true });

      if (dataClientes) setClientes(dataClientes);

      // 2. Buscar Produtos para referência de estoque
      const { data: dataProdutos } = await supabase
        .from('products')
        .select('id, name, selling_price, stock_quantity')
        .order('name', { ascending: true });

      let listaProdutosFormatados: Product[] = [];
      if (dataProdutos) {
        listaProdutosFormatados = dataProdutos.map((p: any) => ({
          id: p.id,
          name: p.name || 'Produto sem nome',
          selling_price: Number(p.selling_price ?? 0),
          stock_quantity: Number(p.stock_quantity ?? 0),
        }));
        setProdutos(listaProdutosFormatados);
      }

      // 3. PROCESSAR CARRINHO VINDO DO CATÁLOGO (localStorage)
      const dadosSalvos = localStorage.getItem('carrinho_catalogo');
      if (dadosSalvos) {
        try {
          const itensCatalogo: { product_id: string; quantity: number; unit_price: number; name: string }[] = JSON.parse(dadosSalvos);
          const novosItensCarrinho: CartItem[] = [];

          for (const item of itensCatalogo) {
            const prodCadastrado = listaProdutosFormatados.find((p) => p.id === item.product_id);

            const produtoRef: Product = prodCadastrado || {
              id: item.product_id,
              name: item.name,
              selling_price: item.unit_price,
              stock_quantity: 999,
            };

            novosItensCarrinho.push({
              product: produtoRef,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.quantity * item.unit_price,
            });
          }

          setCart(novosItensCarrinho);
        } catch (err) {
          console.error('Erro ao processar itens do catálogo:', err);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleRemoverItem(index: number) {
    const novoCarrinho = cart.filter((_, i) => i !== index);
    setCart(novoCarrinho);
    
    // Atualizar o localStorage também para manter sincronizado
    const itensSalvar = novoCarrinho.map((i) => ({
      product_id: i.product.id,
      name: i.product.name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    }));
    localStorage.setItem('carrinho_catalogo', JSON.stringify(itensSalvar));
  }

  const totalVenda = cart.reduce((acc, item) => acc + item.subtotal, 0);

  async function handleFinalizarVenda() {
    if (cart.length === 0) {
      alert('O carrinho está vazio!');
      return;
    }

    setSalvando(true);

    try {
      // 1. Inserir Venda no Banco
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
        .single();

      if (erroVenda) throw erroVenda;

      // 2. Inserir Itens e Baixar Estoque
      for (const item of cart) {
        const { error: erroItem } = await supabase.from('sale_items').insert([
          {
            sale_id: venda.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          },
        ]);

        if (erroItem) throw erroItem;

        const prodOriginal = produtos.find(p => p.id === item.product.id);
        const estoqueAtual = prodOriginal ? prodOriginal.stock_quantity : item.product.stock_quantity;
        const novoEstoque = Math.max(0, estoqueAtual - item.quantity);

        await supabase
          .from('products')
          .update({ stock_quantity: novoEstoque })
          .eq('id', item.product.id);
      }

      // 3. Registrar Lançamento no Fluxo Financeiro (Caixa)
      const clienteNome = clientes.find((c) => c.id === selectedClientId)?.name || 'Cliente Avulso';
      const hoje = new Date().toISOString().split('T')[0];

      await supabase.from('cash_flow').insert([
        {
          type: 'entrada',
          category: 'Venda',
          amount: totalVenda,
          description: `Venda #${venda.id.substring(0, 8)} - ${clienteNome}`,
          sale_id: venda.id,
          date: hoje,
        },
      ]);

      alert('Venda realizada e lançada no Financeiro com sucesso!');
      
      // Limpar carrinho do localStorage e redirecionar para o histórico
      localStorage.removeItem('carrinho_catalogo');
      window.location.href = '/mobile/pedidos';
    } catch (err: any) {
      alert('Erro ao finalizar venda: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24 p-4 space-y-4">
      {/* Topo com Atalho para o Catálogo */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border">
        <h1 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-pink-600" /> Finalizar Pedido
        </h1>
        <Link
          href="/mobile/catalogo"
          className="text-xs font-semibold bg-pink-50 text-pink-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-pink-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Catálogo
        </Link>
      </div>

      {/* Seleção de Cliente */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
          <User className="h-4 w-4 text-pink-600" /> Cliente / Salão
        </label>
        <select
          className="w-full h-11 px-3 rounded-xl border bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
        >
          <option value="">Cliente Avulso (Não identificado)</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name ? `${c.company_name} (${c.name})` : c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Itens vindos do Catálogo */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Itens no Carrinho
          </h2>
          <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
            {cart.length} item(ns)
          </span>
        </div>

        {loading ? (
          <p className="text-center py-6 text-gray-400 text-xs">Carregando itens...</p>
        ) : cart.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-gray-400 text-xs">Seu carrinho está vazio.</p>
            <Link
              href="/mobile/catalogo"
              className="inline-block px-4 py-2 bg-pink-600 text-white rounded-xl text-xs font-bold hover:bg-pink-700"
            >
              Escolher produtos no Catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-gray-100">
            {cart.map((item, index) => (
              <div key={index} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-900">{item.product.name}</p>
                  <p className="text-gray-400 text-[11px]">
                    Qtd: {item.quantity} x R$ {item.unit_price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-gray-900">
                    R$ {item.subtotal.toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    onClick={() => handleRemoverItem(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo e Pagamento */}
      {cart.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-pink-600" /> Forma de Pagamento
          </h2>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'pix', label: 'PIX' },
              { id: 'credit_card', label: 'Cartão Crédito' },
              { id: 'debit_card', label: 'Cartão Débito' },
              { id: 'cash', label: 'Dinheiro' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === m.id
                    ? 'border-pink-600 bg-pink-50 text-pink-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t flex justify-between items-center text-sm font-bold">
            <span className="text-gray-600">Total da Venda</span>
            <span className="text-lg text-pink-600">
              R$ {totalVenda.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <button
            onClick={handleFinalizarVenda}
            disabled={salvando}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="h-5 w-5" />
            {salvando ? 'Processando...' : 'Finalizar Venda'}
          </button>
        </div>
      )}
    </div>
  );
}