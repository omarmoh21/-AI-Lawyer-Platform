import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Consultation from './pages/Consultation'
import LegalSearch from './pages/LegalSearch'
import Contracts from './pages/Contracts'
import Profile from './pages/Profile'
import ProtectedRoute from './components/auth/ProtectedRoute'
import GuestRoute from './components/auth/GuestRoute'

// The full app in the "annotated manuscript" identity: Landing + auth are
// public; every workspace page lives behind ProtectedRoute in the charcoal +
// gold shell.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/consultation" element={<ProtectedRoute><Consultation /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><LegalSearch /></ProtectedRoute>} />
      <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    </Routes>
  )
}
