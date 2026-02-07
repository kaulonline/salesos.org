import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { Shield, Lock, Eye, Database, Mail, Globe, Server, Clock } from 'lucide-react';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

export const Privacy: React.FC = () => {
  const lastUpdated = 'February 2026';

  return (
    <>
      <SEOHead {...SEO_CONFIGS.privacy} />
      <PageLayout title="Privacy Policy" subtitle={`Last updated: ${lastUpdated}`} narrow>
      <div className="bg-white rounded-[32px] p-8 lg:p-12 shadow-sm border border-black/5">
        {/* Introduction */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Introduction</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            SalesOS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our
            sales CRM and revenue intelligence platform.
          </p>
          <p className="text-[#666] leading-relaxed mt-4">
            By using SalesOS, you agree to the collection and use of information in accordance with
            this policy. If you do not agree with the terms of this privacy policy, please do not
            access the application.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Information We Collect</h2>
          </div>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Personal Information</h3>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li>Name and email address</li>
            <li>Company name and job title</li>
            <li>Phone number (optional)</li>
            <li>Billing information for paid subscriptions</li>
            <li>Profile picture (optional)</li>
          </ul>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Business Data</h3>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li>Contact and lead information you enter</li>
            <li>Deal and opportunity data</li>
            <li>Quotes and orders</li>
            <li>Communication logs and notes</li>
            <li>Custom fields and configurations</li>
          </ul>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Usage Data</h3>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li>Device information and browser type</li>
            <li>IP address and general location</li>
            <li>Pages visited and features used</li>
            <li>Time spent on the platform</li>
            <li>Referral source</li>
          </ul>
        </section>

        {/* How We Use Your Information */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">How We Use Your Information</h2>
          </div>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li>To provide and maintain the SalesOS service</li>
            <li>To process transactions and send related information</li>
            <li>To send administrative messages, updates, and security alerts</li>
            <li>To respond to customer service requests and support needs</li>
            <li>To improve and personalize user experience</li>
            <li>To analyze usage patterns and optimize performance</li>
            <li>To detect, prevent, and address technical issues</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Data Sharing and Disclosure</h2>
          </div>
          <p className="text-[#666] leading-relaxed mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share
            your information in the following circumstances:
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li><strong>Service Providers:</strong> With trusted vendors who assist in operating our platform</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            <li><strong>With Your Consent:</strong> For any other purpose with your explicit consent</li>
          </ul>
        </section>

        {/* Data Security */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Data Security</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            We implement industry-standard security measures to protect your data, including:
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2 mt-4">
            <li>SSL/TLS encryption for all data transmission</li>
            <li>Encryption at rest for sensitive data</li>
            <li>Regular security audits and penetration testing</li>
            <li>Access controls and authentication requirements</li>
            <li>Automated backups and disaster recovery procedures</li>
          </ul>
        </section>

        {/* Your Rights (GDPR) */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Your Rights (GDPR)</h2>
          </div>
          <p className="text-[#666] leading-relaxed mb-4">
            If you are located in the European Economic Area (EEA), you have the following rights:
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
          </ul>
          <p className="text-[#666] leading-relaxed mt-4">
            To exercise these rights, please visit your account settings or contact us at{' '}
            <a href="mailto:privacy@salesos.org" className="text-[#1A1A1A] hover:text-[#93C01F] font-medium">
              privacy@salesos.org
            </a>
          </p>
        </section>

        {/* Cookies */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Cookies</h2>
          <p className="text-[#666] leading-relaxed">
            We use cookies and similar tracking technologies to enhance your experience:
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2 mt-4">
            <li><strong>Essential Cookies:</strong> Required for the platform to function</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how you use SalesOS</li>
            <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
          </ul>
          <p className="text-[#666] leading-relaxed mt-4">
            You can manage cookie preferences through our cookie banner or your browser settings.
          </p>
        </section>

        {/* Data Retention */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Data Retention</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            We retain your personal data for as long as your account is active or as needed to provide
            you services. We may retain certain information as required by law or for legitimate
            business purposes, such as to resolve disputes or enforce our agreements.
          </p>
        </section>

        {/* Children's Privacy */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Children's Privacy</h2>
          <p className="text-[#666] leading-relaxed">
            SalesOS is not intended for users under the age of 16. We do not knowingly collect
            personal information from children. If we become aware that we have collected personal
            information from a child, we will take steps to delete such information.
          </p>
        </section>

        {/* Changes */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Changes to This Policy</h2>
          <p className="text-[#666] leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes by
            posting the new Privacy Policy on this page and updating the "Last updated" date. You are
            advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Contact Us</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <div className="mt-4 p-4 bg-[#F8F8F6] rounded-xl">
            <p className="text-[#1A1A1A]"><strong>Email:</strong> privacy@salesos.org</p>
            <p className="text-[#1A1A1A] mt-2"><strong>Address:</strong> SalesOS Inc., 123 Business Street, San Francisco, CA 94105</p>
          </div>
        </section>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-black/5 flex flex-wrap gap-4">
          <Link to="/terms" className="text-sm text-[#666] hover:text-[#1A1A1A] transition-colors">
            Terms of Service
          </Link>
          <Link to="/contact" className="text-sm text-[#666] hover:text-[#1A1A1A] transition-colors">
            Contact Us
          </Link>
        </div>
      </div>
    </PageLayout>
    </>
  );
};
