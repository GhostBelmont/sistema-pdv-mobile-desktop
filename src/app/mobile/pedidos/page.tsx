"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Calendar, User, CheckCircle2, XCircle, Eye, Trash2 } from "lucide-react";

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    name: string;
  } | null;
}

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  clients: {
    name: string;
    company_name?: string;
  } | null;
  sale_items: SaleItem[];
}

export default function MobilePedidosPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal e Ação de Cancelamento
  const [vendaSelecionada, setVendaSelecionada] = useState<Sale | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          created_at,
          total_amount,
          payment_method,
          payment_status,
          clients (
            name,
            company_name
          ),
          sale_items (
            id,
            product_id,
            quantity,
            unit_price,
            subtotal,
            products (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setSales(data as unknown as Sale[]);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    } finally {
      setLoading(false);
    }
  }

  // Função de Cancelamento / Estorno idêntica à do PC
  async function handleCancelarVenda(venda: Sale) {
    if (venda.payment_status === "cancelled") {
      alert("Esta venda já está cancelada.");
      return;
    }

    const confirmar = confirm(
      `Deseja realmente cancelar a Venda #${venda.id.substring(0, 8)}?\n\n` +
        `Isso irá:\n` +
        `1. Devolver os produtos ao estoque.\n` +
        `2. Remover a receita do fluxo financeiro.\n` +
        `3. Marcar a venda como CANCELADA no histórico.`
    );

    if (!confirmar) return;

    setCancelandoId(venda.id);

    try {
      // 1. Estornar Estoque
      for (const item of venda.sale_items) {
        if (!item.product_id) continue;

        const { data: prod } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        const estoqueAtual = prod?.stock_quantity ?? 0;

        await supabase
          .from("products")
          .update({ stock_quantity: estoqueAtual + item.quantity })
          .eq("id", item.product_id);
      }

      // 2. Remover do Fluxo Financeiro (Apaga o lançamento de caixa vinculado)
      const { error: errCashFlow } = await supabase
        .from("cash_flow")
        .delete()
        .eq("sale_id", venda.id);

      if (errCashFlow) {
        console.warn("Aviso sobre fluxo de caixa:", errCashFlow.message);
      }

      // 3. Atualizar estritamente o payment_status da Venda para "cancelled"
      const { error: errUpdate } = await supabase
        .from("sales")
        .update({ payment_status: "cancelled" })
        .eq("id", venda.id);

      if (errUpdate) throw errUpdate;

      alert("Venda cancelada com sucesso! Estoque estornado e financeiro atualizado.");
      if (vendaSelecionada?.id === venda.id) setVendaSelecionada(null);
      fetchSales();
    } catch (err: any) {
      alert("Erro ao cancelar venda: " + err.message);
    } finally {
      setCancelandoId(null);
    }
  }

  const filteredSales = sales.filter((sale) => {
    const nomeCliente = sale.clients?.company_name
      ? `${sale.clients.company_name} (${sale.clients.name})`
      : sale.clients?.name || "Cliente Avulso";
    const codigoVenda = sale.id.substring(0, 8);

    return (
      nomeCliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      codigoVenda.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalVendasAtivas = filteredSales
    .filter((s) => s.payment_status !== "cancelled")
    .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

  const formatarMetodoPagamento = (metodo: string) => {
    switch (metodo) {
      case "pix":
        return "PIX";
      case "credit_card":
        return "Cartão Crédito";
      case "debit_card":
        return "Cartão Débito";
      case "cash":
        return "Dinheiro";
      default:
        return metodo || "N/A";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header Fixo com Resumo */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Histórico de Vendas</h1>
            <p className="text-xs text-gray-500">
              Total: R$ {totalVendasAtivas.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <span className="text-xs font-bold bg-pink-50 text-pink-700 px-2.5 py-1 rounded-full">
            {filteredSales.length} pedido(s)
          </span>
        </div>

        {/* Barra de Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente ou código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="p-4 flex-1">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando pedidos...</div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Nenhuma venda encontrada.</div>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale) => {
              const dataFormatada = new Date(sale.created_at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              });

              const nomeCliente = sale.clients?.company_name
                ? `${sale.clients.company_name} (${sale.clients.name})`
                : sale.clients?.name || "Cliente Avulso";

              const isCancelada = sale.payment_status === "cancelled";

              return (
                <div
                  key={sale.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 space-y-3 ${
                    isCancelada ? "opacity-60 border-red-100 bg-red-50/20" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 block">
                        #{sale.id.substring(0, 8)}
                      </span>
                      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1 mt-0.5">
                        <User className="h-3.5 w-3.5 text-pink-600" /> {nomeCliente}
                      </h2>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isCancelada
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {isCancelada ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {isCancelada ? "Cancelada" : "Concluída"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>{dataFormatada}</span>
                    </div>
                    {sale.payment_method && (
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {formatarMetodoPagamento(sale.payment_method)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div>
                      <span className="text-[10px] text-gray-400 block">
                        {sale.sale_items?.reduce((a, b) => a + b.quantity, 0) || 0} item(ns)
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          isCancelada ? "line-through text-gray-400" : "text-gray-900"
                        }`}
                      >
                        R$ {Number(sale.total_amount).toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    {/* Botões de Ação Rápidos no Card Mobile */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVendaSelecionada(sale)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                      {!isCancelada && (
                        <button
                          disabled={cancelandoId === sale.id}
                          onClick={() => handleCancelarVenda(sale)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Cancelar Venda"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Modal de Detalhes do Pedido (Mobile Otimizado) */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
            {/* Header do Modal */}
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Pedido #{vendaSelecionada.id.substring(0, 8)}
                  </h3>
                  {vendaSelecionada.payment_status === "cancelled" && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Cancelada
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  {new Date(vendaSelecionada.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <button
                onClick={() => setVendaSelecionada(null)}
                className="w-8 h-8 rounded-full bg-gray-200/60 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Corpo do Modal (Informações e Itens) */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Cliente</span>
                  <span className="font-bold text-gray-800">
                    {vendaSelecionada.clients?.company_name
                      ? `${vendaSelecionada.clients.company_name} (${vendaSelecionada.clients.name})`
                      : vendaSelecionada.clients?.name || "Cliente Avulso"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Pagamento</span>
                  <span className="font-bold text-gray-800 uppercase">
                    {formatarMetodoPagamento(vendaSelecionada.payment_method)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Itens do Pedido
                </h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {vendaSelecionada.sale_items?.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs bg-white">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {item.products?.name || "Produto Removido"}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Qtd: {item.quantity} x R$ {Number(item.unit_price).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">
                        R$ {Number(item.subtotal).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-sm font-bold text-gray-600">Total Geral</span>
                <span
                  className={`text-lg font-black ${
                    vendaSelecionada.payment_status === "cancelled"
                      ? "line-through text-gray-400"
                      : "text-pink-600"
                  }`}
                >
                  R$ {Number(vendaSelecionada.total_amount).toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Rodapé do Modal com Ações */}
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-3">
              {vendaSelecionada.payment_status !== "cancelled" ? (
                <button
                  disabled={cancelandoId === vendaSelecionada.id}
                  onClick={() => handleCancelarVenda(vendaSelecionada)}
                  className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                >
                  <Trash2 className="h-4 w-4" /> Cancelar / Estornar Venda
                </button>
              ) : (
                <span className="text-xs text-red-600 flex items-center gap-1 font-semibold flex-1">
                  <XCircle className="h-4 w-4" /> Esta venda já foi estornada.
                </span>
              )}
              <button
                onClick={() => setVendaSelecionada(null)}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}