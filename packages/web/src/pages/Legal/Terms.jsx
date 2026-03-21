import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Nav from '@/components/landing/Nav';
import Footer from '@/components/landing/Footer';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <Helmet>
        <title>Terms of Service — KeptPages</title>
        <meta name="description" content="Terms of Service for KeptPages — the rules and conditions for using our service." />
        <link rel="canonical" href="https://app.keptpages.com/terms" />
      </Helmet>
      <Nav
        onCtaClick={() => navigate('/signup')}
        onLoginClick={() => navigate('/login')}
      />

      <main className="pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-container-sm md:max-w-container-md px-6">
          <h1 className="font-display text-3xl font-bold text-walnut mb-2">Terms of Service</h1>
          <p className="font-ui text-sm text-walnut-muted mb-8">Last updated: March 21, 2026</p>

          {/* Acceptance */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">1. Acceptance of Terms</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            By accessing or using KeptPages ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>

          {/* Account */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">2. Your Account</h2>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li>You may create one account per person. Sharing account credentials is not permitted.</li>
            <li>You are responsible for maintaining the security of your account and password.</li>
            <li>You must provide accurate and complete information when creating your account.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
          </ul>

          {/* The Service */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">3. The Service</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            KeptPages allows you to scan, digitize, organize, and preserve handwritten documents such as
            recipes, letters, and journals. You can organize documents into collections and order printed
            books through our print partner.
          </p>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            We use AI-powered text recognition to extract and transcribe handwritten content. While we
            strive for accuracy, AI transcription may contain errors. You are responsible for reviewing
            and editing transcribed content.
          </p>

          {/* Acceptable Use */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">4. Acceptable Use</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            You agree not to:
          </p>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li>Use the Service to operate a commercial scanning or digitization business</li>
            <li>Use automated tools, bots, or scripts to upload content or access the Service</li>
            <li>Share, sell, or transfer your account credentials to others</li>
            <li>Upload content that infringes on the intellectual property rights of others</li>
            <li>Upload illegal, harmful, or objectionable content</li>
            <li>Attempt to circumvent usage limits or security measures</li>
            <li>Reverse-engineer, decompile, or otherwise attempt to extract the source code of the Service</li>
          </ul>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mt-3">
            Our <a href="/fair-use" className="text-terracotta hover:underline">Fair Use Policy</a> provides
            additional details on what constitutes acceptable use, particularly for unlimited-tier accounts.
          </p>

          {/* Intellectual Property */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">5. Intellectual Property</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            You retain all rights to the content you upload to KeptPages, including scanned images and
            the original handwritten documents they represent. By uploading content, you grant KeptPages
            a limited license to process, store, and display your content solely to provide the Service.
          </p>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            KeptPages and its logos, design, and underlying technology are the property of KeptPages.
            You may not copy, modify, or distribute any part of the Service without our written permission.
          </p>

          {/* Payment & Refunds */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">6. Payments & Refunds</h2>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li>The Keeper Pass is a one-time purchase and is non-refundable.</li>
            <li>
              Book orders are processed and printed by our print partner. Refunds and reprints for
              book orders are subject to our print partner's policies regarding print quality issues.
            </li>
            <li>All payments are processed securely through Stripe. KeptPages does not store your payment card details.</li>
            <li>Prices are listed in USD and may be updated from time to time.</li>
          </ul>

          {/* Termination */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">7. Termination</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            You may delete your account at any time from your account settings. Upon deletion, your data —
            including uploaded images, transcribed text, and collections — will be permanently removed.
          </p>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            We reserve the right to suspend or terminate your account if we determine, in our sole
            discretion, that you have violated these Terms or our Fair Use Policy. We will make reasonable
            efforts to notify you before taking such action, except in cases of egregious or repeated abuse.
          </p>

          {/* Disclaimer */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">8. Disclaimer & Limitation of Liability</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            The Service is provided "as is" and "as available" without warranties of any kind, either express
            or implied. We do not warrant that AI transcription will be error-free or that the Service will
            be uninterrupted.
          </p>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            To the maximum extent permitted by law, KeptPages shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of data, profits, or
            goodwill arising out of your use of the Service.
          </p>

          {/* Changes */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">9. Changes to These Terms</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            We may update these Terms from time to time. If we make material changes, we will notify you
            by posting the updated Terms on this page with a revised "Last updated" date. Your continued
            use of the Service after changes are posted constitutes your acceptance of the updated Terms.
          </p>

          {/* Contact */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">10. Contact</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            If you have questions about these Terms, please contact us at{' '}
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
