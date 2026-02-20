import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — TEDA' }

const UPDATED = 'February 15, 2026'

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {UPDATED}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1">
          <section>
            <h2>1. Introduction</h2>
            <p>
              TEDA (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our platform and services.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account information:</strong> name, email address, password</li>
              <li><strong>Profile information:</strong> profile picture, display name</li>
              <li><strong>Payment information:</strong> processed securely through third-party payment processors — we do not store credit card numbers</li>
              <li><strong>Payout information:</strong> cryptocurrency wallet addresses, bank account details, PayPal email</li>
              <li><strong>Identity verification:</strong> government-issued ID, proof of address (when required for KYC compliance)</li>
              <li><strong>Communications:</strong> support requests, feedback, survey responses</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Device information:</strong> browser type, operating system, screen resolution</li>
              <li><strong>Usage data:</strong> pages visited, features used, trading activity, session duration</li>
              <li><strong>Network information:</strong> IP address, approximate geolocation</li>
              <li><strong>Cookies and tracking technologies:</strong> session cookies, analytics cookies, preference cookies</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>Process challenge purchases and payout requests</li>
              <li>Verify your identity for compliance purposes</li>
              <li>Monitor trading activity for rule compliance and risk management</li>
              <li>Send account-related notifications (challenge status, payouts, security alerts)</li>
              <li>Provide customer support</li>
              <li>Detect and prevent fraud, abuse, or security incidents</li>
              <li>Generate anonymized, aggregated analytics to improve our services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Sharing &amp; Disclosure</h2>
            <p>We do not sell your personal information. We may share your data with:</p>
            <ul>
              <li><strong>Payment processors:</strong> to process transactions (Stripe, cryptocurrency payment providers)</li>
              <li><strong>Cloud infrastructure:</strong> hosting and database services (Vercel, Supabase)</li>
              <li><strong>Analytics providers:</strong> anonymized usage data for platform improvement</li>
              <li><strong>Legal authorities:</strong> when required by law, regulation, or legal process</li>
              <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services. Trading data and account history are retained for a minimum of 5 years for regulatory compliance. You may request deletion of your account and associated data, subject to our legal retention obligations.
            </p>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including encryption in transit (TLS 1.3), encryption at rest, secure authentication with optional two-factor authentication, and regular security audits. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>7. Cookies</h2>
            <p>We use the following types of cookies:</p>
            <ul>
              <li><strong>Essential cookies:</strong> required for authentication and core functionality</li>
              <li><strong>Analytics cookies:</strong> help us understand how you use the platform</li>
              <li><strong>Preference cookies:</strong> remember your settings (theme, currency, layout)</li>
            </ul>
            <p>You can manage cookie preferences through your browser settings. Disabling essential cookies may prevent you from using certain features.</p>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li><strong>Access</strong> your personal data</li>
              <li><strong>Correct</strong> inaccurate or incomplete data</li>
              <li><strong>Delete</strong> your account and personal data</li>
              <li><strong>Port</strong> your data in a machine-readable format</li>
              <li><strong>Object</strong> to processing of your data for specific purposes</li>
              <li><strong>Withdraw consent</strong> where processing is based on consent</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:privacy@teda.com">privacy@teda.com</a>.</p>
          </section>

          <section>
            <h2>9. International Transfers</h2>
            <p>
              Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers, including standard contractual clauses where required.
            </p>
          </section>

          <section>
            <h2>10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that we have collected data from a minor, we will promptly delete it.
            </p>
          </section>

          <section>
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
            <p>
              For privacy-related inquiries, contact our Data Protection Officer at <a href="mailto:privacy@teda.com">privacy@teda.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
