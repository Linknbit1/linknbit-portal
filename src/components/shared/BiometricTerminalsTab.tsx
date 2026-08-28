import { useMemo, useState } from 'react'
import {
  Fingerprint, Plus, Link2, Unlink, AlertTriangle, Clock,
  Power, KeyRound, Copy, CheckCircle2, RefreshCw, X,
} from 'lucide-react'
import {
  useTerminals,
  useUnmatchedPunches,
  useEnrollmentLinks,
  useCreateTerminal,
  useRotateTerminalSecret,
  useSetTerminalActive,
  useLinkEnrollment,
  useUnlinkEnrollment,
} from '../../hooks/useBiometric'
import { parseRoster, type EnrollmentLink, type RosterEntry, type TerminalPublic } from '../../api/biometric'
import { terminalHealth, clockSkewLabel, type TerminalHealth } from '../../lib/terminalHealth'
import { useToast } from '../ui/toast-context'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Avatar } from '../ui/Avatar'
import { DepartedBadge } from '../ui/DepartedBadge'
import { ModalShell } from '../ui/ModalShell'
import { cn } from '../../lib/cn'

const HEALTH_STYLE: Record<TerminalHealth, { dot: string; fg: string; ring: string }> = {
  online:   { dot: 'bg-success',  fg: 'text-success',  ring: 'border-success/30 bg-success/8' },
  stale:    { dot: 'bg-warning',  fg: 'text-warning',  ring: 'border-warning/30 bg-warning/8' },
  offline:  { dot: 'bg-error',    fg: 'text-error',    ring: 'border-error/30 bg-error/8' },
  disabled: { dot: 'bg-text-4',   fg: 'text-text-3',   ring: 'border-border-default bg-surface-2' },
}

/**
 * crypto.getRandomValues (unlike crypto.randomUUID / crypto.subtle) is available
 * in a non-secure context, so minting a secret still works when the portal is
 * opened over plain HTTP on the office LAN.
 */
function mintSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/* ── Secret reveal ─────────────────────────────────────────────────────────── */

function SecretReveal({ secret, onDone }: { secret: string; onDone: () => void }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      toast('Secret copied', 'success')
    } catch {
      toast('Could not copy, select the text manually', 'error')
    }
  }

  return (
    <div className="bg-warning/8 border border-warning/30 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <KeyRound size={15} className="text-warning shrink-0 mt-0.5" />
        <div>
          <p className="font-ui font-semibold text-[13px] text-warning">
            Copy this secret now. It is not stored and cannot be shown again
          </p>
          <p className="font-ui text-[12px] text-text-3 mt-0.5">
            Put it in <code className="font-mono text-[11px]">ZK_TERMINAL_SECRET</code> in{' '}
            <code className="font-mono text-[11px]">/etc/linknbit-zk.env</code> on the Pi, then
            restart the bridge.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-[11.5px] text-text-1 bg-surface-inset border border-border-default rounded-sm px-3 py-2 break-all">
          {secret}
        </code>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onDone}>I&rsquo;ve saved it</Button>
      </div>
    </div>
  )
}

/**
 * The secret is shown exactly once and cannot be recovered, so this modal sets
 * `busy` to block Esc and backdrop-click — the only way out is the explicit
 * "I've saved it" button.
 */
function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} size="md" busy contentClassName="p-5 sm:p-6">
      <SecretReveal secret={secret} onDone={onClose} />
    </ModalShell>
  )
}

/* ── Terminal card ─────────────────────────────────────────────────────────── */

