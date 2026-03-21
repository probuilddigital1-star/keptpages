import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Nav from '@/components/landing/Nav';
import Footer from '@/components/landing/Footer';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <Helmet>
        <title>Privacy Policy — KeptPages</title>
        <meta name="description" content="Privacy Policy for KeptPages — how we collect, use, and protect your data." />
        <link rel="canonical" href="https://app.keptpages.com/privacy" />
      </Helmet>
      <Nav
        onCtaClick={() => navigate('/signup')}
        onLoginClick={() => navigate('/login')}
      />

      <main className="pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-container-sm md:max-w-container-md px-6">
          <h1 className="font-display text-3xl font-bold text-walnut mb-2">Privacy Policy</h1>
          <p className="font-ui text-sm text-walnut-muted mb-8">Last updated: March 21, 2026</p>

          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-6">
            KeptPages is a service for scanning, preserving, and printing handwritten documents.
            This policy explains what data we collect, how we use it, and your rights regarding your information.
          </p>

          {/* What We Collect */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">1. What We Collect</h2>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li><strong>Account information:</strong> email address and display name when you sign up</li>
            <li><strong>Uploaded content:</strong> photos and images of handwritten documents you scan</li>
            <li><strong>Extracted text:</strong> text transcribed from your scans using AI processing</li>
            <li><strong>Payment information:</strong> processed securely by Stripe — we never see or store your card number</li>
            <li><strong>Order details:</strong> shipping address and book configuration for print orders</li>
            <li><strong>Usage data:</strong> scan counts, feature usage, and basic analytics to improve the Service</li>
          </ul>

          {/* How We Use It */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">2. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li><strong>Provide the Service:</strong> store your scans, display your collections, generate books</li>
            <li><strong>AI processing:</strong> send uploaded images to AI services for text extraction and transcription</li>
            <li><strong>Book printing:</strong> share necessary order details with our print partner to fulfill book orders</li>
            <li><strong>Communication:</strong> send order confirmations, shipping updates, and important service notifications</li>
            <li><strong>Abuse prevention:</strong> monitor usage patterns to enforce fair use and prevent automated abuse</li>
          </ul>

          {/* Storage */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">3. Where Your Data Lives</h2>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li><strong>Images:</strong> stored in Cloudflare R2 object storage</li>
            <li><strong>Account and document data:</strong> stored in a Supabase (PostgreSQL) database</li>
            <li><strong>Payment data:</strong> stored and processed by Stripe</li>
          </ul>

          {/* Third Parties */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">4. Third-Party Services</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            We share data with the following third-party services only as needed to provide the Service:
          </p>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li><strong>Google Gemini & Anthropic Claude:</strong> AI processing of uploaded images for text extraction. Images are sent for processing and are not retained by these services beyond the request.</li>
            <li><strong>Stripe:</strong> secure payment processing for Keeper Pass and book purchases</li>
            <li><strong>Lulu:</strong> print-on-demand partner for book fulfillment — receives PDF files and shipping addresses</li>
            <li><strong>Resend:</strong> transactional email delivery for order confirmations and shipping notifications</li>
          </ul>

          {/* Data Retention */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">5. Data Retention</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            Your data is retained for as long as your account is active. When you delete your account,
            all associated data — including uploaded images, transcribed text, collections, and book
            drafts — is permanently deleted. Order history may be retained for accounting and legal
            compliance purposes.
          </p>

          {/* Your Rights */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">6. Your Rights</h2>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li><strong>Access:</strong> you can view all your uploaded images and transcribed text within the Service at any time</li>
            <li><strong>Export:</strong> you can copy your transcribed text from the app. Formatted PDF export is available depending on your account tier — see our pricing page for details.</li>
            <li><strong>Deletion:</strong> you can delete your account and all associated data from your account settings</li>
            <li><strong>Correction:</strong> you can edit your profile information and transcribed text at any time</li>
          </ul>

          {/* Cookies */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">7. Cookies</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            KeptPages uses only essential cookies required for authentication (Supabase session tokens).
            We do not use tracking cookies, advertising cookies, or third-party analytics cookies.
          </p>

          {/* Children */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">8. Children's Privacy</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            KeptPages is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child under 13 has provided us with
            personal information, please contact us so we can remove it.
          </p>

          {/* Changes */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">9. Changes to This Policy</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            We may update this Privacy Policy from time to time. If we make material changes, we will
            update the "Last updated" date at the top of this page. Your continued use of the Service
            after changes are posted constitutes your acceptance of the updated policy.
          </p>

          {/* Contact */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">10. Contact</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            If you have questions about this Privacy Policy or your data, please contact us at{' '}
            <a href="mailto:hello@keptpages.com" className="text-terracotta hover:underline">
              hello@keptpages.com
            </a>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
