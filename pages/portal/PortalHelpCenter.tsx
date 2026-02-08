import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  BookOpen,
  FileText,
  Video,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Zap,
  Users,
  DollarSign,
  Shield,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    title: 'Getting Started',
    icon: <Zap size={20} />,
    items: [
      {
        question: 'How do I register a new deal?',
        answer: 'Navigate to "Deal Registrations" from the main menu, then click "New Registration". Fill in the customer details, estimated deal value, and expected close date. Once submitted, our team will review and approve within 2-3 business days.',
      },
      {
        question: 'What information do I need to register a deal?',
        answer: 'You\'ll need the customer\'s company name, primary contact name and email, estimated deal value, expected close date, and a brief description of the opportunity. The more details you provide, the faster we can process your registration.',
      },
      {
        question: 'How long does deal approval take?',
        answer: 'Most deal registrations are reviewed within 2-3 business days. Complex deals or those requiring additional verification may take up to 5 business days. You\'ll receive an email notification once your registration is approved or if we need additional information.',
      },
    ],
  },
  {
    title: 'Commissions & Payments',
    icon: <DollarSign size={20} />,
    items: [
      {
        question: 'How are commissions calculated?',
        answer: 'Commission rates vary by partner tier and deal type. Standard commissions range from 10-20% of the deal value. Your specific commission rate is outlined in your partner agreement and can be viewed in your partner profile.',
      },
      {
        question: 'When do I receive commission payments?',
        answer: 'Commissions are paid within 30 days after the customer\'s payment is received and any applicable return period has passed. Payments are processed on the 15th of each month for all eligible commissions.',
      },
      {
        question: 'How can I track my commission earnings?',
        answer: 'Visit the Dashboard to see your commission summary. For detailed breakdowns, check the "My Deals" section where you can view individual deal commissions and payment status.',
      },
    ],
  },
  {
    title: 'Partner Tiers & Benefits',
    icon: <Users size={20} />,
    items: [
      {
        question: 'What are the different partner tiers?',
        answer: 'We have four partner tiers: Registered, Silver, Gold, and Platinum. Each tier offers increasing benefits including higher commission rates, dedicated support, co-marketing opportunities, and early access to new features.',
      },
      {
        question: 'How do I upgrade my partner tier?',
        answer: 'Partner tiers are evaluated quarterly based on revenue generated, deal volume, customer satisfaction, and engagement. Meet the tier requirements and your status will be automatically upgraded during the next review cycle.',
      },
      {
        question: 'What benefits does my current tier include?',
        answer: 'Your tier benefits are listed in your partner profile. Common benefits include commission rates, support SLAs, marketing development funds (MDF), and access to partner resources and training.',
      },
    ],
  },
  {
    title: 'Account & Security',
    icon: <Shield size={20} />,
    items: [
      {
        question: 'How do I change my password?',
        answer: 'Go to Security Settings from the user menu. You can update your password by entering your current password and choosing a new one. We recommend using a strong, unique password.',
      },
      {
        question: 'How do I enable two-factor authentication?',
        answer: 'Navigate to Security Settings and click "Enable 2FA". You\'ll need an authenticator app like Google Authenticator or Authy. Scan the QR code and enter the verification code to complete setup.',
      },
      {
        question: 'How do I add team members to my partner account?',
        answer: 'Contact your partner manager to request additional user accounts. We\'ll send an invitation to your team member\'s email address with instructions to set up their account.',
      },
    ],
  },
];

const quickLinks = [
  {
    title: 'Partner Portal Guide',
    description: 'Complete guide to using the partner portal',
    icon: <BookOpen size={20} />,
    href: '#',
  },
  {
    title: 'Deal Registration Best Practices',
    description: 'Tips for successful deal registrations',
    icon: <FileText size={20} />,
    href: '#',
  },
  {
    title: 'Product Training Videos',
    description: 'Learn about our products and solutions',
    icon: <Video size={20} />,
    href: '#',
  },
  {
    title: 'Sales Resources',
    description: 'Pitch decks, case studies, and more',
    icon: <FileText size={20} />,
    href: '#',
  },
];

