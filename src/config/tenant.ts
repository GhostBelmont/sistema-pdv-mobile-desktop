// src/config/tenant.ts

export type BusinessType = 'cosmeticos' | 'roupas' | 'padrao'

interface TenantConfig {
  name: string
  segment: BusinessType
  labels: {
    clientes: string // ex: "Salões / Clientes" ou "Lojas / Clientes"
    produtos: string // ex: "Estoque" ou "Peças / Estoque"
    vendas: string   // ex: "Pedidos / Vendas" ou "Caixa / Vendas"
  }
}

// Você pode alterar isso aqui facilmente por cliente, ou carregar do Supabase no futuro!
export const currentTenant: TenantConfig = {
  name: 'Raiz Latina (Representação)',
  segment: 'cosmeticos', // Mude para 'roupas' se for a loja de roupas
  labels: {
    clientes: 'Salões / Clientes',
    produtos: 'Produtos / Estoque',
    vendas: 'Pedidos / Vendas',
  }
}

/* 
  Exemplo se fosse para Lojas de Roupas:
  export const currentTenant: TenantConfig = {
    name: 'Loja de Roupas Exemplo',
    segment: 'roupas',
    labels: {
      clientes: 'Clientes / Cadastros',
      produtos: 'Grade de Produtos',
      vendas: 'Frente de Caixa (PDV)',
    }
  }
*/