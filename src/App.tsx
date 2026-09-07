import { useEffect, useState } from 'react'
import { AppProvider, useAppState } from './hooks/useAppState'
import { ShaderBackground } from './components/ShaderBackground'
import { Nav } from './components/Nav'
import { Alert } from './components/Alert'
import { RequestForm } from './components/RequestForm'
import { HistoryView } from './components/HistoryView'
import { QueueView } from './components/QueueView'
import { LeaderboardView } from './components/LeaderboardView'
import { ProgressView } from './components/ProgressView'
import { ModView } from './components/ModView'
import { DotIcon } from './components/DotIcon'

function renderTab(tab: string) {
  switch (tab) {
    case 'request': return <RequestForm />
    case 'history': return <HistoryView />
    case 'queue': return <QueueView />
    case 'leaderboard': return <LeaderboardView />
    case 'progress': return <ProgressView />
    case 'mod': return <ModView />
    default: return null
  }
}

function Router() {
  const { activeTab, loading, error } = useAppState()
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

  return (
    <main className="tr-main">
      <Nav />
      <div className={`tr-view ${exiting ? 'tr-view-exit' : 'tr-view-enter'}`}>
        {renderTab(currentTab)}
      </div>
      <Alert />
    </main>
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
