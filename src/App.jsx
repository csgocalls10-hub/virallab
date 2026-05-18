import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Analyze from './pages/Analyze'
import History from './pages/History'
import Compare from './pages/Compare'
import ClipEditor from './pages/ClipEditor'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Analyze />} />
          <Route path="/clip" element={<ClipEditor />} />
          <Route path="/history" element={<History />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
