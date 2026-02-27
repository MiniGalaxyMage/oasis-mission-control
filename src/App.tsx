import './App.css'
import { useSnapshot } from './hooks/useSnapshot'
import { Header } from './components/Header/Header'
import { Room } from './components/Room/Room'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Footer } from './components/Footer/Footer'

function App() {
  const snapshot = useSnapshot(30000)

  return (
    <div className="app-layout">
      <Header snapshot={snapshot} />
      <div className="main-content">
        <Room agents={snapshot?.agents ?? []} />
        <Sidebar snapshot={snapshot} />
      </div>
      <Footer timestamp={snapshot?.timestamp ?? null} />
    </div>
  )
}

export default App
