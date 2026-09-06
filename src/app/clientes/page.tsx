'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { maskPhone, maskCPF, maskCNPJ, maskCEP } from '@/lib/masks'
import { Plus, Search, Trash2, Pencil, Phone, Mail, Building2, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

interface Client {
  id: string
  name: string
  type: 'person' | 'salon'
  company_name?: string
  phone?: string
  email?: string
  cpf?: string
  cnpj?: string
  cep?: string
  address?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  notes?: string
  created_at?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Client[]>([])
  const [busca, setBusca] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const [clienteEditando, setClienteEditando] = useState<Client | null>(null)

  // Campos do Formulário
  const [type, setType] = useState<'person' | 'salon'>('person')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')

  // Campos de Endereço
  const [cep, setCep] = useState('')
  const [address, setAddress] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [notes, setNotes] = useState('')

  function resetForm() {
    setType('person')
    setName('')
    setCompanyName('')
    setPhone('')
    setEmail('')
    setCpf('')
    setCnpj('')
    setCep('')
    setAddress('')
    setNumber('')
    setNeighborhood('')
    setCity('')
    setState('')
    setNotes('')
    setClienteEditando(null)
  }

  function handleNovoCliente() {
    resetForm()
    setOpen(true)
  }

  function handleEditarCliente(cliente: Client) {
    setClienteEditando(cliente)
    setType(cliente.type || 'person')
    setName(cliente.name || '')
    setCompanyName(cliente.company_name || '')
    setPhone(cliente.phone ? maskPhone(cliente.phone) : '')
    setEmail(cliente.email || '')
    setCpf(cliente.cpf ? maskCPF(cliente.cpf) : '')
    setCnpj(cliente.cnpj ? maskCNPJ(cliente.cnpj) : '')
    setCep(cliente.cep ? maskCEP(cliente.cep) : '')
    setAddress(cliente.address || '')
    setNumber(cliente.number || '')
    setNeighborhood(cliente.neighborhood || '')
    setCity(cliente.city || '')
    setState(cliente.state || '')
    setNotes(cliente.notes || '')
    setOpen(true)
  }

  async function handleCepChange(value: string) {
    const cepMascarado = maskCEP(value)
    setCep(cepMascarado)

    const cleanCep = value.replace(/\D/g, '')

    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()

        if (!data.erro) {
          setAddress(data.logradouro || '')
          setNeighborhood(data.bairro || '')
          setCity(data.localidade || '')
          setState(data.uf || '')
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err)
      }
    }
  }

  async function carregarClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data) {
      setClientes(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  async function handleSalvarCliente(e: React.FormEvent) {
    e.preventDefault()

    const dadosCliente = {
      type,
      name,
      company_name: type === 'salon' ? companyName || null : null,
      phone: phone || null,
      email: email || null,
      cpf: type === 'person' ? cpf || null : null,
      cnpj: type === 'salon' ? cnpj || null : null,
      cep: cep || null,
      address: address || null,
      number: number || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      notes: notes || null,
    }

    let error

    if (clienteEditando) {
      const res = await supabase
        .from('clients')
        .update(dadosCliente)
        .eq('id', clienteEditando.id)
      error = res.error
    } else {
      const res = await supabase.from('clients').insert([dadosCliente])
      error = res.error
    }

    if (!error) {
      resetForm()
      setOpen(false)
      carregarClientes()
    } else {
      alert('Erro ao salvar cadastro: ' + error.message)
    }
  }

  async function handleDeletarCliente(id: string) {
    if (confirm('Deseja realmente excluir este cadastro?')) {
      await supabase.from('clients').delete().eq('id', id)
      carregarClientes()
    }
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.name.toLowerCase().includes(busca.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(busca.toLowerCase()) ||
      c.phone?.toLowerCase().includes(busca.toLowerCase()) ||
      c.email?.toLowerCase().includes(busca.toLowerCase()) ||
      c.city?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cpf?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpj?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Salões & Clientes</h1>
          <p className="text-slate-500">
            Gerencie o cadastro de salões parceiros e clientes finais.
          </p>
        </div>

        <Button
          onClick={handleNovoCliente}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Cadastro
        </Button>

        <Dialog
          open={open}
          onOpenChange={(val) => {
            setOpen(val)
            if (!val) resetForm()
          }}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {clienteEditando ? 'Editar Cadastro' : 'Novo Cadastro'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvarCliente} className="space-y-4 mt-2">
              
              {/* Seleção do Tipo */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Tipo de Cadastro
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('person')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      type === 'person'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <User className="h-4 w-4" /> Cliente Final (Pessoa)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('salon')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      type === 'salon'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Building2 className="h-4 w-4" /> Salão de Beleza (PJ)
                  </button>
                </div>
              </div>

              {/* Nome do Salão */}
              {type === 'salon' && (
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Nome do Salão / Razão Social <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Ex: Salão Studio VIP"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              )}

              {/* Nome Completo / Responsável */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {type === 'salon' ? 'Nome do Responsável' : 'Nome Completo'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder={type === 'salon' ? 'Ex: Ana Maria (Proprietária)' : 'Ex: Maria Silva'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Telefone e Documento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                  <Input
                    placeholder="(00) 90000-0000"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {type === 'salon' ? 'CNPJ' : 'CPF'}
                  </label>
                  {type === 'salon' ? (
                    <Input
                      placeholder="00.000.000/0001-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                    />
                  ) : (
                    <Input
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(maskCPF(e.target.value))}
                    />
                  )}
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <Input
                  type="email"
                  placeholder="contato@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* SEÇÃO: ENDEREÇO */}
              <div className="pt-2 border-t mt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-600" /> Endereço
                </h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">CEP</label>
                      <Input
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600">Rua / Logradouro</label>
                      <Input
                        placeholder="Ex: Av. Paulista"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Número</label>
                      <Input
                        placeholder="Ex: 1000 / Apt 12"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600">Bairro</label>
                      <Input
                        placeholder="Ex: Centro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600">Cidade</label>
                      <Input
                        placeholder="Ex: São Paulo"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Estado (UF)</label>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        className="uppercase"
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="pt-2 border-t">
                <label className="text-sm font-medium text-slate-700">Observações / Preferências</label>
                <Textarea
                  placeholder="Ex: Condições de pagamento combinadas, preferências, notas técnicas..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {clienteEditando ? 'Atualizar Cadastro' : 'Salvar Cadastro'}
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
          placeholder="Buscar por nome, salão, telefone, e-mail, cidade, CPF ou CNPJ..."
          className="border-0 focus-visible:ring-0 shadow-none"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Tabela de Cadastro */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Nome / Razão Social</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Carregando registros...
                </TableCell>
              </TableRow>
            ) : clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados.map((cli) => (
                <TableRow key={cli.id}>
                  {/* Badge de Tipo */}
                  <TableCell>
                    {cli.type === 'salon' ? (
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 gap-1">
                        <Building2 className="h-3 w-3" /> Salão
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-600 gap-1">
                        <User className="h-3 w-3" /> Cliente
                      </Badge>
                    )}
                  </TableCell>

                  {/* Nome e Responsável */}
                  <TableCell className="font-medium">
                    <div>
                      {cli.type === 'salon' && cli.company_name ? (
                        <div>
                          <div className="font-semibold text-slate-900">{cli.company_name}</div>
                          <div className="text-xs text-slate-500">Resp: {cli.name}</div>
                        </div>
                      ) : (
                        <div>{cli.name}</div>
                      )}
                    </div>
                  </TableCell>

                  {/* Contato */}
                  <TableCell>
                    <div className="text-xs space-y-1">
                      {cli.phone && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="h-3 w-3 text-slate-400" /> {cli.phone}
                        </div>
                      )}
                      {cli.email && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Mail className="h-3 w-3 text-slate-400" /> {cli.email}
                        </div>
                      )}
                      {!cli.phone && !cli.email && '-'}
                    </div>
                  </TableCell>

                  {/* Localização */}
                  <TableCell className="text-slate-600 text-xs">
                    {cli.city || cli.address ? (
                      <div>
                        {cli.address && <div>{cli.address}{cli.number ? `, ${cli.number}` : ''}</div>}
                        {cli.city && <div className="text-slate-400">{cli.city}{cli.state ? ` - ${cli.state}` : ''}</div>}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                        onClick={() => handleEditarCliente(cli)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletarCliente(cli.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}