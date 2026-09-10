import { useState } from 'react'
import { useAppState } from '../hooks/useAppState'
import { api } from '../api'
import { DotIcon } from './DotIcon'

const TIERS = [
  { key: 'rate', label: 'Rate', color: '#c8c8c8' },
  { key: 'feature', label: 'Feature', color: '#e8c84a' },
  { key: 'epic', label: 'Epic', color: '#ffb43c' },
  { key: 'legendary', label: 'Legendary', color: '#dc46c8' },
  { key: 'mythic', label: 'Mythic', color: '#5a96ff' },
]

const EVENT_META: Record<string, { icon: string; label: string; pos: boolean }> = {
  resubmit: { icon: '↑', label: 'Resubmission', pos: true },
  promo_code: { icon: '✦', label: 'Secret Code', pos: true },
  transfer_out: { icon: '↓', label: 'Transferred out', pos: false },
  played_reset: { icon: '▶', label: 'Level played', pos: false },
  transfer_request_out: { icon: '↓', label: 'Sent to a friend', pos: false },
  transfer_request_in: { icon: '↑', label: 'Received from a friend', pos: true },
  orbs_redeem: { icon: '●', label: 'Orbs redemption', pos: true }}

function parseVal(v: string | number | undefined): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0
  return Number.isFinite(n) ? n : 0
}

