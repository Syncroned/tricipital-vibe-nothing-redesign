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

function Router() {
  const { activeTab, loading, error } = useAppState()

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center" style={{ color: 'var(--muted)' }}>
        <DotIcon name="clock" size={32} className="tw-mr-3" />
        Loading queue…
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
      {activeTab === 'request' && <RequestForm />}
      {activeTab === 'history' && <HistoryView />}
      {activeTab === 'queue' && <QueueView />}
      {activeTab === 'leaderboard' && <LeaderboardView />}
      {activeTab === 'progress' && <ProgressView />}
      {activeTab === 'mod' && <ModView />}
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
