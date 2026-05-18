import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TreeView from './components/TreeView'
import PersonPage from './components/PersonPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TreeView />} />
        <Route path="/person/:id" element={<PersonPage />} />
      </Routes>
    </BrowserRouter>
  )
}
