import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../hooks/useAppState'
import { api } from '../api'
import { DotIcon } from './DotIcon'
import { cn } from '../utils'
import triLogo from '../assets/tri_logo.svg?inline'

type NavIcon = 'bolt' | 'clock' | 'signal' | 'star' | 'grid' | 'heart' | 'eye' | 'play' | 'gear' | 'chat'
interface NavItem {
  key: string
  label: string
  icon: NavIcon
  locked?: boolean
  onClick: () => void
}

function useNavItems(): { pub: NavItem[]; mod: NavItem[]; admin: NavItem[] } {
  const {
    setActiveTab, setAdminSub, csrf,
    sendsShown, canModerate, queueUnlocked, isAdmin, showAlert,
  } = useAppState()
  const go = (t: string, sub?: 'queue' | 'settings' | 'favorites') => () => {
    if (sub) setAdminSub(sub)
    setActiveTab(t)
  }
  const lockedGo = () => showAlert('Log in with Twitch to see your progress.', 'error')

  const pub: NavItem[] = [
    { key: 'request', label: 'Request', icon: 'bolt', onClick: go('request') },
    { key: 'history', label: 'History', icon: 'clock', onClick: go('history') },
    {
      key: 'progress',
      label: 'Progress',
      icon: 'signal',
      locked: !csrf?.twitch_logged_in,
      onClick: csrf?.twitch_logged_in ? go('progress') : lockedGo,
    },
  ]
  if (sendsShown) pub.push({ key: 'leaderboard', label: 'Leaderboard', icon: 'star', onClick: go('leaderboard') })
  if (queueUnlocked) pub.push({ key: 'queue', label: 'Queue', icon: 'grid', onClick: go('queue') })
  if (csrf?.twitch_logged_in && csrf?.orbs_enabled)
    pub.push({ key: 'orbs', label: 'Orbs', icon: 'heart', onClick: go('orbs') })

  const mod: NavItem[] = canModerate
    ? [{ key: 'mod', label: 'Mod', icon: 'eye', onClick: go('mod') }]
    : []
  const admin: NavItem[] = isAdmin
    ? [
        { key: 'admin-queue', label: 'Queue', icon: 'play', onClick: go('admin', 'queue') },
        { key: 'admin-settings', label: 'Settings', icon: 'gear', onClick: go('admin', 'settings') },
      ]
    : []
  return { pub, mod, admin }
}

const siteName = (() => {
  try {
    const n = (window as { __SITE?: { name?: string } }).__SITE?.name
    return n || 'levelrequest'
  } catch {
    return 'levelrequest'
  }
})()

function useTripleClickAdmin() {
  const { setActiveTab } = useAppState()
  const count = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return () => {
    count.current++
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      count.current = 0
    }, 1000)
    if (count.current >= 3) {
      count.current = 0
      setActiveTab('admin')
    }
  }
}

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    try {
      const t = localStorage.getItem('themeMode')
      if (t === 'light' || t === 'dark') {
        setTheme(t)
        document.documentElement.setAttribute('data-theme', t)
      }
    } catch { /* ignore */ }
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('themeMode', next)
    } catch { /* ignore */ }
  }
  return { theme, toggle }
}

