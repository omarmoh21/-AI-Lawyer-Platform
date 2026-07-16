import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Consultation from './pages/Consultation'
import DocumentAnalysis from './pages/DocumentAnalysis'
import LegalSearch from './pages/LegalSearch'
import Profile from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/consultation" element={<Consultation />} />
      <Route path="/documents" element={<DocumentAnalysis />} />
      <Route path="/search" element={<LegalSearch />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  )
}
