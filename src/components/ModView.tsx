import { useEffect, useState } from 'react'
import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'
import { api } from '../api'
import { cn, timeAgo } from '../utils'
import type { TransferStatus, ModLookupResult } from '../types'

const ACTION_LABELS: Record<string, string> = {
  delete_request: 'deleted a request from the queue',
  approve_transfer_request: 'approved a weight transfer request',
  reject_transfer_request: 'rejected a weight transfer request',
  create_prediction: 'started a prediction',
  lock_prediction: 'locked a prediction',
  resolve_prediction: 'resolved a prediction',
  cancel_prediction: 'cancelled a prediction',
}

const STATUS_LABELS: Record<TransferStatus, string> = {
  pending: 'Pending',
  pending_mod: 'Pending mod review',
  pending_recipient: 'Pending recipient',
  accepted: 'Accepted',
  denied: 'Denied',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

function accountAge(createdAt?: string): string {
  if (!createdAt) return 'unknown'
  const d = new Date(createdAt.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return 'unknown'
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days < 1) return 'created today'
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} old`
  if (days < 365) {
    const m = Math.floor(days / 30)
    return `${m} month${m !== 1 ? 's' : ''} old`
  }
  const y = Math.floor(days / 365)
  return `${y} year${y !== 1 ? 's' : ''} old`
}

function transferCounts(c?: { requests_sent?: number; requests_received?: number; codes_created?: number } | null): string {
  if (!c) return 'sent 0, received 0, 0 codes'
  return `sent ${c.requests_sent ?? 0}, received ${c.requests_received ?? 0}, ${c.codes_created ?? 0} codes`
}

function fmtUntil(unix?: number | null): string {
  if (!unix) return ''
  const s = Math.floor(unix - Date.now() / 1000)
  if (s <= 0) return 'soon'
  const m = Math.floor(s / 60)
  if (m < 60) return `in ${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `in ${h}h ${m % 60}m`
  return `in ${Math.floor(h / 24)}d`
}

export function ModView() {
  const { canModerate, loadModData, modActions, pendingTransfers, prediction, predPresets, showAlert } = useAppState()
  const [subTab, setSubTab] = useState<'audit' | 'transfers' | 'predictions'>('audit')
  const [actionsPage, setActionsPage] = useState(1)
  const [lookupUser, setLookupUser] = useState('')
  const [lookupResult, setLookupResult] = useState<ModLookupResult | null>(null)
  const [predTitle, setPredTitle] = useState('')
  const [predOutcomes, setPredOutcomes] = useState('')
  const [predDuration, setPredDuration] = useState('')
  const [modBusy, setModBusy] = useState<string | null>(null)

  useEffect(() => {
    if (canModerate) void loadModData()
  }, [canModerate, loadModData])

  if (!canModerate) {
    return (
      <section className="mod s12 tw-max-w-md tw-mx-auto tw-text-center">
        <DotIcon name="lock" size={48} className="tw-mx-auto tw-mb-4" />
        <div className="ds">Authorized Access Only</div>
        <p className="tw-mt-2" style={{ color: 'var(--secondary)' }}>
          This panel is for channel moderators.
        </p>
      </section>
    )
  }

  const approve = async (id: number) => {
    const res = await api.approveTransferRequest(id)
    if (res && res.success) showAlert('Request approved, sent to the recipient.', 'success')
    else showAlert(res?.error || 'Failed to approve the request.', 'error')
    void loadModData()
  }

  const reject = async (id: number) => {
    if (!window.confirm('Reject this weight transfer request?')) return
    const res = await api.rejectTransferRequest(id)
    if (res && res.success) showAlert('Request rejected.', 'success')
    else showAlert(res?.error || 'Failed to reject the request.', 'error')
    void loadModData()
  }

  const runLookup = async () => {
    const u = lookupUser.trim()
    if (!u) return
    const res = await api.modLookupUser(u)
    if (res && res.error) showAlert(res.error, 'error')
    setLookupResult(res && !res.error ? res : null)
  }

  const createPred = async () => {
    const title = predTitle.trim()
    const outcomes = predOutcomes.split('\n').map((s) => s.trim()).filter(Boolean)
    const duration = parseInt(predDuration, 10) || 0
    if (!title) return showAlert('Enter a title.', 'error')
    if (outcomes.length < 2) return showAlert('Enter at least 2 outcomes, one per line.', 'error')
    setModBusy('pred-create')
    const res = await api.createPrediction(title, outcomes, duration)
    setModBusy(null)
    if (res && res.success) {
      setPredTitle('')
      setPredOutcomes('')
      setPredDuration('')
      showAlert('Prediction started.', 'success')
    } else showAlert(res?.error || 'Failed to start prediction.', 'error')
    void loadModData()
  }

  const predAction = async (kind: 'lock' | 'cancel' | 'resolve', outcomeId?: number) => {
    const id = prediction?.id
    if (!id) return
    setModBusy('pred-' + kind)
    const res =
      kind === 'lock'
        ? await api.lockPrediction(id)
        : kind === 'cancel'
          ? await api.cancelPrediction(id)
          : await api.resolvePrediction(id, outcomeId!)
    setModBusy(null)
    if (res && res.success) showAlert(kind === 'lock' ? 'Voting locked.' : kind === 'cancel' ? 'Prediction cancelled, wagers refunded.' : 'Prediction resolved.', 'success')
    else showAlert(res?.error || 'Failed.', 'error')
    void loadModData()
  }

  const savePreset = async () => {
    if (!predTitle.trim()) return showAlert('Enter a title first.', 'error')
    if (!predOutcomes.trim()) return showAlert('Enter outcomes first.', 'error')
    const res = await api.savePredictionPreset(predTitle.trim(), predOutcomes.trim())
    if (res && res.success) {
      showAlert('Preset saved.', 'success')
      void loadModData()
    } else showAlert(res?.error || 'Failed to save preset.', 'error')
  }

  const applyPreset = (p: { title: string; outcomes_text?: string; outcomes?: string[] }) => {
    setPredTitle(p.title)
    setPredOutcomes(p.outcomes_text || (p.outcomes || []).join('\n'))
  }

  const deletePreset = async (id: number) => {
    await api.deletePredictionPreset(id)
    void loadModData()
  }

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(modActions.length / pageSize))
  const page = Math.min(Math.max(1, actionsPage), totalPages)
  const pageItems = modActions.slice((page - 1) * pageSize, page * pageSize)

  const pred = prediction
  const totalPool = pred ? pred.outcomes.reduce((s, o) => s + (o.total_staked || 0), 0) : 0
  const shareUrl = pred?.share_slug ? window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + pred.share_slug : ''

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">Mod Panel</span>
        <span className="tw-flex tw-gap-2">
          {(['audit', 'transfers', 'predictions'] as const).map((t) => (
            <button key={t} className={cn('chip', subTab === t && 'on')} onClick={() => setSubTab(t)}>
              {t === 'audit' ? 'Audit Log' : t === 'transfers' ? 'Transfers' : 'Predictions'}
            </button>
          ))}
          <button className="chip" title="Refresh" onClick={() => void loadModData()}>
            ↻
          </button>
        </span>
      </div>

      {subTab === 'audit' && (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>Every action a channel mod takes shows up here.</p>
          <div className="tw-flex tw-flex-col tw-gap-2">
            {pageItems.map((a) => (
              <div key={a.id} className="tw-flex tw-items-baseline tw-gap-2 tw-py-1" style={{ borderBottom: '1px solid var(--glass-brd)' }}>
                <strong style={{ color: 'var(--primary)' }}>{a.twitch_username}</strong>
                <span style={{ color: 'var(--secondary)', flex: 1 }}>
                  {ACTION_LABELS[a.action] || a.action}
                  {a.detail ? ` — ${a.detail}` : ''}
                </span>
                <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>{timeAgo(a.created_unix || a.created_at)}</span>
              </div>
            ))}
            {pageItems.length === 0 && <div className="tw-text-center tw-py-10" style={{ color: 'var(--muted)' }}>No mod actions yet.</div>}
          </div>
          {totalPages > 1 && (
            <div className="tw-flex tw-justify-center tw-gap-2 tw-mt-4">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={cn('chip', page === i + 1 && 'on')} onClick={() => setActionsPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {subTab === 'transfers' && (
        <>
          <div className="mhead" style={{ marginBottom: 12 }}>
            <span className="t">Pending Transfer Requests</span>
            <span className="ex">{pendingTransfers.length}</span>
          </div>
          <div className="tw-flex tw-flex-col tw-gap-3 tw-mb-8">
            {pendingTransfers.map((p) => (
              <div key={p.id} className="card" style={{ padding: '14px 18px !important' }}>
                <div style={{ marginBottom: 6 }}>
                  <strong style={{ color: 'var(--primary)' }}>{p.sender_username}</strong> →{' '}
                  <strong style={{ color: 'var(--primary)' }}>{p.recipient_username}</strong>, +{p.amount} weight
                </div>
                <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 8 }}>
                  {p.sender_level_id} → {p.recipient_level_id}
                </div>
                <div style={{ color: 'var(--secondary)', fontSize: 12, marginBottom: 10 }}>
                  <div><strong>{p.sender_username}</strong>: {accountAge(p.sender_account?.account_created_at)} · {transferCounts(p.sender_counts)}</div>
                  <div><strong>{p.recipient_username}</strong>: {accountAge(p.recipient_account?.account_created_at)} · {transferCounts(p.recipient_counts)}</div>
                </div>
                <div className="tw-flex tw-gap-2">
                  <button className="btn btn-primary" style={{ flex: 1, padding: '6px' }} onClick={() => void approve(p.id)}>Approve</button>
                  <button className="btn btn-outline" style={{ flex: 1, padding: '6px' }} onClick={() => void reject(p.id)}>Reject</button>
                </div>
              </div>
            ))}
            {pendingTransfers.length === 0 && (
              <div className="tw-text-center tw-py-10" style={{ color: 'var(--muted)' }}>No pending requests.</div>
            )}
          </div>

          <div className="mhead" style={{ marginBottom: 12 }}>
            <span className="t">User Lookup</span>
          </div>
          <div className="tw-flex tw-gap-2 tw-mb-4">
            <input className="inp" placeholder="Twitch username" value={lookupUser} onChange={(e) => setLookupUser(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void runLookup()} style={{ flex: 1 }} />
            <button className="btn btn-outline" onClick={() => void runLookup()}>Search</button>
          </div>
          {lookupResult && (
            <div className="card" style={{ padding: '16px 18px !important' }}>
              <div className="fdisplay" style={{ fontSize: 15 }}>{lookupResult.username}</div>
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 10 }}>
                Twitch account: {accountAge(lookupResult.account?.account_created_at)}
              </div>
              <div className="t" style={{ fontSize: 12, marginBottom: 6 }}>Transfer Requests</div>
              {(lookupResult.transfer_requests || []).length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>No transfer requests sent or received.</div>
              ) : (
                <div className="tw-flex tw-flex-col tw-gap-1 tw-mb-3">
                  {lookupResult.transfer_requests!.map((r) => (
                    <div key={r.id} className="tw-flex tw-justify-between" style={{ fontSize: 12 }}>
                      <span><strong>{r.sender_username}</strong> → <strong>{r.recipient_username}</strong>, +{r.amount}</span>
                      <span style={{ color: 'var(--muted)' }}>{STATUS_LABELS[r.status] || r.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="t" style={{ fontSize: 12, marginBottom: 6 }}>Weight Codes Created</div>
              {(lookupResult.codes_created || []).length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>No codes created.</div>
              ) : (
                <div className="tw-flex tw-flex-col tw-gap-1">
                  {lookupResult.codes_created!.map((c, i) => (
                    <div key={i} className="tw-flex tw-justify-between" style={{ fontSize: 12 }}>
                      <span>+{c.weight_award} from {c.origin_level_id}</span>
                      <span style={{ color: 'var(--muted)' }}>{c.redeemed ? 'redeemed' : 'unredeemed'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {subTab === 'predictions' && (
        <>
          {!pred && (
            <>
              <div className="t" style={{ marginBottom: 10 }}>Start a Prediction</div>
              <input className="inp tw-mb-2" placeholder="Title" value={predTitle} onChange={(e) => setPredTitle(e.target.value)} />
              <textarea className="inp tw-mb-2" rows={4} placeholder="One outcome per line (2-10)" value={predOutcomes} onChange={(e) => setPredOutcomes(e.target.value)} />
              <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mb-4">
                <input className="inp" type="number" min={0} placeholder="Duration in minutes (0 = no auto-lock)" value={predDuration} onChange={(e) => setPredDuration(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
                <button className="btn btn-primary" disabled={modBusy === 'pred-create'} onClick={() => void createPred()}>Start Prediction</button>
                <button className="btn btn-outline" onClick={() => void savePreset()}>Save title + outcomes as a preset</button>
              </div>
              <div className="t" style={{ marginBottom: 8, fontSize: 12 }}>Saved Presets</div>
              {predPresets.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>No saved presets yet.</div>}
              <div className="tw-flex tw-flex-col tw-gap-2">
                {predPresets.map((p) => (
                  <div key={p.id} className="tw-flex tw-items-center tw-gap-2 card" style={{ padding: '8px 12px !important' }}>
                    <span style={{ flex: 1, color: 'var(--primary)' }}>{p.title}</span>
                    <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>({(p.outcomes_text || (p.outcomes || []).join('\n')).split('\n').filter(Boolean).length} outcomes)</span>
                    <button className="chip" onClick={() => applyPreset(p)}>Use</button>
                    <button className="chip" onClick={() => void deletePreset(p.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {pred && (
            <div className="card">
              <div className="tw-flex tw-items-center tw-gap-3 tw-mb-3 tw-flex-wrap">
                <span className="pill i" style={{ borderColor: pred.status === 'open' ? 'var(--success)' : 'var(--muted)', color: pred.status === 'open' ? 'var(--success)' : 'var(--muted)' }}>
                  {pred.status}
                </span>
                <div className="fdisplay" style={{ fontSize: 15 }}>{pred.title}</div>
                {pred.locks_at && pred.status === 'open' && (
                  <span className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>
                    Auto-locks {fmtUntil(pred.locks_at)}
                  </span>
                )}
              </div>
              {shareUrl && (
                <div className="tw-flex tw-gap-2 tw-mb-4">
                  <input readOnly className="inp" value={shareUrl} onFocus={(e) => e.target.select()} style={{ flex: 1 }} />
                  <button className="btn btn-outline" onClick={() => { navigator.clipboard?.writeText(shareUrl); showAlert('Prediction link copied.', 'success') }}>Copy</button>
                </div>
              )}
              <div className="tw-flex tw-flex-col tw-gap-2">
                {pred.outcomes.map((o) => {
                  const pct = totalPool > 0 ? Math.round((o.total_staked / totalPool) * 100) : 0
                  return (
                    <div key={o.id}>
                      <div className="tw-flex tw-justify-between tw-items-center tw-gap-2">
                        <span style={{ color: 'var(--secondary)' }}>
                          {o.label}
                          {pred.status === 'resolved' && pred.winning_outcome_id === o.id ? ' ✓' : ''}
                          <span className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 8 }}>
                            {o.total_staked} orbs · {o.total_staked > 0 ? (totalPool / o.total_staked).toFixed(2) + 'x' : '-'} return
                          </span>
                        </span>
                        <span className="tw-flex tw-items-center tw-gap-2">
                          <span className="fdisplay" style={{ fontSize: 13 }}>{pct}%</span>
                          {pred.status === 'locked' && (
                            <button className="chip" disabled={!!modBusy} onClick={() => void predAction('resolve', o.id)}>Wins</button>
                          )}
                        </span>
                      </div>
                      <div className="tw-h-2 tw-rounded tw-mt-1" style={{ background: 'var(--line)' }}>
                        <div className="tw-h-2 tw-rounded" style={{ width: pct + '%', background: 'var(--primary)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="tw-flex tw-gap-2 tw-mt-4">
                {pred.status === 'open' && (
                  <button className="btn btn-outline" disabled={!!modBusy} onClick={() => void predAction('lock')}>Lock Voting</button>
                )}
                {(pred.status === 'open' || pred.status === 'locked') && (
                  <button className="btn btn-outline" disabled={!!modBusy} style={{ color: 'var(--accent-text)' }} onClick={() => void predAction('cancel')}>Cancel & Refund</button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
