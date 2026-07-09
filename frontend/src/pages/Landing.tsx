import PublicNavbar from '../components/layout/PublicNavbar'
import Footer from '../components/layout/Footer'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import Features from '../components/landing/Features'
import Trust from '../components/landing/Trust'
import CTA from '../components/landing/CTA'

export default function Landing() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
