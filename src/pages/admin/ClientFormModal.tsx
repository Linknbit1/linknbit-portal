import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { usePeople } from '../../hooks/usePeople'
import { useCreateClient, useUpdateClient } from '../../hooks/useClients'
import { useToast } from '../../components/ui/toast-context'
import type { ClientRow } from '../../api/clients'

interface ClientFormModalProps {
  client?: ClientRow
  onClose: () => void
}

type ClientStatus = ClientRow['status']
const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_hold', label: 'On Hold' },
]
const isClientStatus = (v: string): v is ClientStatus => STATUS_OPTIONS.some((o) => o.value === v)

export function ClientFormModal({ client, onClose }: ClientFormModalProps) {
  const toast = useToast()
  const isEdit = !!client
  const { data: people = [] } = usePeople()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()

  const [name, setName] = useState(client?.name ?? '')
  const [company, setCompany] = useState(client?.company ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [industry, setIndustry] = useState(client?.industry ?? '')
  const [managerId, setManagerId] = useState(client?.account_manager_id ?? '')
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'active')

  const managerOptions = [
    { value: '', label: 'Unassigned' },
    ...people.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } })),
  ]
  const pending = createClient.isPending || updateClient.isPending

  const handleSubmit = () => {
    if (!name.trim()) { toast('Client name is required', 'error'); return }
    const payload = {
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      industry: industry.trim() || null,
      account_manager_id: managerId || null,
      status,
    }
    const onSuccess = () => { toast(isEdit ? 'Client updated' : 'Client added', 'success'); onClose() }
    const onError = (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error')

    if (isEdit) updateClient.mutate({ id: client.id, updates: payload }, { onSuccess, onError })
    else createClient.mutate(payload, { onSuccess, onError })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit client' : 'New client'}
      size="md"
      busy={pending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSubmit} loading={pending}>{isEdit ? 'Save changes' : 'Add client'}</Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <Input label="Client name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cricket Sansar" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
          <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Account manager</label>
            <Select value={managerId} onChange={setManagerId} options={managerOptions} placeholder="Unassigned" />
          </div>
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Status</label>
            <Select value={status} onChange={(v) => { if (isClientStatus(v)) setStatus(v) }} options={STATUS_OPTIONS} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
