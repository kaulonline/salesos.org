import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { FileText, Scale, AlertTriangle, CreditCard, Shield, Ban, Gavel, Mail } from 'lucide-react';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

export const Terms: React.FC = () => {
  const lastUpdated = 'February 2026';

  return (
    <>
      <SEOHead {...SEO_CONFIGS.terms} />
      <PageLayout title="Terms of Service" subtitle={`Last updated: ${lastUpdated}`} narrow>
      <div className="bg-white rounded-[32px] p-8 lg:p-12 shadow-sm border border-black/5">
        {/* Agreement */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Gavel className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Agreement to Terms</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            By accessing or using SalesOS ("Service"), you agree to be bound by these Terms of Service
            ("Terms"). If you disagree with any part of the terms, you may not access the Service.
          </p>
          <p className="text-[#666] leading-relaxed mt-4">
            These Terms apply to all visitors, users, and others who access or use the Service. By
            creating an account, you represent that you are at least 18 years old and have the legal
            authority to enter into this agreement.
          </p>
        </section>

        {/* Description of Service */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Description of Service</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            SalesOS is a cloud-based sales CRM and revenue intelligence platform that provides:
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2 mt-4">
            <li>Contact and lead management</li>
            <li>Deal pipeline and opportunity tracking</li>
            <li>Quote and order management (CPQ)</li>
            <li>Analytics and reporting</li>
            <li>Team collaboration tools</li>
            <li>AI-powered insights and automation</li>
          </ul>
        </section>

        {/* Account Registration */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Account Registration</h2>
          <p className="text-[#666] leading-relaxed">
            To use the Service, you must create an account. You agree to:
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2 mt-4">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information as necessary</li>
            <li>Keep your password secure and confidential</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        {/* Subscription and Payment */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Subscription and Payment</h2>
          </div>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Billing</h3>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li>Subscription fees are billed in advance on a monthly or annual basis</li>
            <li>All fees are non-refundable except as expressly set forth herein</li>
            <li>We reserve the right to change pricing with 30 days notice</li>
            <li>You authorize us to charge your payment method for all fees due</li>
          </ul>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Free Trials</h3>
          <p className="text-[#666] leading-relaxed">
            We may offer free trials. At the end of the trial, your account will automatically
            convert to a paid subscription unless you cancel before the trial ends.
          </p>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Cancellation</h3>
          <p className="text-[#666] leading-relaxed">
            You may cancel your subscription at any time through your account settings. Cancellation
            will be effective at the end of your current billing period.
          </p>
        </section>

        {/* Acceptable Use */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Ban className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Acceptable Use</h2>
          </div>
          <p className="text-[#666] leading-relaxed mb-4">
            You agree not to use the Service to:
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights of others</li>
            <li>Transmit malware, viruses, or harmful code</li>
            <li>Engage in unauthorized data collection or scraping</li>
            <li>Attempt to gain unauthorized access to systems</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Send spam or unsolicited communications</li>
            <li>Impersonate others or provide false information</li>
            <li>Use the Service for any illegal or unauthorized purpose</li>
          </ul>
        </section>

        {/* Your Data */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Your Data</h2>
          <p className="text-[#666] leading-relaxed">
            You retain all rights to the data you upload to the Service ("Your Data"). By using the
            Service, you grant us a limited license to use, store, and process Your Data solely to
            provide the Service to you.
          </p>
          <ul className="list-disc list-inside text-[#666] space-y-2 mt-4">
            <li>You are responsible for the accuracy and legality of Your Data</li>
            <li>You must have the right to upload and share all data you provide</li>
            <li>We will not sell or share Your Data with third parties for their own purposes</li>
            <li>You can export or delete Your Data at any time</li>
          </ul>
        </section>

        {/* Intellectual Property */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Intellectual Property</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            The Service, including all content, features, and functionality, is owned by SalesOS and
            is protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p className="text-[#666] leading-relaxed mt-4">
            You may not copy, modify, distribute, sell, or lease any part of the Service, nor may
            you reverse engineer or attempt to extract the source code.
          </p>
        </section>

        {/* Disclaimers and Limitations */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Disclaimers and Limitations</h2>
          </div>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Disclaimer of Warranties</h3>
          <p className="text-[#666] leading-relaxed text-sm">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
            EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
            OR COMPLETELY SECURE.
          </p>

          <h3 className="text-lg font-medium text-[#1A1A1A] mt-6 mb-3">Limitation of Liability</h3>
          <p className="text-[#666] leading-relaxed text-sm">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SALESOS SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
            REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
          </p>
          <p className="text-[#666] leading-relaxed text-sm mt-4">
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN THE TWELVE (12)
            MONTHS PRECEDING THE CLAIM.
          </p>
        </section>

        {/* Indemnification */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Indemnification</h2>
          <p className="text-[#666] leading-relaxed">
            You agree to indemnify, defend, and hold harmless SalesOS and its officers, directors,
            employees, and agents from any claims, damages, losses, or expenses arising out of your
            use of the Service or violation of these Terms.
          </p>
        </section>

        {/* Termination */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Termination</h2>
          <p className="text-[#666] leading-relaxed">
            We may terminate or suspend your account immediately, without prior notice or liability,
            for any reason, including breach of these Terms. Upon termination, your right to use the
            Service will cease immediately.
          </p>
          <p className="text-[#666] leading-relaxed mt-4">
            You may request export of Your Data for up to 30 days following termination, after which
            it may be permanently deleted.
          </p>
        </section>

        {/* Governing Law */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Governing Law</h2>
          <p className="text-[#666] leading-relaxed">
            These Terms shall be governed by the laws of the State of California, United States,
            without regard to its conflict of law provisions. Any disputes shall be resolved in the
            state or federal courts located in San Francisco County, California.
          </p>
        </section>

        {/* Changes to Terms */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Changes to Terms</h2>
          <p className="text-[#666] leading-relaxed">
            We reserve the right to modify these Terms at any time. We will provide notice of material
            changes via email or through the Service. Your continued use of the Service after such
            changes constitutes acceptance of the new Terms.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-6 h-6 text-[#93C01F]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Contact Us</h2>
          </div>
          <p className="text-[#666] leading-relaxed">
            If you have any questions about these Terms, please contact us:
          </p>
          <div className="mt-4 p-4 bg-[#F8F8F6] rounded-xl">
            <p className="text-[#1A1A1A]"><strong>Email:</strong> legal@salesos.org</p>
            <p className="text-[#1A1A1A] mt-2"><strong>Address:</strong> SalesOS Inc., 123 Business Street, San Francisco, CA 94105</p>
          </div>
        </section>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-black/5 flex flex-wrap gap-4">
          <Link to="/privacy" className="text-sm text-[#666] hover:text-[#1A1A1A] transition-colors">
            Privacy Policy
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
