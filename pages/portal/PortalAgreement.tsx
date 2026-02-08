import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Calendar, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { usePortalProfile } from '../../src/hooks/usePortal';

export const PortalAgreement: React.FC = () => {
  const { data: profile } = usePortalProfile();

  const agreementSections = [
    {
      title: '1. Partner Program Overview',
      content: `This Partner Agreement ("Agreement") establishes the terms and conditions governing your participation in the SalesOS Partner Program. By participating in this program, you agree to comply with all terms outlined herein.

The SalesOS Partner Program is designed to create mutually beneficial relationships with qualified partners who share our commitment to customer success and innovation.`,
    },
    {
      title: '2. Partner Responsibilities',
      content: `As a SalesOS Partner, you agree to:

• Accurately represent SalesOS products and services to prospective customers
• Maintain professional standards in all customer interactions
• Provide timely and accurate deal registration information
• Protect confidential information shared through the partner program
• Comply with all applicable laws and regulations
• Maintain current product knowledge through provided training resources
• Report any customer concerns or issues promptly to SalesOS`,
    },
    {
      title: '3. Deal Registration',
      content: `Deal registration is a cornerstone of our partner program:

• Partners must register deals before engaging with prospects on SalesOS opportunities
• Registered deals are protected for a period of 90 days from approval date
• Deal registration approval is at SalesOS's sole discretion
• Duplicate registrations will be awarded to the first qualifying partner
• Partners must provide accurate and complete information for all deal registrations
• Deal extensions may be granted upon request and are subject to approval`,
    },
    {
      title: '4. Commissions and Payments',
      content: `Commission Structure:

• Commission rates are determined by your partner tier and deal type
• Commissions are calculated on the net contract value
• Payment terms are Net 30 from customer payment receipt
• Partners must maintain valid payment information to receive commissions
• Commissions are subject to clawback if customers cancel within the specified period

Commission rates by tier:
- Registered: 10% on referred deals
- Silver: 15% on referred deals
- Gold: 18% on referred deals
- Platinum: 20% on referred deals`,
    },
    {
      title: '5. Partner Tiers and Benefits',
      content: `Partner tiers are evaluated quarterly based on:

• Total revenue generated
• Number of successful deals
• Customer satisfaction scores
• Training and certification completion
• Active engagement with the partner program

Benefits increase with each tier, including higher commission rates, dedicated support, co-marketing opportunities, and early access to new features.`,
    },
    {
      title: '6. Confidentiality',
      content: `Both parties agree to maintain the confidentiality of:

• Pricing information and discount structures
• Customer information shared through the program
• Product roadmaps and unreleased features
• Business strategies and marketing plans
• Any information marked as confidential

This obligation survives termination of this Agreement for a period of three (3) years.`,
    },
    {
      title: '7. Intellectual Property',
      content: `• SalesOS grants partners a limited, non-exclusive license to use SalesOS trademarks and marketing materials solely for program participation
• Partners may not modify, alter, or create derivative works from SalesOS materials without prior written consent
• All intellectual property rights remain with their respective owners
• Partners must follow brand guidelines when using SalesOS trademarks`,
    },
    {
      title: '8. Term and Termination',
      content: `• This Agreement is effective upon acceptance and continues until terminated
• Either party may terminate with 30 days written notice
• SalesOS may terminate immediately for material breach
• Upon termination, partners must cease using SalesOS trademarks and return confidential materials
• Accrued commissions for completed deals will be paid according to standard terms`,
    },
    {
      title: '9. Limitation of Liability',
      content: `• Neither party shall be liable for indirect, incidental, or consequential damages
• SalesOS's total liability shall not exceed commissions paid in the twelve (12) months preceding the claim
• Partners are solely responsible for their business operations and customer relationships
• SalesOS makes no guarantees regarding deal approval or revenue generation`,
    },
    {
      title: '10. General Provisions',
      content: `• This Agreement constitutes the entire agreement between parties
• Amendments must be in writing and signed by both parties
• This Agreement is governed by the laws of Delaware, USA
• Any disputes shall be resolved through binding arbitration
• Neither party may assign this Agreement without prior written consent
• Failure to enforce any provision does not waive the right to enforce it later`,
    },
  ];

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/portal"
            className="inline-flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Partner Agreement</h1>
          <p className="text-[#666] mt-1">Terms and conditions of the SalesOS Partner Program</p>
        </div>

        {/* Agreement Status Card */}
        <Card className="p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <CheckCircle size={24} className="text-[#93C01F]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#1A1A1A]">Agreement Status: Active</h3>
                <p className="text-[#666] text-sm mt-1">
                  You accepted this agreement when joining the partner program
                </p>
                {profile?.partner && (
                  <div className="flex items-center gap-4 mt-3 text-sm text-[#888]">
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} />
                      Partner: {profile.partner.companyName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Tier: {profile.partner.tier}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 text-[#666] hover:bg-[#F8F8F6] transition-colors text-sm font-medium">
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </Card>

        {/* Agreement Content */}
        <Card className="p-8">
          <div className="mb-8 pb-8 border-b border-black/5">
            <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">
              SalesOS Partner Program Agreement
            </h2>
            <p className="text-[#666] text-sm">
              Last updated: January 1, 2026 | Version 2.0
            </p>
          </div>

          <div className="space-y-8">
            {agreementSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-3">{section.title}</h3>
                <div className="text-[#666] text-sm leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-black/5">
            <p className="text-sm text-[#888]">
              By participating in the SalesOS Partner Program, you acknowledge that you have read,
              understood, and agree to be bound by this Partner Agreement. If you have any questions
              about these terms, please contact your partner manager or our support team.
            </p>
          </div>
        </Card>

        {/* Contact Section */}
        <Card className="mt-8 p-6 bg-[#F8F8F6]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[#1A1A1A]">Questions about the agreement?</h3>
              <p className="text-sm text-[#666] mt-1">
                Contact your partner manager or our support team for clarification
              </p>
            </div>
            <Link
              to="/portal/support"
              className="px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PortalAgreement;