function TerminalCard({ terminal }: { terminal: TerminalPublic }) {
  const toast = useToast()
  const setActive = useSetTerminalActive()
  const rotate = useRotateTerminalSecret()
  const [newSecret, setNewSecret] = useState<string | null>(null)

  const health = terminalHealth(terminal.last_heartbeat_at, terminal.is_active)
  const style = HEALTH_STYLE[health.health]
  const skew = clockSkewLabel(terminal.clock_skew_sec)

  const handleRotate = async () => {
    const secret = mintSecret()
    try {
      await rotate.mutateAsync({ id: terminal.id, secret })
      setNewSecret(secret)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not rotate the secret', 'error')
    }
  }

  const handleToggle = async () => {
    try {
      await setActive.mutateAsync({ id: terminal.id, isActive: !terminal.is_active })
      toast(terminal.is_active ? 'Terminal disabled' : 'Terminal enabled', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update the terminal', 'error')
    }
  }

  return (
    <div className={cn('border rounded-lg p-4 flex flex-col gap-3', style.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-9 rounded-md bg-surface-2 border border-border-default flex items-center justify-center shrink-0">
            <Fingerprint size={17} className={style.fg} />
          </div>
          <div className="min-w-0">
            <p className="font-ui font-semibold text-[13.5px] text-text-1 truncate">{terminal.name}</p>
            <p className="font-mono text-[11px] text-text-4 truncate">
              {terminal.location ?? 'No location set'}
              {terminal.device_ip && ` · ${terminal.device_ip}`}
            </p>
          </div>
        </div>
        <span className={cn('flex items-center gap-1.5 font-mono text-[11px] shrink-0', style.fg)}>
          <span className={cn('size-2 rounded-full', style.dot)} />
          {health.label}
        </span>
      </div>

      {/* The failure mode that matters: a dead relay silently marks everyone absent. */}
      {health.health === 'offline' && terminal.is_active && (
        <div className="flex items-start gap-2 bg-error/8 border border-error/25 rounded-sm px-3 py-2">
          <AlertTriangle size={13} className="text-error shrink-0 mt-0.5" />
          <p className="font-ui text-[11.5px] text-error">
            No heartbeat from the relay
            {health.minutesSince !== null && ` for ${health.minutesSince} min`}. While a terminal is
            down, on-site members fall back to portal check-in so nobody is blocked. On the Pi:{' '}
            <code className="font-mono">journalctl -u linknbit-zk -f</code>. Running it by hand:{' '}
            <code className="font-mono">zk_bridge.py</code> without <code className="font-mono">--once</code>{' '}
            keeps it reporting.
          </p>
        </div>
      )}

      {skew && (
        <div className="flex items-start gap-2 bg-warning/8 border border-warning/25 rounded-sm px-3 py-2">
          <Clock size={13} className="text-warning shrink-0 mt-0.5" />
          <p className="font-ui text-[11.5px] text-warning">
            {skew}, late/on-time results may be wrong. Run{' '}
            <code className="font-mono">zk_provision.py --sync-time</code>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-text-3">
        <span>Firmware <span className="text-text-4">{terminal.firmware ?? '-'}</span></span>
        <span>Serial <span className="text-text-4">{terminal.serial_number ?? '-'}</span></span>
        <span>Device log <span className="text-text-4">{terminal.device_log_count ?? '-'}</span></span>
        <span>Last poll <span className="text-text-4">{fmtWhen(terminal.last_poll_at)}</span></span>
      </div>

      {newSecret && <SecretModal secret={newSecret} onClose={() => setNewSecret(null)} />}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="secondary" onClick={handleRotate} disabled={rotate.isPending}>
          <RefreshCw size={13} />
          {rotate.isPending ? 'Rotating…' : 'Rotate secret'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleToggle} disabled={setActive.isPending}>
          <Power size={13} />
          {terminal.is_active ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  )
}

/* ── Add terminal ──────────────────────────────────────────────────────────── */

const INPUT_CLS =
  'h-9 px-3 w-full bg-surface-inset border border-border-default rounded-sm font-ui text-[13px] ' +
  'text-text-1 placeholder:text-text-4 focus:border-border-focus outline-none'

function AddTerminalModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const create = useCreateTerminal()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [deviceIp, setDeviceIp] = useState('')
  const [secret, setSecret] = useState<string | null>(null)

  const handleCreate = async () => {
    const generated = mintSecret()
    try {
      await create.mutateAsync({ name, location, deviceIp, secret: generated })
      // Swap the form for the secret in place rather than closing: the secret is
      // unrecoverable, so it must not depend on a second modal surviving.
      setSecret(generated)
      toast('Terminal registered', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not register the terminal', 'error')
    }
  }

  if (secret) return <SecretModal secret={secret} onClose={onClose} />

  return (
    <ModalShell onClose={onClose} size="md" busy={create.isPending} contentClassName="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-[16px] text-text-1">Register a terminal</h3>
        <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-[12px] text-text-3">Name</span>
          <input
            className={INPUT_CLS}
            placeholder="K40 Main Office"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-[12px] text-text-3">Location</span>
          <input
            className={INPUT_CLS}
            placeholder="Reception"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-[12px] text-text-3">Device IP</span>
          <input
            className={INPUT_CLS}
            placeholder="192.168.18.91"
            value={deviceIp}
            onChange={(e) => setDeviceIp(e.target.value)}
          />
        </label>

        <p className="font-ui text-[11.5px] text-text-4">
          A secret is generated for you and shown once. The name must match{' '}
          <code className="font-mono text-[11px]">ZK_TERMINAL_NAME</code> on the Pi exactly -
          avoid dashes that are easy to mistype.
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-border-subtle flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
        <Button size="sm" onClick={handleCreate} disabled={!name.trim() || create.isPending}>
          {create.isPending ? 'Registering…' : 'Register'}
        </Button>
      </div>
    </ModalShell>
  )
}

function AddTerminal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add terminal
      </Button>
      {open && <AddTerminalModal onClose={() => setOpen(false)} />}
    </>
  )
}

/* ── Enroll-number linking ─────────────────────────────────────────────────── */

function LinkRow({ entry, linkedTo }: { entry: RosterEntry; linkedTo: EnrollmentLink | null }) {
  const toast = useToast()
  const link = useLinkEnrollment()
  const unlink = useUnlinkEnrollment()
  const { data: members = [] } = useEnrollmentLinks()
  const [selected, setSelected] = useState('')

  // Someone who has left can't be given a fingerprint.
  const options = useMemo(
    () => members.filter((m) => m.is_active).map((m) => ({
      value: m.id,
      label: m.zk_user_id ? `${m.name} (#${m.zk_user_id})` : m.name,
      avatar: { name: m.name, url: m.avatar_url },
    })),
    [members],
  )

  const handleUnlink = async () => {
    if (!linkedTo) return
    try {
      await unlink.mutateAsync(linkedTo.id)
      toast(`#${entry.zk_user_id} freed, past attendance is unchanged`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not unlink', 'error')
    }
  }

  const handleLink = async () => {
    try {
      const result = await link.mutateAsync({ profileId: selected, zkUserId: entry.zk_user_id })
      setSelected('')
      toast(
        result.adopted_punches > 0
          ? `Linked, ${result.adopted_punches} earlier punch(es) across ${result.affected_dates.length} day(s) attached`
          : 'Linked',
        'success',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not link the enroll number', 'error')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-3.5 py-2.5 border-b border-border-subtle last:border-0">
      <span className="font-mono text-[12px] text-text-2 w-14 shrink-0">#{entry.zk_user_id}</span>
      <span className="font-ui text-[12.5px] text-text-3 flex-1 min-w-30 truncate">
        {entry.name || <span className="text-text-4 italic">no name on device</span>}
      </span>
      {linkedTo && !linkedTo.is_active ? (
        // The link is kept on purpose (see fetchEnrollmentLinks); what the admin
        // needs here is to know whose finger is still enrolled on the device and
        // to be able to free the ID once they have deleted it at the keypad.
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-ui text-[12px] text-text-3">
            <Link2 size={13} className="text-text-4" /> {linkedTo.name}
          </span>
          <DepartedBadge />
          <Button size="sm" variant="ghost" onClick={handleUnlink} disabled={unlink.isPending}>
            <Unlink size={13} /> Unlink
          </Button>
        </div>
      ) : linkedTo ? (
        <span className="flex items-center gap-1.5 font-ui text-[12px] text-success">
          <Link2 size={13} /> {linkedTo.name}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <Select
            value={selected}
            onChange={setSelected}
            options={options}
            placeholder="Link to member…"
            size="sm"
            className="w-52"
          />
          <Button size="sm" onClick={handleLink} disabled={!selected || link.isPending}>
            <Link2 size={13} /> Link
          </Button>
        </div>
      )}
    </div>
  )
}

function LinkedMembers() {
  const toast = useToast()
  const { data: members = [] } = useEnrollmentLinks()
  const unlink = useUnlinkEnrollment()
  // Leavers first: theirs are the links that need an admin decision.
  const linked = members
    .filter((m) => m.zk_user_id)
    .sort((a, b) => Number(a.is_active) - Number(b.is_active))

  const handleUnlink = async (id: string) => {
    try {
      await unlink.mutateAsync(id)
      toast('Enroll number unlinked, past attendance is unchanged', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not unlink', 'error')
    }
  }

  return (
    <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-border-subtle">
        <p className="font-ui font-semibold text-[13px] text-text-1">
          Linked members <span className="text-text-4 font-normal">({linked.length})</span>
        </p>
      </div>
      {linked.length === 0 ? (
        <p className="px-3.5 py-6 text-center font-ui text-[12px] text-text-4">
          Nobody is linked to a terminal ID yet. Link people above and they appear here.
        </p>
      ) : (
        linked.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-subtle last:border-0">
            <Avatar name={m.name} src={m.avatar_url ?? undefined} size="xs" />
            <span className={cn('font-ui text-[12.5px] flex-1 truncate', m.is_active ? 'text-text-1' : 'text-text-3')}>
              {m.name}
            </span>
            {!m.is_active && <DepartedBadge />}
            <span className="font-mono text-[12px] text-text-3">#{m.zk_user_id}</span>
            <Button size="sm" variant="ghost" onClick={() => handleUnlink(m.id)} disabled={unlink.isPending}>
              <Unlink size={13} /> Unlink
            </Button>
          </div>
        ))
      )}
    </div>
  )
}

/* ── Tab ───────────────────────────────────────────────────────────────────── */

export function BiometricTerminalsTab() {
  const { data: terminals = [], isLoading } = useTerminals()
  const { data: members = [] } = useEnrollmentLinks()
  const { data: unmatched = [] } = useUnmatchedPunches()

  const linkedByZkId = useMemo(() => {
    const map = new Map<string, EnrollmentLink>()
    for (const m of members) if (m.zk_user_id) map.set(m.zk_user_id, m)
    return map
  }, [members])

  // The device roster is the good linking source (it carries names). Enroll
  // numbers seen only in unmatched punches are folded in as a fallback, so a
  // punch from someone missing from the roster snapshot is still linkable.
  const rosterEntries = useMemo(() => {
    const byId = new Map<string, RosterEntry>()
    for (const t of terminals) {
      for (const entry of parseRoster(t.device_roster)) byId.set(entry.zk_user_id, entry)
    }
    for (const punch of unmatched) {
      if (!byId.has(punch.zk_user_id)) {
        byId.set(punch.zk_user_id, { zk_user_id: punch.zk_user_id, name: '', privilege: 0 })
      }
    }
    return [...byId.values()].sort((a, b) => a.zk_user_id.localeCompare(b.zk_user_id, undefined, { numeric: true }))
  }, [terminals, unmatched])

  const unlinkedCount = rosterEntries.filter((e) => !linkedByZkId.has(e.zk_user_id)).length
  // Enrolled fingers belonging to people who have left. Counted separately: the
  // fix is to delete the finger at the keypad and free the ID, not to link it.
  const departedCount = rosterEntries.filter((e) => linkedByZkId.get(e.zk_user_id)?.is_active === false).length

  // Surfaced in the empty state so "nothing here" can be told apart from
  // "the portal has never heard from the device".
  const rosterSyncedLabel = useMemo(() => {
    const stamps = terminals
      .map((t) => t.roster_synced_at)
      .filter((s): s is string => Boolean(s))
      .sort()
    const latest = stamps.at(-1)
    if (!latest) return 'Device list never synced yet'
    return `Device list last synced ${fmtWhen(latest)}`
  }, [terminals])

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-surface-1 border border-border-default animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-ui font-semibold text-[14px] text-text-1">Biometric terminals</p>
          <p className="font-ui text-[12px] text-text-3 mt-0.5">
            On-site members mark attendance at the terminal; the portal button is their fallback
            when the relay is down.
          </p>
        </div>
        <AddTerminal />
      </div>

      {terminals.length === 0 ? (
        <div className="bg-surface-1 border border-border-default rounded-lg px-4 py-8 text-center">
          <Fingerprint size={26} className="text-text-4 mx-auto" />
          <p className="font-ui font-semibold text-[13px] text-text-2 mt-2.5">No terminals registered</p>
          <p className="font-ui text-[12px] text-text-4 mt-1 max-w-100 mx-auto">
            Register the K40 here, then put its name and secret in{' '}
            <code className="font-mono text-[11px]">/etc/linknbit-zk.env</code> on the Pi. See{' '}
            <code className="font-mono text-[11px]">script/README.md</code>.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {terminals.map((t) => <TerminalCard key={t.id} terminal={t} />)}
        </div>
      )}

      {/* Always rendered once a terminal exists. Hiding this section when the
          device has nobody enrolled removes the very instructions the admin is
          looking for at that moment. */}
      {terminals.length > 0 && (
        <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center justify-between gap-3">
            <p className="font-ui font-semibold text-[13px] text-text-1">Enrolled on the device</p>
            <div className="flex items-center gap-2.5">
              {departedCount > 0 && (
                <span className="font-mono text-[11px] text-brand-red">{departedCount} left the company</span>
              )}
              {unlinkedCount > 0 && (
                <span className="font-mono text-[11px] text-warning">{unlinkedCount} unlinked</span>
              )}
            </div>
          </div>

          {rosterEntries.length === 0 ? (
            <div className="px-4 py-7 text-center">
              <Fingerprint size={24} className="text-text-4 mx-auto" />
              <p className="font-ui font-semibold text-[13px] text-text-2 mt-2.5">
                No fingerprints enrolled on the terminal yet
              </p>
              <p className="font-ui text-[12px] text-text-4 mt-1.5 max-w-110 mx-auto">
                Enrol people at the terminal keypad, typically{' '}
                <span className="text-text-3">Menu → User Mgt → New User</span>, and note the user
                ID it assigns. They show up here on the next roster sync, and you then link each ID
                to a member.
              </p>
              <p className="font-mono text-[11px] text-text-4 mt-2.5">
                {rosterSyncedLabel}
              </p>
            </div>
          ) : (
            rosterEntries.map((entry) => (
              <LinkRow
                key={entry.zk_user_id}
                entry={entry}
                linkedTo={linkedByZkId.get(entry.zk_user_id) ?? null}
              />
            ))
          )}
        </div>
      )}

      {terminals.length > 0 && <LinkedMembers />}
    </div>
  )
}