export function ProgressView() {
  const { csrf, progress, loginTwitch, refresh } = useAppState()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pointsOpen, setPointsOpen] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const [trForm, setTrForm] = useState({
    recipient_username: '',
    recipient_level_id: '',
    sender_level_id: '',
    amount: ''})

  const [codeForm, setCodeForm] = useState({
    level_id: '',
    amount: '',
    custom_code: '',
    public: false})

  const [codeResult, setCodeResult] = useState<{
    code: string
    weight_award: number | string
    new_weight: number | string
  } | null>(null)

  if (!csrf?.twitch_logged_in) {
    return (
      <section className="mod s12 tw-text-center tw-py-16">
        <DotIcon name="user" size={48} className="tw-mx-auto tw-mb-4" />
        <div className="ds">Your Progress</div>
        <p className="tw-mt-2" style={{ color: 'var(--secondary)' }}>
          Log in with Twitch to see your level weights and milestones.
        </p>
        <button className="btn btn-primary tw-mt-6" onClick={loginTwitch}>
          Login with Twitch
        </button>
      </section>
    )
  }

  if (!progress) {
    return (
      <section className="mod s12 tw-text-center tw-py-16" style={{ color: 'var(--muted)' }}>
        <DotIcon name="clock" size={32} className="tw-mx-auto tw-mb-3" />
        Loading progress…
      </section>
    )
  }

  const scores = (progress.scores ?? {}) as Record<string, string | number | undefined>
  const myScore = parseVal(scores.total_score)
  const mySends = TIERS.reduce((sum, t) => sum + parseVal(scores[t.key + '_sends']), 0)
  const milestones = progress.milestones || []
  const userMilestone = progress.milestone
  const maxMilestonePts = milestones.length ? Math.max(...milestones.map((m) => parseVal(m.points_required))) : 100
  const progressBarMax = Math.max(myScore, maxMilestonePts)

  const pointsInfo =
    'Every level you submit earns points based on the send tier it gets when played: ' +
    TIERS.map((t) => `${t.label} ${t.key === 'rate' ? 1 : t.key === 'feature' ? 2 : t.key === 'epic' ? 3 : t.key === 'legendary' ? 4 : 5}`).join(', ') +
    '. Your total is the sum across every level you\'ve had played, and that\'s what ranks you on the leaderboard.'

  const onDelete = async (levelId: string) => {
    if (!window.confirm(`Delete your weight entry for ${levelId}? This cannot be undone.`)) return
    setSubmitting('delete-' + levelId)
    await api.deleteMyWeight(levelId)
    setSubmitting(null)
    void refresh()
  }

  const onTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(trForm.amount)
    if (!amount || amount < 0.5) {
      alert('Weight must be at least 0.5.')
      return
    }
    setSubmitting('transfer')
    await api.createTransferRequest({
      recipient_username: trForm.recipient_username,
      recipient_level_id: trForm.recipient_level_id,
      sender_level_id: trForm.sender_level_id,
      amount})
    setTrForm({ recipient_username: '', recipient_level_id: '', sender_level_id: '', amount: '' })
    setSubmitting(null)
    void refresh()
  }

  const onCreateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(codeForm.amount)
    if (!amount || amount < 0.5) {
      alert('Weight must be at least 0.5.')
      return
    }
    setSubmitting('code')
    const res = await api.createWeightCode({
      level_id: codeForm.level_id,
      amount,
      public: codeForm.public,
      custom_code: codeForm.custom_code})
    setSubmitting(null)
    if (res && 'code' in res && res.code) {
      setCodeResult(res as typeof codeResult)
      setCodeForm({ level_id: '', amount: '', custom_code: '', public: false })
    }
    void refresh()
  }

  const onRespond = async (id: number, accept: boolean) => {
    setSubmitting('respond-' + id)
    await api.respondTransferRequest(id, accept)
    setSubmitting(null)
    void refresh()
  }

  const onCancel = async (id: number) => {
    setSubmitting('cancel-' + id)
    await api.cancelTransferRequest(id)
    setSubmitting(null)
    void refresh()
  }

  return (
    <section className="mod s12">
      {/* Score */}
      <div className="card tw-mb-6">
        <div className="tw-flex tw-items-center tw-gap-3 tw-mb-2">
          <div className="t" style={{ }}>Your Score</div>
          <button className="chip" onClick={() => setPointsOpen((s) => !s)}>
            What are points?
          </button>
        </div>
        {pointsOpen && (
          <div className="tw-mb-4 tw-p-3 tw-rounded" style={{ color: 'var(--secondary)', background: 'var(--surface)' }}>
            {pointsInfo}
          </div>
        )}
        <div className="fdisplay" style={{ fontSize: 38, lineHeight: 1, marginBottom: 14 }}>
          {myScore}
        </div>

        <div className="tw-relative tw-h-3 tw-my-5 tw-rounded-lg tw-overflow-hidden" style={{ background: 'var(--line)' }}>
          <div
            className="tw-absolute tw-inset-0 tw-rounded-lg"
            style={{
              width: `${(myScore / progressBarMax) * 100}%`,
              background: 'var(--primary)'}}
          />
          {milestones.map((m) => {
            const pts = parseVal(m.points_required)
            const pct = (pts / progressBarMax) * 100
            return (
              <div
                key={m.id}
                className="tw-absolute"
                style={{ left: `${pct}%`, bottom: 0, height: 20, width: 14, transform: 'translateX(-50%)' }}
              >
                <div
                  className="tw-absolute"
                  style={{
                    bottom: 0,
                    left: '50%',
                    width: 1,
                    height: 10,
                    transform: 'translateX(-50%)',
                    background: myScore >= pts ? 'var(--primary)' : 'var(--muted)'}}
                />
              </div>
            )
          })}
        </div>

        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-4" style={{ marginTop: 16 }}>
          {TIERS.map((t) => {
            const count = parseVal(scores[t.key + '_sends'])
            return (
              <span key={t.key} className="tw-flex tw-items-center tw-gap-2" style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                <span
                  className="tw-rounded-full"
                  style={{
                    width: 12,
                    height: 12,
                    background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.75), ${t.color} 72%)`}}
                />
                <span className="mono">{count} {t.label}</span>
              </span>
            )
          })}
          <span className="tw-ml-auto" style={{ color: 'var(--muted)' }}>
            {mySends} total sends
          </span>
        </div>
      </div>

      {/* Active milestone */}
      {userMilestone && (
        <div className="card tw-mb-6">
          <div className="t" style={{ }}>Active Milestone</div>
          <div className="fdisplay" style={{ fontSize: 16, margin: '6px 0' }}>
            ★ {userMilestone.points_required} pts{userMilestone.label ? ` · “${userMilestone.label}”` : ''}
          </div>
          <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-2">
            {[
              userMilestone.request_limit ? `Request limit: ${userMilestone.request_limit}` : null,
              userMilestone.starting_weight_multiplier ? `Starting weight: ${userMilestone.starting_weight_multiplier}×` : null,
              userMilestone.resubmit_multiplier ? `Resubmit ×: ${userMilestone.resubmit_multiplier}` : null,
              userMilestone.bypass_queue_limit ? 'Bypass queue limit' : null,
              userMilestone.free_weight_amount && userMilestone.free_weight_cooldown_days
                ? `Free weight: +${userMilestone.free_weight_amount} every ${userMilestone.free_weight_cooldown_days}d`
                : null,
            ]
              .filter((p): p is string => typeof p === 'string')
              .map((p) => (
                <span key={p} className="chip" style={{ }}>
                  {p}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Weights */}
      <div className="mhead">
        <span className="t">Your Level Weights</span>
        <span className="ex">{(progress.weights?.length ?? 0)} tracked</span>
      </div>

      {(progress.weights || []).length === 0 && (
        <div className="tw-text-center tw-py-12" style={{ color: 'var(--muted)' }}>
          No weight history yet. Submit a level to get started!
        </div>
      )}

      <div className="tw-space-y-2 tw-mb-6">
        {(progress.weights || []).map((w) => {
          const isExpanded = expanded === w.level_id
          const isLevelless = w.level_id.startsWith('wl_')
          return (
            <div
              key={w.level_id}
              className="progress-weight tw-overflow-hidden"
              style={{ border: '1px solid var(--glass-brd)', borderRadius: 'var(--r-md)' }}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : w.level_id)}
                className="tw-w-full tw-text-left tw-p-3 tw-flex tw-items-center tw-gap-3"
                style={{ background: 'transparent', border: 'none', color: 'inherit' }}
              >
                <div className="tw-flex-1 tw-min-w-0">
                  <div className="fdisplay" style={{ fontSize: 16, color: 'var(--primary)' }}>
                    {isLevelless ? 'No Level' : w.level_id}
                  </div>
                  {isLevelless && (
                    <div className="mono" style={{ color: 'var(--muted)', marginTop: 2 }}>
                      {w.level_id}
                    </div>
                  )}
                  <div className="mono" style={{ color: 'var(--secondary)'}}>@{w.twitch_username}</div>
                </div>
                <span className="chip" style={{ }}>Weight: {w.weight}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    void onDelete(w.level_id)
                  }}
                  disabled={submitting === 'delete-' + w.level_id}
                  className="btn btn-sm"
                  style={{ padding: '2px 8px' }}
                >
                  ✕
                </button>
                <span style={{ color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="tw-p-3 tw-pt-0" style={{ borderTop: '1px solid var(--glass-brd)' }}>
                  {(w.history?.length ?? 0) === 0 ? (
                    <div style={{ color: 'var(--muted)', padding: '8px 0' }}>
                      No history recorded yet.
                    </div>
                  ) : (
                    <div className="tw-space-y-1">
                      {w.history!.map((h, i) => {
                        const meta = (h.event_type && EVENT_META[h.event_type]) || { icon: '?', label: h.reason || h.event_type || '', pos: true }
                        const dv = parseVal(h.delta)
                        const deltaStr = h.event_type === 'played_reset' ? (dv < 0 ? String(dv) : '0') : meta.pos && dv >= 0 ? `+${dv}` : String(dv)
                        const detail = (h.event_type === 'promo_code' || h.event_type === 'orbs_redeem') && h.detail ? `: ${h.detail}` : ''
                        const dateStr = h.created_at ? new Date(h.created_at + (h.created_at.endsWith('Z') ? '' : ' UTC')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
                        return (
                          <div key={i} className="tw-flex tw-items-center tw-gap-2" style={{ color: 'var(--secondary)' }}>
                            <span style={{ color: dv < 0 ? 'var(--error)' : 'var(--success)', width: 14, textAlign: 'center' }}>{meta.icon}</span>
                            <span>{meta.label}{detail}</span>
                            <span className="tw-ml-auto" style={{ color: 'var(--muted)' }}>{dateStr}</span>
                            <span style={{ color: dv < 0 ? 'var(--error)' : 'var(--success)', fontWeight: 700 }}>{deltaStr}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Incoming transfer requests */}
      {(progress.transfer_requests_incoming?.length ?? 0) > 0 && (
        <div className="card tw-mb-6" style={{ borderColor: 'var(--success)' }}>
          <div className="t" style={{ }}>Incoming Weight Transfers</div>
          <div className="tw-space-y-2 tw-mt-2">
            {progress.transfer_requests_incoming!.map((r) => (
              <div key={r.id} className="tw-p-2 tw-rounded" style={{ background: 'var(--surface)' }}>
                <div style={{ color: 'var(--primary)' }}>
                  <strong>{r.sender_username}</strong> wants to send you <strong style={{ color: 'var(--success)' }}>+{r.amount}</strong> weight
                </div>
                <div className="mono" style={{ color: 'var(--muted)' }}>
                  {r.sender_level_id} → your level {r.recipient_level_id}
                </div>
                <div className="tw-flex tw-gap-2 tw-mt-2">
                  <button onClick={() => void onRespond(r.id, true)} disabled={submitting === 'respond-' + r.id} className="btn btn-primary" style={{ }}>
                    Accept
                  </button>
                  <button onClick={() => void onRespond(r.id, false)} disabled={submitting === 'respond-' + r.id} className="btn" style={{ }}>
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing transfer requests */}
      {(progress.transfer_requests_outgoing?.length ?? 0) > 0 && (
        <div className="card tw-mb-6">
          <div className="t" style={{ }}>Your Outgoing Requests</div>
          <div className="tw-space-y-2 tw-mt-2">
            {progress.transfer_requests_outgoing!.map((r) => (
              <div key={r.id} className="tw-flex tw-items-center tw-justify-between tw-p-2 tw-rounded" style={{ background: 'var(--surface)' }}>
                <div>
                  <div style={{ color: 'var(--primary)' }}>
                    +{r.amount} to <strong>{r.recipient_username}</strong>
                  </div>
                  <div className="mono" style={{ color: 'var(--muted)' }}>{r.status}</div>
                </div>
                <button onClick={() => void onCancel(r.id)} disabled={submitting === 'cancel-' + r.id} className="btn" style={{ }}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Weight Transfer */}
      <form onSubmit={onTransfer} className="card tw-mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="t" style={{ }}>Request Weight Transfer</div>
        <p style={{ color: 'var(--secondary)', marginBottom: 4 }}>
          Send weight to a specific friend. A mod reviews it first, then your friend accepts or denies it.
        </p>
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <input
            className="inp"
            placeholder="Friend's Twitch username"
            value={trForm.recipient_username}
            onChange={(e) => setTrForm((s) => ({ ...s, recipient_username: e.target.value }))}
            style={{ flex: 1, minWidth: 140 }}
          />
          <input
            className="inp"
            placeholder="Friend's level ID"
            value={trForm.recipient_level_id}
            onChange={(e) => setTrForm((s) => ({ ...s, recipient_level_id: e.target.value }))}
            style={{ flex: 1, minWidth: 120 }}
          />
        </div>
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <input
            className="inp"
            placeholder="Your level ID"
            value={trForm.sender_level_id}
            onChange={(e) => setTrForm((s) => ({ ...s, sender_level_id: e.target.value }))}
            style={{ flex: 2, minWidth: 120 }}
          />
          <input
            className="inp"
            type="number"
            min="0.5"
            step="0.5"
            placeholder="Weight"
            value={trForm.amount}
            onChange={(e) => setTrForm((s) => ({ ...s, amount: e.target.value }))}
            style={{ flex: 1, minWidth: 80 }}
          />
          <button type="submit" disabled={submitting === 'transfer'} className="btn btn-primary" style={{ flex: '0 0 auto' }}>
            Send Request
          </button>
        </div>
      </form>

      {/* Create Weight Code */}
      <form onSubmit={onCreateCode} className="card tw-mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="t" style={{ }}>Create Weight Code</span>
          <button type="button" className="chip" onClick={() => setPointsOpen((s) => !s)}>
            What is this?
          </button>
        </div>
        {pointsOpen && (
          <div className="tw-p-2 tw-rounded" style={{ color: 'var(--secondary)', background: 'var(--surface)' }}>
            Move weight off any level from your progress list into a one-time code redeemable on any level. Codes are private to you by default — subscribers can make a code public or give it custom text.
          </div>
        )}
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <input
            className="inp"
            placeholder="From level ID"
            value={codeForm.level_id}
            onChange={(e) => setCodeForm((s) => ({ ...s, level_id: e.target.value }))}
            style={{ flex: 2, minWidth: 120 }}
          />
          <input
            className="inp"
            type="number"
            min="0.5"
            step="0.5"
            placeholder="Weight"
            value={codeForm.amount}
            onChange={(e) => setCodeForm((s) => ({ ...s, amount: e.target.value }))}
            style={{ flex: 1, minWidth: 80 }}
          />
          <input
            className="inp"
            placeholder="Custom code (optional)"
            value={codeForm.custom_code}
            onChange={(e) => setCodeForm((s) => ({ ...s, custom_code: e.target.value }))}
            style={{ flex: 1, minWidth: 120 }}
          />
          <button type="submit" disabled={submitting === 'code'} className="btn btn-primary" style={{ flex: '0 0 auto' }}>
            Create Code
          </button>
        </div>
        {codeResult && (
          <div className="tw-p-2 tw-rounded" style={{ background: 'var(--raised)', border: '1px solid var(--line-2)' }}>
            <div className="fdisplay" style={{ fontSize: 14 }}>{codeResult.code}</div>
            <div style={{ color: 'var(--secondary)' }}>
              +{codeResult.weight_award} weight · now {codeResult.new_weight}
            </div>
          </div>
        )}
      </form>
    </section>
  )
}
