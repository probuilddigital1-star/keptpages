import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Nav from '@/components/landing/Nav';
import Footer from '@/components/landing/Footer';

export default function FairUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <Helmet>
        <title>Fair Use Policy — KeptPages</title>
        <meta name="description" content="Fair Use Policy for KeptPages — what 'unlimited' means and how we keep the service great for everyone." />
        <link rel="canonical" href="https://app.keptpages.com/fair-use" />
      </Helmet>
      <Nav
        onCtaClick={() => navigate('/signup')}
        onLoginClick={() => navigate('/login')}
      />

      <main className="pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-container-sm md:max-w-container-md px-6">
          <h1 className="font-display text-3xl font-bold text-walnut mb-2">Fair Use Policy</h1>
          <p className="font-ui text-sm text-walnut-muted mb-8">Last updated: March 21, 2026</p>

          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-6">
            KeptPages is built for families preserving their handwritten recipes, letters, and journals.
            This Fair Use Policy explains what "unlimited" means and how we keep the service reliable
            for everyone.
          </p>

          {/* What Unlimited Means */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">1. What "Unlimited" Means</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            Keeper Pass and Book Purchaser accounts include unlimited scans for personal and household use.
            This means you can scan as many handwritten documents as you need — grandma's recipe box,
            a drawer full of old letters, stacks of journal pages — without worrying about running out.
          </p>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            To keep the service fast and reliable for all users, we apply generous daily limits that
            are well above what any individual or family would need in normal use. Most users will never
            notice these limits exist.
          </p>

          {/* What's Not Allowed */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">2. What's Not Allowed</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            "Unlimited" does not mean unrestricted commercial or automated use. The following activities
            are not permitted:
          </p>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li><strong>Commercial scanning services:</strong> using KeptPages to operate a digitization or transcription business for third parties</li>
            <li><strong>Automated or scripted uploads:</strong> using bots, scripts, or automated tools to upload content at scale</li>
            <li><strong>Credential sharing or reselling:</strong> sharing your account login with others or reselling access to the Service</li>
            <li><strong>Systematic bulk extraction:</strong> using the Service primarily to extract AI-transcribed text in bulk for use outside of KeptPages</li>
          </ul>

          {/* How We Enforce */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">3. How We Enforce</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            We use a combination of automated and manual measures to ensure fair use:
          </p>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li><strong>Daily limits:</strong> generous daily scan caps that reset every 24 hours</li>
            <li><strong>Duplicate detection:</strong> automated detection of identical file uploads</li>
            <li><strong>Usage monitoring:</strong> automated review of unusual usage patterns</li>
            <li><strong>Account review:</strong> manual review of flagged accounts before any action is taken</li>
          </ul>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mt-3">
            If we determine that an account is being used in violation of this policy, we may throttle,
            suspend, or terminate the account in accordance with our{' '}
            <a href="/terms" className="text-terracotta hover:underline">Terms of Service</a>.
          </p>

          {/* If You Hit a Limit */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">4. If You Hit a Limit</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3">
            If you reach a daily limit during normal use, don't worry — here's what to know:
          </p>
          <ul className="list-disc pl-6 space-y-1 font-body text-sm text-walnut-secondary">
            <li>Daily limits reset automatically every 24 hours</li>
            <li>Your existing scans and collections are unaffected</li>
            <li>If you believe you've been limited in error, contact us and we'll work with you to resolve it</li>
          </ul>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mt-3">
            We built KeptPages for real families doing real preservation work. If you're using the
            service as intended, we want to make sure it works for you.
          </p>

          {/* Contact */}
          <h2 className="font-display text-xl font-semibold text-walnut mt-10 mb-3">5. Contact</h2>
          <p className="font-body text-sm text-walnut-secondary leading-relaxed">
            If you have questions about this policy or need help with a usage limit, please contact us at{' '}
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
