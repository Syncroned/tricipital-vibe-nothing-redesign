import { useEffect, useState } from 'react'
import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'
import { api } from '../api'
import { cn, difficultyColor, typeColor, timeAgo } from '../utils'
import type { QueueEntry, FavoriteEntry } from '../types'

const SEND_TIERS = [
  { key: 'none', label: 'No Send', color: '#e0654a' },
  { key: 'rate', label: 'Rate', color: '#c8c8c8' },
  { key: 'feature', label: 'Feature', color: '#e8c84a' },
  { key: 'epic', label: 'Epic', color: '#ffb43c' },
  { key: 'legendary', label: 'Legendary', color: '#dc46c8' },
  { key: 'mythic', label: 'Mythic', color: '#5a96ff' },
]

export function AdminView() {
  const { csrf, status, refresh, loadModData, adminRequests, showAlert, adminSub: subTab, setAdminSub: setSubTab } = useAppState()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [admin, setAdmin] = useState(csrf?.is_admin ?? false)
  const [adminSort, setAdminSort] = useState<'newest' | 'oldest' | 'weight'>('oldest')
  const [sendMenuId, setSendMenuId] = useState<number | null>(null)
  const [favPromptId, setFavPromptId] = useState<number | null>(null)
  const [favRating, setFavRating] = useState('5')
  const [favNote, setFavNote] = useState('')
  const [spotlightId, setSpotlightId] = useState<number | null>(null)
  const [modBusy, setModBusy] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([])
  const [favoritesLoaded, setFavoritesLoaded] = useState(false)
  const [favStreamsEver, setFavStreamsEver] = useState(false)
  const [settings, setSettings] = useState({
    queue_limit: '',
    min_weight: '',
    period_award_limit: '',
    period_weight_reward: '',
    reset_announcement: '',
    ban_token: '',
    mod_token: '',
  })

  useEffect(() => {
    if (admin) void loadModData()
  }, [admin, loadModData])

  useEffect(() => {
    if (status) {
      setSettings((s) => ({
        ...s,
        queue_limit: s.queue_limit || String(status.queue_limit ?? ''),
        min_weight: s.min_weight || String(status.min_weight ?? ''),
        period_award_limit: s.period_award_limit || String(status.award_pool_limit ?? ''),
        period_weight_reward: s.period_weight_reward || String(status.period_weight_reward ?? ''),
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const unlock = async () => {
    setBusy(true)
    const res = (await api.adminLogin(password)) as { error?: string; is_admin?: boolean }
    if (res.error) showAlert(res.error, 'error')
    else {
      setAdmin(true)
      try {
        sessionStorage.setItem('gotoAdmin', '1')
      } catch { /* ignore */ }
    }
    setBusy(false)
  }

  if (!admin) {
    return (
      <section className="mod s12 tw-mx-auto tw-text-center" style={{ maxWidth: 360 }}>
        <DotIcon name="lock" size={48} className="tw-mx-auto tw-mb-4" />
        <div className="ds">Authorized Access Only</div>
        <p className="tw-mt-2" style={{ color: 'var(--secondary)' }}>
          Enter admin password to manage requests
        </p>
        <div className="field tw-text-left tw-mt-6">
          <label className="label">Admin Password</label>
          <input
            type="password"
            className="inp"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void unlock()}
          />
        </div>
        <button className="btn btn-primary tw-mt-2" disabled={!password || busy} onClick={() => void unlock()}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </section>
    )
  }

  const sortedRequests = [...adminRequests].sort((a, b) => {
    if (adminSort === 'weight') return (Number(b.weight) || 0) - (Number(a.weight) || 0)
    const ta = a.submitted_unix || (a.submitted_at ? new Date(a.submitted_at).getTime() / 1000 : a.id)
    const tb = b.submitted_unix || (b.submitted_at ? new Date(b.submitted_at).getTime() / 1000 : b.id)
    return adminSort === 'newest' ? tb - ta : ta - tb
  })

  const markPlayed = async (id: number, sendType: string, favorite = false, rating = 0, note = '') => {
    setModBusy('played-' + id)
    const res = await api.markPlayed(id, sendType, favorite, rating, note)
    setModBusy(null)
    setSendMenuId(null)
    setFavPromptId(null)
    if (res.error) showAlert(res.error, 'error')
    else {
      const tierLabel = SEND_TIERS.find((t) => t.key === sendType)?.label || ''
      showAlert(`Marked played${favorite ? ' · favorited' : sendType !== 'none' ? ` · ${tierLabel} send recorded` : ''}.`, 'success')
    }
    setFavRating('5')
    setFavNote('')
    void loadModData()
  }

  const deleteReq = async (id: number) => {
    if (!window.confirm('Delete this request from the queue? This cannot be undone.')) return
    await api.deleteRequest(id)
    if (spotlightId === id) setSpotlightId(null)
    void loadModData()
  }

  const pickRandom = async (weighted: boolean) => {
    const d = await api.getAdminRequests(adminSort)
    const reqs = d && !('error' in d) ? d.requests || d.queue || [] : []
    if (!reqs.length) return showAlert('No requests in the queue!', 'error')
    let picked: QueueEntry
    if (weighted) {
      const total = reqs.reduce((s, r) => s + (Number(r.weight) || 1), 0)
      let roll = Math.random() * total
      picked = reqs[reqs.length - 1]
      for (const r of reqs) {
        roll -= Number(r.weight) || 1
        if (roll <= 0) {
          picked = r
          break
        }
      }
    } else {
      picked = reqs[Math.floor(Math.random() * reqs.length)]
    }
    await api.setSpotlight(picked.id)
    setSpotlightId(picked.id)
    showAlert(`Spotlighted ${picked.level_id}.`, 'success')
    void loadModData()
  }

  const notifyPlaying = async (id: number) => {
    const res = await api.notifyPlaying(id)
    if (res && res.notified) showAlert('Notification sent!', 'success')
    else showAlert("This viewer doesn't have Discord notifications turned on, nothing was sent.", 'error')
  }

  const post = async (key: string, fn: () => Promise<{ success?: boolean; error?: string }>, okMsg: string) => {
    setModBusy(key)
    const res = await fn()
    setModBusy(null)
    if (res && res.success) showAlert(okMsg, 'success')
    else showAlert(res?.error || 'Failed.', 'error')
    void refresh()
  }

  const loadFavorites = async (force = false) => {
    if (favoritesLoaded && !force) return
    const data = await api.getFavorites()
    if (data && !data.error) {
      setFavorites(data.favorites || [])
      setFavStreamsEver(!!data.streams_ever)
      setFavoritesLoaded(true)
    }
  }

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">Admin Panel</span>
        <span className="tw-flex tw-gap-2">
          {(['queue', 'settings', 'favorites'] as const).map((t) => (
            <button
              key={t}
              className={cn('chip', subTab === t && 'on')}
              onClick={() => {
                setSubTab(t)
                if (t === 'favorites') void loadFavorites()
              }}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button className="chip" title="Refresh" onClick={() => void loadModData()}>
            ↻
          </button>
        </span>
      </div>

      {subTab === 'queue' && (
        <>
          <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mb-4">
            {(['newest', 'oldest', 'weight'] as const).map((s) => (
              <button key={s} className={cn('chip', adminSort === s && 'on')} onClick={() => setAdminSort(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
            <span className="tw-flex-1" />
            <button className="chip" onClick={() => void pickRandom(true)}>Pick Weighted</button>
            <button className="chip" onClick={() => void pickRandom(false)}>Pick Random</button>
            <button
              className="chip"
              onClick={() => void post('lock', () => api.toggleRequests(!status?.locked), status?.locked ? 'Requests are now open.' : 'Requests are now locked.')}
            >
              {status?.locked ? 'Unlock Requests' : 'Lock Requests'}
            </button>
            <button className="chip" onClick={() => void post('period', () => api.resetPeriod(), 'Request period reset. Everyone can earn +1 again.')}>
              Reset Period
            </button>
            <button
              className="chip"
              onClick={async () => {
                if (!window.confirm('Remove ALL requests? This cannot be undone.')) return
                const res = await api.clearQueue()
                if (res && res.success) {
                  setSpotlightId(null)
                  showAlert('Queue cleared.', 'success')
                  void loadModData()
                } else showAlert(res?.error || 'Failed to clear queue.', 'error')
              }}
            >
              Clear All
            </button>
          </div>

          <div className="mono tw-text-center" style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>
            {adminRequests.length} request{adminRequests.length !== 1 ? 's' : ''} in queue
          </div>

          <div className="tw-flex tw-flex-col tw-gap-2">
            {sortedRequests.map((r) => {
              const isSpotlight = r.is_spotlighted || spotlightId === r.id
              return (
                <div key={r.id} className="card" style={{ padding: '14px 18px !important', borderColor: isSpotlight ? 'var(--primary)' : undefined }}>
                  <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
                    <span className="fdisplay" style={{ fontSize: 15 }}>{r.level_id.startsWith('wl_') ? 'No Level' : r.level_id}</span>
                    {r.difficulty && <span className="pill i" style={{ borderColor: difficultyColor(r.difficulty), color: difficultyColor(r.difficulty) }}>{r.difficulty}</span>}
                    {r.level_type && <span className="pill i" style={{ borderColor: typeColor(r.level_type), color: typeColor(r.level_type) }}>{r.level_type}</span>}
                    <span className="pill i">Weight: {r.weight}</span>
                    {isSpotlight && <span className="pill i" style={{ borderColor: 'var(--accent-text)', color: 'var(--accent-text)' }}>Spotlight</span>}
                  </div>
                  <div style={{ color: 'var(--secondary)', fontSize: 13, marginTop: 6 }}>
                    by <strong style={{ color: 'var(--primary)' }}>{r.creator}</strong> · @{r.twitch_username}
                    {r.submitted_at ? ` · ${timeAgo(r.submitted_at)}` : ''}
                  </div>
                  {r.notes && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{r.notes}</div>}
                  <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-3">
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSendMenuId(sendMenuId === r.id ? null : r.id)}>
                      Played ▾
                    </button>
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setFavPromptId(r.id); setSendMenuId(null) }}>
                      Favorite
                    </button>
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => void api.setSpotlight(r.id).then(() => { setSpotlightId(r.id); void loadModData() })}>
                      Spotlight
                    </button>
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => void notifyPlaying(r.id)}>
                      Notify
                    </button>
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(r.level_id); showAlert(`Level ID ${r.level_id} copied.`, 'success') }}>
                      Copy ID
                    </button>
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--accent-text)' }} onClick={() => void deleteReq(r.id)}>
                      Delete
                    </button>
                  </div>
                  {sendMenuId === r.id && (
                    <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-3">
                      {SEND_TIERS.map((t) => (
                        <button
                          key={t.key}
                          className="chip"
                          disabled={modBusy === 'played-' + r.id}
                          style={{ borderColor: t.color, color: t.color }}
                          onClick={() => void markPlayed(r.id, t.key)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {favPromptId === r.id && (
                    <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-3 tw-items-center">
                      <select className="inp" style={{ width: 90 }} value={favRating} onChange={(e) => setFavRating(e.target.value)}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n}>{n}/10</option>
                        ))}
                      </select>
                      <input className="inp" style={{ flex: 1, minWidth: 160 }} placeholder="Note (optional)" value={favNote} onChange={(e) => setFavNote(e.target.value)} />
                      <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => void markPlayed(r.id, 'none', true, parseInt(favRating) || 0, favNote.trim())}>
                        Save Favorite
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {sortedRequests.length === 0 && (
              <div className="tw-text-center tw-py-10" style={{ color: 'var(--muted)' }}>Queue is empty.</div>
            )}
          </div>
        </>
      )}

      {subTab === 'settings' && (
        <div className="tw-flex tw-flex-col tw-gap-4">
          <div className="card" style={{ padding: '16px 18px !important' }}>
            <div className="t" style={{ marginBottom: 10 }}>Requests</div>
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              <button className="chip" onClick={() => void post('lock', () => api.toggleRequests(!status?.locked), status?.locked ? 'Requests are now open.' : 'Requests are now locked.')}>
                {status?.locked ? 'Unlock Requests' : 'Lock Requests'}
              </button>
              <button className="chip" onClick={() => void post('botcheck', () => api.toggleBotcheck(!status?.botcheck_enabled), 'Botcheck setting saved.')}>
                Botcheck: {status?.botcheck_enabled ? 'On' : 'Off'}
              </button>
              <button className="chip" onClick={() => void post('nonmod', () => api.toggleNonMod(!status?.non_mod_mode), 'Non-mod mode setting saved.')}>
                Non-Mod Mode: {status?.non_mod_mode ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px !important' }}>
            <div className="t" style={{ marginBottom: 10 }}>Queue & Weight</div>
            <div className="tw-flex tw-flex-col tw-gap-3">
              <div className="tw-flex tw-gap-2 tw-items-center">
                <span className="mono" style={{ fontSize: 12, color: 'var(--secondary)', width: 180 }}>Queue limit</span>
                <input className="inp" type="number" min={0} value={settings.queue_limit} onChange={(e) => setSettings((s) => ({ ...s, queue_limit: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={() => void post('qlimit', () => api.setQueueLimit(parseInt(settings.queue_limit) || 0), 'Queue limit saved.')}>Save</button>
              </div>
              <div className="tw-flex tw-gap-2 tw-items-center">
                <span className="mono" style={{ fontSize: 12, color: 'var(--secondary)', width: 180 }}>Minimum weight</span>
                <input className="inp" type="number" min={0} step="0.5" value={settings.min_weight} onChange={(e) => setSettings((s) => ({ ...s, min_weight: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={() => void post('mweight', () => api.setMinWeight(parseFloat(settings.min_weight) || 0), 'Minimum weight saved.')}>Save</button>
              </div>
              <div className="tw-flex tw-gap-2 tw-items-center">
                <span className="mono" style={{ fontSize: 12, color: 'var(--secondary)', width: 180 }}>Period award pool limit</span>
                <input className="inp" type="number" min={0} value={settings.period_award_limit} onChange={(e) => setSettings((s) => ({ ...s, period_award_limit: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={() => void post('aplimit', () => api.setPeriodAwardLimit(parseInt(settings.period_award_limit) || 0), 'Award pool limit saved.')}>Save</button>
              </div>
              <div className="tw-flex tw-gap-2 tw-items-center">
                <span className="mono" style={{ fontSize: 12, color: 'var(--secondary)', width: 180 }}>Period weight reward</span>
                <input className="inp" type="number" min={0} step="0.5" value={settings.period_weight_reward} onChange={(e) => setSettings((s) => ({ ...s, period_weight_reward: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={() => void post('pwreward', () => api.setPeriodWeightReward(parseFloat(settings.period_weight_reward) || 0), 'Period reward saved.')}>Save</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px !important' }}>
            <div className="t" style={{ marginBottom: 10 }}>Period</div>
            <div className="tw-flex tw-flex-col tw-gap-3">
              <div className="tw-flex tw-gap-2 tw-items-center">
                <input className="inp" placeholder="Announcement shown after a period reset (optional)" value={settings.reset_announcement} onChange={(e) => setSettings((s) => ({ ...s, reset_announcement: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={() => void post('announce', () => api.setPeriodResetAnnouncement(settings.reset_announcement), 'Announcement saved.')}>Save</button>
              </div>
              <div className="tw-flex tw-gap-2">
                <button className="btn btn-outline" onClick={() => void post('period', () => api.resetPeriod(), 'Request period reset.')}>Reset Period</button>
                <button
                  className="btn btn-outline"
                  style={{ color: 'var(--accent-text)' }}
                  onClick={async () => {
                    if (!window.confirm('Remove ALL requests? This cannot be undone.')) return
                    const res = await api.clearQueue()
                    if (res && res.success) showAlert('Queue cleared.', 'success')
                    else showAlert(res?.error || 'Failed to clear queue.', 'error')
                    void loadModData()
                  }}
                >
                  Clear Queue
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px !important' }}>
            <div className="t" style={{ marginBottom: 10 }}>Ban Sync Token</div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>
              Once saved, this token is never shown again on the admin panel.
            </p>
            <div className="tw-flex tw-gap-2">
              <input className="inp" type="password" placeholder="Twitch token with moderation:read scope" value={settings.ban_token} onChange={(e) => setSettings((s) => ({ ...s, ban_token: e.target.value }))} style={{ flex: 1 }} />
              <button className="btn btn-outline" onClick={() => void post('ban', () => api.saveBanToken(settings.ban_token), 'Ban token saved.')}>Save</button>
              <button className="btn btn-outline" onClick={() => void post('syncbans', () => api.syncBans(), 'Bans synced.')}>Sync Bans</button>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px !important' }}>
            <div className="t" style={{ marginBottom: 10 }}>Mod Sync Token</div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>
              Once saved, this token is never shown again on the admin panel. No token? Add mods by hand instead.
            </p>
            <div className="tw-flex tw-gap-2">
              <input className="inp" type="password" placeholder="Twitch token with moderation:read scope" value={settings.mod_token} onChange={(e) => setSettings((s) => ({ ...s, mod_token: e.target.value }))} style={{ flex: 1 }} />
              <button className="btn btn-outline" onClick={() => void post('mod', () => api.saveModToken(settings.mod_token), 'Mod token saved.')}>Save</button>
              <button className="btn btn-outline" onClick={() => void post('syncmods', () => api.syncMods(), 'Mods synced.')}>Sync Mods</button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'favorites' && (
        <>
          <div className="mhead" style={{ marginBottom: 12 }}>
            <span className="t">Favorites</span>
            <span className="ex">
              {favorites.length} saved
              {favorites.length > 0 && (
                <button
                  className="chip"
                  style={{ marginLeft: 8 }}
                  onClick={async () => {
                    if (!window.confirm('Remove ALL favorites? This cannot be undone.')) return
                    const res = await api.clearFavorites()
                    if (res && res.success) {
                      setFavorites([])
                      showAlert('Favorites cleared.', 'success')
                    } else showAlert(res?.error || 'Failed to clear favorites.', 'error')
                  }}
                >
                  Clear All
                </button>
              )}
            </span>
          </div>
          {!favoritesLoaded ? (
            <div className="tw-text-center tw-py-10" style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : favorites.length === 0 ? (
            <div className="tw-text-center tw-py-10" style={{ color: 'var(--muted)' }}>
              {favStreamsEver ? 'No favorites saved yet. Mark a request as Favorite from the Queue tab.' : 'No favorites yet.'}
            </div>
          ) : (
            Object.entries(
              favorites.reduce<Record<string, FavoriteEntry[]>>((acc, f) => {
                const key = f.stream_session_id != null ? String(f.stream_session_id) : 'unknown'
                ;(acc[key] = acc[key] || []).push(f)
                return acc
              }, {}),
            ).map(([sessionId, items]) => (
              <div key={sessionId} className="tw-mb-6">
                <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 8 }}>
                  {sessionId === 'unknown' ? 'Older sessions' : `Stream session ${sessionId}`}
                </div>
                <div className="tw-flex tw-flex-col tw-gap-2">
                  {items.map((f) => (
                    <div key={f.id} className="card" style={{ padding: '12px 16px !important' }}>
                      <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
                        <span className="fdisplay" style={{ fontSize: 14 }}>{f.level_id}</span>
                        {f.difficulty && <span className="pill i" style={{ borderColor: difficultyColor(f.difficulty), color: difficultyColor(f.difficulty) }}>{f.difficulty}</span>}
                        {f.level_type && <span className="pill i" style={{ borderColor: typeColor(f.level_type), color: typeColor(f.level_type) }}>{f.level_type}</span>}
                        {f.rating != null && <span className="pill i">{f.rating}/10</span>}
                      </div>
                      <div style={{ color: 'var(--secondary)', fontSize: 13, marginTop: 4 }}>
                        {f.creator ? `by ${f.creator}` : ''}
                        {f.twitch_username ? ` · @${f.twitch_username}` : ''}
                      </div>
                      {f.note && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{f.note}</div>}
                      <div className="tw-flex tw-gap-2 tw-mt-3">
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => {
                            let t = `Level ID: ${f.level_id}\nDifficulty: ${f.difficulty || ''}\nType: ${f.level_type || ''}\nCreator: ${f.creator || ''}`
                            if (f.video_url) t += `\nVideo: <${f.video_url}>`
                            if (f.note) t += `\nComment: ${f.note}`
                            navigator.clipboard?.writeText(t)
                            showAlert('Copied to clipboard.', 'success')
                          }}
                        >
                          Copy
                        </button>
                        {f.video_url && (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => { navigator.clipboard?.writeText(f.video_url!); showAlert('Video link copied.', 'success') }}
                          >
                            Copy Video
                          </button>
                        )}
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: 12, color: 'var(--accent-text)' }}
                          onClick={async () => {
                            if (!window.confirm('Remove this level from your favorites?')) return
                            const res = await api.removeFavorite(f.id)
                            if (res && res.success) setFavorites((s) => s.filter((x) => String(x.id) !== String(f.id)))
                            else showAlert(res?.error || 'Failed to remove.', 'error')
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </section>
  )
}
