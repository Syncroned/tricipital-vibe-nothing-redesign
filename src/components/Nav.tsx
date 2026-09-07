import { useState } from 'react'
import { useAppState } from '../hooks/useAppState'
import { Switch } from './Switch'
import triLogo from '../assets/tri_logo.svg?inline'

const tabs = [
  { key: 'request', label: 'Request' },
  { key: 'history', label: 'History' },
  { key: 'queue', label: 'Queue' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'progress', label: 'Progress' },
  { key: 'mod', label: 'Mod' },
]

export function Nav() {
  const { activeTab, setActiveTab, csrf, loginTwitch, logoutTwitch } = useAppState()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <header className="tr-nav">
      <div className="tr-header">
        <div
          className="fdisplay tr-brand"
          style={{ fontSize: 28, letterSpacing: '0.04em', lineHeight: 1, color: 'var(--display)' }}
        >
          <img className="tr-logo" src={triLogo} alt="" aria-hidden="true" />
          TRICIPITAL
        </div>

        <div className="tr-actions">
          {csrf?.orbs_enabled && (
            <span className="tr-action">{csrf.orbs_balance} orbs</span>
          )}

          {csrf?.twitch_logged_in ? (
            <>
              <span className="tr-action" title={csrf.twitch_username}>
                <span
                  style={{
                    display: 'inline-block',
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'middle',
                  }}
                >
                  {csrf.twitch_username}
                </span>
                {csrf.is_sub && <span title="Subscriber">★</span>}
                {csrf.is_mod && <span title="Moderator">🛡</span>}
              </span>
              <button className="tr-action" onClick={() => void logoutTwitch()}>
                Log out
              </button>
            </>
          ) : (
            <button className="tr-action" onClick={loginTwitch}>
              Login with Twitch
            </button>
          )}

          <span className="tr-action">
            <Switch
              checked={theme === 'dark'}
              onChange={toggleTheme}
              title="Toggle dark mode"
            />
          </span>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={activeTab === t.key ? 'on' : ''}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  )
}