/* ── Left rail — sticky icon nav grouped public / mod / admin ──────────── */
export function Rail() {
  const { activeTab, status, csrf } = useAppState()
  const { pub, mod, admin } = useNavItems()
  const { theme, toggle } = useTheme()
  const onNameClick = useTripleClickAdmin()

  const itemCls = (key: string, locked?: boolean) =>
    cn(
      'tr-rail-item',
      (activeTab === key || (key.startsWith('admin-') && activeTab === 'admin')) && 'on',
      locked && 'locked',
    )

  const renderItem = (n: NavItem) => (
    <button key={n.key} className={itemCls(n.key, n.locked)} title={n.locked ? 'Log in with Twitch' : n.label} onClick={n.onClick}>
      <span className="tr-rail-ind">
        <DotIcon name={n.icon} size={20} />
      </span>
      <span className="tr-rail-label">{n.label}</span>
    </button>
  )

  return (
    <nav className="tr-rail" aria-label="Sections">
      <div className="tr-rail-brand">
        {csrf?.twitch_logged_in && csrf.avatar ? (
          <img className="tr-pfp tr-pfp-lg" src={csrf.avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <img className="tr-logo tr-logo-lg" src={triLogo} alt="" aria-hidden="true" />
        )}
        <span className="tr-rail-name">
          <button onClick={onNameClick}>{siteName}&rsquo;s request form</button>
        </span>
      </div>

      <div className="tr-rail-group">{pub.map(renderItem)}</div>

      {mod.length > 0 && (
        <>
          <div className="tr-rail-div" aria-hidden="true" />
          <div className="tr-rail-group">{mod.map(renderItem)}</div>
        </>
      )}

      {admin.length > 0 && (
        <>
          <div className="tr-rail-div" aria-hidden="true" />
          <span className="tr-rail-head">Admin</span>
          <div className="tr-rail-group">{admin.map(renderItem)}</div>
        </>
      )}

      <button
        className="tr-action tr-rail-theme"
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{ justifyContent: 'center', padding: 0 }}
      >
        <DotIcon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
      </button>

      <div className="tr-rail-status">
        <span className={cn('tr-rail-dot', !status?.locked && 'open')} />
        <span>{status?.locked ? 'Closed' : 'Open'}</span>
      </div>
    </nav>
  )
}

