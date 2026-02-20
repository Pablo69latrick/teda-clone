import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Terms of Service — TEDA' }

const UPDATED = 'February 15, 2026'

export default function TermsPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/teda-logo.jpg" alt="TEDA" className="w-6 h-6 rounded-md object-contain" />
          <span className="font-bold text-sm">TEDA</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {UPDATED}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1">
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the TEDA platform (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service. TEDA reserves the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <p>You must be at least 18 years of age to use the Service. By creating an account, you represent and warrant that:</p>
            <ul>
              <li>You are at least 18 years old</li>
              <li>You have the legal capacity to enter into a binding agreement</li>
              <li>You are not prohibited from using the Service under applicable laws</li>
              <li>You are not located in a jurisdiction where access to the Service is restricted</li>
            </ul>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <p>
              To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2>4. Challenge Accounts &amp; Evaluation</h2>
            <h3>4.1 Nature of Service</h3>
            <p>
              TEDA provides simulated trading evaluation programs (&quot;Challenges&quot;) that assess a trader&apos;s ability to manage risk and generate returns. Challenge accounts operate on simulated market data and do not involve real capital trading.
            </p>
            <h3>4.2 Challenge Rules</h3>
            <p>Each Challenge has specific rules including but not limited to:</p>
            <ul>
              <li>Profit targets for each evaluation phase</li>
              <li>Maximum daily loss limits</li>
              <li>Maximum overall drawdown limits</li>
              <li>Minimum and maximum trading day requirements</li>
              <li>Prohibited trading strategies (e.g., martingale, arbitrage exploitation)</li>
            </ul>
            <p>Violation of any rule results in immediate account breach. Breached accounts cannot be reinstated.</p>

            <h3>4.3 Funded Accounts</h3>
            <p>
              Upon successfully completing all evaluation phases, you may be offered a funded account. Funded accounts are managed by TEDA and subject to the same risk parameters. Profits generated on funded accounts are shared according to the profit-split percentage defined in your Challenge plan.
            </p>
          </section>

          <section>
            <h2>5. Fees &amp; Payments</h2>
            <p>
              Challenge entry fees are one-time, non-refundable payments processed at the time of purchase. All prices are listed in the currency shown on the pricing page. TEDA reserves the right to change pricing at any time without prior notice, though changes do not affect existing active challenges.
            </p>
          </section>

          <section>
            <h2>6. Payouts</h2>
            <p>Payout requests on funded accounts are subject to the following conditions:</p>
            <ul>
              <li>Minimum payout amount as specified in your account terms</li>
              <li>Payouts are processed within 5-7 business days</li>
              <li>Available payout methods: cryptocurrency, bank transfer, PayPal</li>
              <li>TEDA may require identity verification before processing payouts</li>
              <li>Profit split percentages are defined by your Challenge plan and cannot be modified retroactively</li>
            </ul>
          </section>

          <section>
            <h2>7. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use automated trading bots or copy-trading services without authorization</li>
              <li>Exploit latency, data feed delays, or pricing errors</li>
              <li>Engage in account churning or coordinated group trading</li>
              <li>Use multiple accounts to hedge positions across accounts</li>
              <li>Attempt to manipulate the evaluation system</li>
              <li>Share account credentials with third parties</li>
              <li>Reverse-engineer or interfere with the platform&apos;s systems</li>
            </ul>
          </section>

          <section>
            <h2>8. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service are owned by TEDA and protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without prior written consent.
            </p>
          </section>

          <section>
            <h2>9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. TEDA does not guarantee that the Service will be uninterrupted, secure, or error-free. Simulated trading results do not guarantee future performance on funded accounts.
            </p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TEDA shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to loss of profits, data, or business opportunities.
            </p>
          </section>

          <section>
            <h2>11. Termination</h2>
            <p>
              TEDA may suspend or terminate your account at any time for violation of these Terms or for any other reason at its sole discretion. Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive termination shall remain in effect.
            </p>
          </section>

          <section>
            <h2>12. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the jurisdiction in which TEDA is incorporated, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p>
              For questions about these Terms, please contact us at <a href="mailto:legal@teda.com">legal@teda.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
