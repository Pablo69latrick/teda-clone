import LandingHeader    from '@/components/landing/LandingHeader'
import Hero             from '@/components/landing/Hero'
import Trainers         from '@/components/landing/Trainers'
import Pricing          from '@/components/landing/Pricing'
import ConditionsTable  from '@/components/landing/ConditionsTable'
import FundingFAQ       from '@/components/landing/FundingFAQ'
import BeforeAfter      from '@/components/landing/BeforeAfter'
import CTA              from '@/components/landing/CTA'
import LandingFooter    from '@/components/landing/LandingFooter'

export default function HomePage() {
  return (
    <div className="landing-page min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        {/* Hero inclut TrustLogos, FounderManifesto, AllInOnePlatform (comme dans l'original) */}
        <Hero />
        <Trainers />
        <Pricing />
        <ConditionsTable />
        <FundingFAQ />
        <BeforeAfter />
        <CTA />
      </main>
      <LandingFooter />
    </div>
  )
}