/* ── Topbar — brand (mobile) + page title + account cluster ────────────── */
export function Topbar() {
  const {
    activeTab, adminSub, csrf, history, queue, adminRequests,
    loginTwitch, logoutTwitch, orbsBalance, prefs, setPrefs, showAlert, isAdmin,
    setActiveTab,
  } = useAppState()
  const { theme, toggle } = useTheme()
  const onNameClick = useTripleClickAdmin()
  const [prefsOpen, setPrefsOpen] = useState(false)
  const { pub, mod, admin } = useNavItems()
  const navAll = [...pub, ...mod, ...admin]

  const ws = csrf?.watch_streak
  const streak = ws?.current ?? ws?.streak ?? 0
  const streakAtRisk = !!(ws?.at_risk ?? ws?.missed)
  const twitchUrl = csrf?.twitch_username ? `https://twitch.tv/${csrf.twitch_username}` : '#'

  const viewHead: Record<string, [string, string]> = {
    history: ['Recently played', history?.history?.length ? `The ${history.history.length} most recent levels` : ''],
    queue: ['Request queue', `${queue?.length ?? 0} level${queue?.length === 1 ? '' : 's'} waiting`],
    progress: ['Progress', ''],
    leaderboard: ['Leaderboard', ''],
    orbs: ['Orbs', csrf?.twitch_logged_in ? `${orbsBalance} orbs` : ''],
    mod: ['Moderation', ''],
    admin: !isAdmin
      ? ['Admin', '']
      : adminSub === 'settings'
        ? ['Settings', '']
        : adminSub === 'favorites'
          ? ['Favorites', '']
          : ['Request queue', `${adminRequests.length} level${adminRequests.length === 1 ? '' : 's'} waiting`],
  }
  const head = viewHead[activeTab] || null

  return (
    <>
      <header className="tr-topbar">
        <div className="tr-topbar-brand">
          {csrf?.twitch_logged_in && csrf.avatar ? (
            <img className="tr-pfp" src={csrf.avatar} alt="" referrerPolicy="no-referrer" />
          ) : (
            <img className="tr-logo" src={triLogo} alt="" aria-hidden="true" />
          )}
          <button onClick={onNameClick} className="tr-rail-name" style={{ textAlign: 'left' }}>
            {siteName}&rsquo;s request form
          </button>
        </div>

        <div className="tr-topbar-title">
          {head && <h1 className="tr-page-title">{head[0]}</h1>}
          {head && head[1] && <p className="tr-page-sub">{head[1]}</p>}
        </div>

        <div className="tr-acct">
          <button
            className="tr-action"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ justifyContent: 'center', padding: '0 10px' }}
          >
            <DotIcon name={theme === 'dark' ? 'moon' : 'sun'} size={14} />
          </button>
          {csrf?.twitch_logged_in ? (
            <>
              {(csrf.twitch_is_subscriber ?? csrf.is_sub) && <span className="tr-action" title="Subscriber">★</span>}
              {(csrf.twitch_is_mod ?? csrf.is_mod) && <span className="tr-action" title="Moderator">🛡</span>}
              <a
                className="tr-action"
                href={twitchUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {csrf.twitch_username}
              </a>
              {csrf.orbs_enabled && (
                <button className="tr-action" title="Your Orbs" onClick={() => setActiveTab('orbs')}>
                  {orbsBalance} orbs
                  {streak > 0 && (
                    <span
                      title={streakAtRisk ? 'Streak at risk — you missed the last stream' : `${streak} stream day streak`}
                      style={{ color: streakAtRisk ? 'var(--accent-text)' : undefined }}
                    >
                      🔥{streak}
                    </span>
                  )}
                </button>
              )}
              <button className="tr-action" title="Notification settings" onClick={() => setPrefsOpen(true)} style={{ padding: '0 8px' }}>
                <DotIcon name="gear" size={14} />
              </button>
              <button className="tr-action" onClick={() => void logoutTwitch()}>
                Log out
              </button>
            </>
          ) : (
            <button className="tr-action" onClick={loginTwitch}>
              Login with Twitch
            </button>
          )}
        </div>
      </header>

      {/* Mobile tab pills (rail is hidden under 960px) */}
      <nav className="tr-mnav" aria-label="Sections">
        <div className="tabs tr-tabs">
          {navAll.map((n) => (
            <button key={n.key} className={activeTab === n.key || (n.key.startsWith('admin-') && activeTab === 'admin') ? 'on' : ''} onClick={n.onClick} title={n.label}>
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      {prefsOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center"
          style={{ background: 'rgba(0,0,0,.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPrefsOpen(false)
          }}
        >
          <div className="mod" style={{ width: 400, maxWidth: '92vw' }}>
            <div className="mhead">
              <span className="t">Notification Settings</span>
              <button className="chip" onClick={() => setPrefsOpen(false)}>
                ✕
              </button>
            </div>

            {!prefs ? (
              <p style={{ color: 'var(--muted)' }}>Loading…</p>
            ) : (
              <>
                <div className="tw-flex tw-items-center tw-gap-3 tw-mb-6">
                  <DotIcon name="chat" size={24} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--primary)' }}>Discord</div>
                    <div className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>
                      {prefs.discord_linked ? `@${prefs.discord_username}` : 'Not connected'}
                    </div>
                  </div>
                  {prefs.discord_linked ? (
                    <button
                      className="btn btn-outline"
                      onClick={async () => {
                        const res = await api.discordUnlink()
                        if (res && res.success) setPrefs({ ...prefs, discord_linked: false, discord_username: '', notify_level_played: false, notify_level_active: false })
                        else showAlert(res?.error || 'Failed to disconnect.', 'error')
                      }}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        const res = await api.discordOauthUrl()
                        if (res && res.url) window.location.href = res.url
                        else showAlert(res?.error || 'Failed to connect.', 'error')
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>

                {!prefs.discord_linked && (
                  <p className="tw-mb-4" style={{ color: 'var(--secondary)', fontSize: 13 }}>
                    Join the Discord server so the bot can notify you!
                  </p>
                )}

                <div className="t" style={{ marginBottom: 10 }}>Notify me when…</div>
                {([
                  { key: 'notify_level_played' as const, label: 'My level starts being played' },
                  { key: 'notify_level_active' as const, label: 'My level is done being played' },
                ]).map((row) => (
                  <label key={row.key} className="tw-flex tw-items-center tw-gap-3 tw-mb-3" style={{ cursor: 'pointer' }}>
                    <span className={cn('box', prefs[row.key] && 'on')} style={{ width: 16, height: 16 }}>
                      {prefs[row.key] && (
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12l5 5L20 6" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="tw-sr-only"
                      checked={!!prefs[row.key]}
                      onChange={async (e) => {
                        const v = e.target.checked
                        const res = await api.setUserPrefs({ [row.key]: v })
                        if (res && res.success) setPrefs({ ...prefs, [row.key]: v })
                        else showAlert(res?.error || 'Failed to save.', 'error')
                      }}
                    />
                    <span style={{ color: 'var(--secondary)' }}>{row.label}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
