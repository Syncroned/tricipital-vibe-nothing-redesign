import { useEffect, useState } from 'react'
import { AppProvider, useAppState } from './hooks/useAppState'
import { ShaderBackground } from './components/ShaderBackground'
import { Rail, Topbar } from './components/Nav'
import { Alert } from './components/Alert'
import { RequestForm } from './components/RequestForm'
import { HistoryView } from './components/HistoryView'
import { QueueView } from './components/QueueView'
import { LeaderboardView } from './components/LeaderboardView'
import { ProgressView } from './components/ProgressView'
import { ModView } from './components/ModView'
import { AdminView } from './components/AdminView'
import { OrbsView } from './components/OrbsView'
import { PredictView } from './components/PredictView'
import { DotIcon } from './components/DotIcon'

function renderTab(tab: string) {
  switch (tab) {
    case 'request': return <RequestForm />
    case 'history': return <HistoryView />
    case 'queue': return <QueueView />
    case 'leaderboard': return <LeaderboardView />
    case 'progress': return <ProgressView />
    case 'mod': return <ModView />
    case 'admin': return <AdminView />
    case 'orbs': return <OrbsView />
    default: return null
  }
}

function Router() {
  const { activeTab, setActiveTab, loading, error, sendsShown, queueUnlocked, isExtensionMode, predictSlug } = useAppState()
  const [currentTab, setCurrentTab] = useState(activeTab)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (activeTab === currentTab) return
    setExiting(true)
    const id = setTimeout(() => {
      setCurrentTab(activeTab)
      setExiting(false)
    }, 180)
    return () => clearTimeout(id)
  }, [activeTab, currentTab])

  // Tabs hidden on the live site bounce back to the form
  useEffect(() => {
    if (!sendsShown && activeTab === 'leaderboard') setActiveTab('request')
    if (!queueUnlocked && activeTab === 'queue') setActiveTab('request')
  }, [sendsShown, queueUnlocked, activeTab, setActiveTab])

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tr-loading" style={{ color: 'var(--muted)' }}>
        <DotIcon name="clock" size={32} className="tw-mr-3" />
        <span>Loading queue…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center" style={{ color: 'var(--error)' }}>
        {error}
      </div>
    )
  }

  if (predictSlug) {
    return (
      <>
        <PredictView slug={predictSlug} />
        <Alert />
      </>
    )
  }

  // Twitch extension panels only show the mod screen
  if (isExtensionMode) {
    return (
      <main className="tr-main">
        <div className="tr-view tr-view-enter">
          <ModView />
        </div>
        <Alert />
      </main>
    )
  }

  return (
    <div className="tr-shell">
      <Rail />
      <main className="tr-main">
        <Topbar />
        <div className={`tr-view ${exiting ? 'tr-view-exit' : 'tr-view-enter'}`}>
          {renderTab(currentTab)}
        </div>
        <Alert />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <>
      <ShaderBackground />
      <AppProvider>
        <Router />
      </AppProvider>
    </>
  )
}
