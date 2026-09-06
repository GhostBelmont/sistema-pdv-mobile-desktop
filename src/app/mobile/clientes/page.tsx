"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, UserPlus, Phone, MapPin, Building, X } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company_name?: string;
  phone?: string;
  city?: string;
  state?: string;
}

export default function MobileClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do formulário de novo cliente
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company_name, phone, city, state")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data) setClients(data);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!name) {
      alert("O nome do responsável é obrigatório.");
      return;
    }

    try {
      const { error } = await supabase.from("clients").insert([
        {
          name,
          company_name: companyName || null,
          phone: phone || null,
          city: city || null,
          state: state || null,
          type: companyName ? "salon" : "person",
        },
      ]);

      if (error) throw error;

      alert("Salão/Cliente cadastrado com sucesso!");
      setIsModalOpen(false);
      setName("");
      setCompanyName("");
      setPhone("");
      setCity("");
      setState("");
      fetchClients();
    } catch (error: any) {
      console.error("Erro ao cadastrar cliente:", error);
      alert("Erro ao cadastrar: " + (error.message || error));
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Salões & Clientes</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-pink-600 text-white text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-1 shadow-sm hover:bg-pink-700"
          >
            <UserPlus className="h-4 w-4" /> Novo Salão
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, salão ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="p-4 flex-1">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Nenhum salão encontrado.</div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5 flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-pink-600 block">
                      {client.company_name ? "Salão de Beleza" : "Cliente Final"}
                    </span>
                    <h2 className="text-sm font-bold text-gray-900">
                      {client.company_name || client.name}
                    </h2>
                    {client.company_name && (
                      <p className="text-xs text-gray-500">Resp: {client.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-gray-50 text-xs text-gray-600">
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-1 text-pink-600 font-medium hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {client.phone}
                    </a>
                  )}
                  {client.city && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <MapPin className="h-3 w-3" /> {client.city} {client.state ? `/ ${client.state}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cadastro Rápido de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h2 className="text-base font-bold text-gray-900">Cadastrar Novo Salão</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Salão / Razão Social</label>
                <input
                  type="text"
                  placeholder="Ex: Studio Bella Hair"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Responsável *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Paula"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="Ex: SP"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-xs font-medium hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pink-600 text-white py-2.5 rounded-lg text-xs font-medium hover:bg-pink-700 shadow"
                >
                  Salvar Salão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}