export const PortalHelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Getting Started']);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const toggleQuestion = (question: string) => {
    setExpandedQuestions(prev =>
      prev.includes(question) ? prev.filter(q => q !== question) : [...prev, question]
    );
  };

  const filteredCategories = searchQuery
    ? faqCategories.map(category => ({
        ...category,
        items: category.items.filter(
          item =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(category => category.items.length > 0)
    : faqCategories;

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
          <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Help Center</h1>
          <p className="text-[#666] mt-1">Find answers and resources to help you succeed</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" size={20} />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-base"
          />
        </div>

        {/* Quick Links */}
        {!searchQuery && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className="flex items-start gap-4 p-4 bg-white rounded-xl border border-black/5 hover:border-[#EAD07D]/50 hover:shadow-sm transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#EAD07D]/30 transition-colors">
                    {link.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-[#1A1A1A] group-hover:text-[#1A1A1A]">
                      {link.title}
                    </h3>
                    <p className="text-sm text-[#666] mt-0.5">{link.description}</p>
                  </div>
                  <ExternalLink size={16} className="text-[#999] group-hover:text-[#666] mt-1" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div>
          <h2 className="text-lg font-medium text-[#1A1A1A] mb-4">
            {searchQuery ? 'Search Results' : 'Frequently Asked Questions'}
          </h2>

          {filteredCategories.length === 0 ? (
            <Card className="p-8 text-center">
              <HelpCircle size={40} className="text-[#999] mx-auto mb-3" />
              <p className="text-[#666]">No results found for "{searchQuery}"</p>
              <p className="text-sm text-[#999] mt-1">Try different keywords or browse the categories below</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-full bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors"
              >
                Clear Search
              </button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map((category) => (
                <Card key={category.title} className="overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.title)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#F8F8F6] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
                        {category.icon}
                      </div>
                      <span className="font-medium text-[#1A1A1A]">{category.title}</span>
                      <span className="text-xs text-[#999] bg-[#F8F8F6] px-2 py-0.5 rounded-full">
                        {category.items.length} articles
                      </span>
                    </div>
                    {expandedCategories.includes(category.title) ? (
                      <ChevronDown size={20} className="text-[#666]" />
                    ) : (
                      <ChevronRight size={20} className="text-[#666]" />
                    )}
                  </button>

                  {expandedCategories.includes(category.title) && (
                    <div className="border-t border-black/5">
                      {category.items.map((item, index) => (
                        <div
                          key={item.question}
                          className={index !== category.items.length - 1 ? 'border-b border-black/5' : ''}
                        >
                          <button
                            onClick={() => toggleQuestion(item.question)}
                            className="w-full flex items-center justify-between p-4 pl-16 text-left hover:bg-[#F8F8F6] transition-colors"
                          >
                            <span className="text-[#1A1A1A] text-sm">{item.question}</span>
                            {expandedQuestions.includes(item.question) ? (
                              <ChevronDown size={18} className="text-[#666] shrink-0 ml-2" />
                            ) : (
                              <ChevronRight size={18} className="text-[#666] shrink-0 ml-2" />
                            )}
                          </button>
                          {expandedQuestions.includes(item.question) && (
                            <div className="px-16 pb-4">
                              <p className="text-sm text-[#666] leading-relaxed">{item.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contact Support CTA */}
        <Card className="mt-8 p-6 bg-[#1A1A1A] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="font-medium text-lg">Still need help?</h3>
                <p className="text-white/60 text-sm">Our support team is here to assist you</p>
              </div>
            </div>
            <Link
              to="/portal/support"
              className="px-6 py-2.5 rounded-full bg-white text-[#1A1A1A] font-medium text-sm hover:bg-white/90 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PortalHelpCenter;
