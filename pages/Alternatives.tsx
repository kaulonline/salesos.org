import React from 'react';
import { Check, X, ArrowRight, Zap, Clock, DollarSign, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../src/components/SEO';

export const Alternatives: React.FC = () => {
  const competitors = [
    {
      name: 'Salesforce',
      tagline: 'Enterprise CRM',
      setup: '6+ months',
      pricing: 'From $25/user/mo',
      aiNative: false,
      complexity: 'High',
      implementation: 'Requires consultants',
      dataEntry: 'Manual',
      modernUI: false,
      color: '#00A1E0',
    },
    {
      name: 'HubSpot',
      tagline: 'Marketing + Sales',
      setup: '2-4 weeks',
      pricing: 'From $20/user/mo',
      aiNative: false,
      complexity: 'Medium',
      implementation: 'Self-serve',
      dataEntry: 'Semi-automated',
      modernUI: true,
      color: '#FF7A59',
    },
    {
      name: 'Pipedrive',
      tagline: 'Simple Sales CRM',
      setup: '1 week',
      pricing: 'From $14/user/mo',
      aiNative: false,
      complexity: 'Low',
      implementation: 'Self-serve',
      dataEntry: 'Manual',
      modernUI: false,
      color: '#1A1A1A',
    },
  ];

  const comparisonFeatures = [
    { category: 'AI & Automation', features: [
      { name: 'Native AI (not bolt-on)', salesos: true, salesforce: false, hubspot: false, pipedrive: false },
      { name: 'AI deal scoring', salesos: true, salesforce: false, hubspot: false, pipedrive: false },
      { name: 'Predictive forecasting', salesos: true, salesforce: true, hubspot: false, pipedrive: false },
      { name: 'Automated data entry', salesos: true, salesforce: false, hubspot: false, pipedrive: false },
      { name: 'Multi-channel sequences', salesos: true, salesforce: false, hubspot: true, pipedrive: false },
    ]},
    { category: 'Setup & Implementation', features: [
      { name: '15-minute setup', salesos: true, salesforce: false, hubspot: false, pipedrive: true },
      { name: 'No consultants needed', salesos: true, salesforce: false, hubspot: true, pipedrive: true },
      { name: 'Pre-built workflows', salesos: true, salesforce: false, hubspot: true, pipedrive: false },
      { name: 'Instant data migration', salesos: true, salesforce: false, hubspot: false, pipedrive: false },
    ]},
    { category: 'Pricing & Value', features: [
      { name: 'Outcome-based pricing', salesos: true, salesforce: false, hubspot: false, pipedrive: false },
      { name: 'No per-seat fees', salesos: true, salesforce: false, hubspot: false, pipedrive: false },
      { name: 'Transparent pricing', salesos: true, salesforce: false, hubspot: true, pipedrive: true },
      { name: 'Free trial available', salesos: true, salesforce: false, hubspot: true, pipedrive: true },
    ]},
  ];

  const whySwitch = [
    {
      icon: Clock,
      title: '15-Minute Setup',
      description: 'Start selling in minutes, not months. No 6-month implementation cycles or expensive consultants.',
      pain: 'vs. Salesforce\'s 6-month implementation',
    },
    {
      icon: Zap,
      title: 'Native AI (Not Bolt-On)',
      description: 'AI built into every feature from day one. Not an expensive add-on or afterthought.',
      pain: 'vs. HubSpot\'s paid AI add-ons',
    },
    {
      icon: DollarSign,
      title: 'Outcome-Based Pricing',
      description: 'Pay only when you close deals. No per-seat fees or surprise costs.',
      pain: 'vs. legacy per-seat pricing models',
    },
    {
      icon: Shield,
      title: 'Enterprise-Grade Security',
      description: 'SOC2 Type II certified with all the security features of Salesforce, without the complexity.',
      pain: 'vs. Pipedrive\'s basic security',
    },
  ];

  return (
    <>
      <SEO
        title="Modern Alternatives to Legacy Sales CRMs | SalesOS"
        description="Looking for a Salesforce alternative, HubSpot alternative, or modern CRM? Compare SalesOS to legacy platforms. 15-minute setup, native AI, outcome-based pricing."
        keywords="Salesforce alternative, HubSpot alternative, Pipedrive alternative, modern CRM, CRM alternative, fast CRM setup, AI CRM alternative, affordable enterprise CRM, simple Salesforce replacement, best CRM alternative 2026"
      />

      <div className="min-h-screen bg-[#F2F1EA] py-20">
        <div className="max-w-7xl mx-auto px-6">

          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm mb-6">
              <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Modern CRM Alternative</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold text-[#1A1A1A] mb-6">
              Modern Alternatives to <br />Legacy Sales CRMs
            </h1>

            <p className="text-xl text-[#666] mb-8 leading-relaxed">
              Tired of 6-month implementations, manual data entry, and per-seat pricing?
              Discover why sales teams are switching to SalesOS — the AI-first CRM built for modern revenue teams.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-semibold hover:bg-[#333] transition-colors inline-flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/pricing"
                className="px-8 py-4 bg-white text-[#1A1A1A] rounded-full font-semibold border border-black/10 hover:bg-[#F8F8F6] transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* Quick Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
            <div className="bg-[#1A1A1A] rounded-3xl p-6 text-white">
              <div className="text-4xl font-bold mb-2">SalesOS</div>
              <div className="text-white/60 text-sm mb-4">AI-First CRM</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#EAD07D]" />
                  <span>15-min setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#EAD07D]" />
                  <span>Native AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#EAD07D]" />
                  <span>Outcome pricing</span>
                </div>
              </div>
            </div>

            {competitors.map((comp) => (
              <div key={comp.name} className="bg-white rounded-3xl p-6 border border-black/5">
                <div className="text-2xl font-bold mb-2 text-[#1A1A1A]">{comp.name}</div>
                <div className="text-[#666] text-sm mb-4">{comp.tagline}</div>
                <div className="space-y-2 text-sm text-[#666]">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{comp.setup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} />
                    <span>{comp.pricing}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.aiNative ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-red-500" />}
                    <span>{comp.aiNative ? 'Native AI' : 'No native AI'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Why Teams Are Switching */}
          <div className="mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] text-center mb-12">
              Why Sales Teams Are Switching to SalesOS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {whySwitch.map((reason, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 border border-black/5">
                  <div className="w-14 h-14 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                    <reason.icon size={28} className="text-[#1A1A1A]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{reason.title}</h3>
                  <p className="text-[#666] mb-3">{reason.description}</p>
                  <p className="text-sm text-[#999] italic">{reason.pain}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Feature Comparison */}
          <div className="mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] text-center mb-12">
              Feature-by-Feature Comparison
            </h2>

            <div className="bg-white rounded-3xl overflow-hidden border border-black/5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F8F8F6]">
                    <tr>
                      <th className="text-left px-6 py-4 font-semibold text-[#1A1A1A]">Feature</th>
                      <th className="px-6 py-4 font-semibold text-[#1A1A1A] text-center">SalesOS</th>
                      <th className="px-6 py-4 font-medium text-[#666] text-center">Salesforce</th>
                      <th className="px-6 py-4 font-medium text-[#666] text-center">HubSpot</th>
                      <th className="px-6 py-4 font-medium text-[#666] text-center">Pipedrive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((category, catIdx) => (
                      <React.Fragment key={catIdx}>
                        <tr className="bg-[#F8F8F6]">
                          <td colSpan={5} className="px-6 py-3 font-bold text-[#1A1A1A] text-sm uppercase tracking-wide">
                            {category.category}
                          </td>
                        </tr>
                        {category.features.map((feature, featIdx) => (
                          <tr key={featIdx} className="border-b border-black/5 hover:bg-[#F8F8F6]/50">
                            <td className="px-6 py-4 text-[#1A1A1A]">{feature.name}</td>
                            <td className="px-6 py-4 text-center">
                              {feature.salesos ? (
                                <Check size={20} className="text-green-600 mx-auto" />
                              ) : (
                                <X size={20} className="text-red-500 mx-auto" />
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {feature.salesforce ? (
                                <Check size={20} className="text-green-600 mx-auto opacity-40" />
                              ) : (
                                <X size={20} className="text-red-500 mx-auto opacity-40" />
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {feature.hubspot ? (
                                <Check size={20} className="text-green-600 mx-auto opacity-40" />
                              ) : (
                                <X size={20} className="text-red-500 mx-auto opacity-40" />
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {feature.pipedrive ? (
                                <Check size={20} className="text-green-600 mx-auto opacity-40" />
                              ) : (
                                <X size={20} className="text-red-500 mx-auto opacity-40" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Deep-Dive Comparisons */}
          <div className="mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] text-center mb-8">
              Detailed Comparisons
            </h2>
            <p className="text-center text-[#666] mb-12 max-w-2xl mx-auto">
              Learn exactly how SalesOS compares to each platform with our in-depth guides.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/vs/salesforce"
                className="bg-white rounded-3xl p-8 border border-black/5 hover:border-[#EAD07D] transition-all group"
              >
                <h3 className="text-2xl font-bold text-[#1A1A1A] mb-3 group-hover:text-[#EAD07D] transition-colors">
                  SalesOS vs Salesforce
                </h3>
                <p className="text-[#666] mb-4">
                  15-minute setup vs 6-month implementation. See why teams are making the switch.
                </p>
                <div className="inline-flex items-center gap-2 text-[#1A1A1A] font-semibold group-hover:gap-3 transition-all">
                  Read comparison <ArrowRight size={18} />
                </div>
              </Link>

              <Link
                to="/vs/hubspot"
                className="bg-white rounded-3xl p-8 border border-black/5 hover:border-[#EAD07D] transition-all group"
              >
                <h3 className="text-2xl font-bold text-[#1A1A1A] mb-3 group-hover:text-[#EAD07D] transition-colors">
                  SalesOS vs HubSpot
                </h3>
                <p className="text-[#666] mb-4">
                  Native AI vs bolt-on features. Discover the AI advantage.
                </p>
                <div className="inline-flex items-center gap-2 text-[#1A1A1A] font-semibold group-hover:gap-3 transition-all">
                  Read comparison <ArrowRight size={18} />
                </div>
              </Link>

              <Link
                to="/vs/pipedrive"
                className="bg-white rounded-3xl p-8 border border-black/5 hover:border-[#EAD07D] transition-all group"
              >
                <h3 className="text-2xl font-bold text-[#1A1A1A] mb-3 group-hover:text-[#EAD07D] transition-colors">
                  SalesOS vs Pipedrive
                </h3>
                <p className="text-[#666] mb-4">
                  Simple + powerful. Enterprise features without enterprise complexity.
                </p>
                <div className="inline-flex items-center gap-2 text-[#1A1A1A] font-semibold group-hover:gap-3 transition-all">
                  Read comparison <ArrowRight size={18} />
                </div>
              </Link>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-[#1A1A1A] rounded-[32px] p-12 lg:p-16 text-center text-white">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Ready to Make the Switch?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of sales teams who switched to SalesOS and saw 3.2x pipeline growth and 47% faster close rates.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="px-8 py-4 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-bold hover:bg-[#EAD07D]/90 transition-colors inline-flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 bg-white/10 text-white rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-colors"
              >
                Schedule Demo
              </Link>
            </div>
            <p className="text-white/60 text-sm mt-6">
              No credit card required • Setup in 15 minutes • Cancel anytime
            </p>
          </div>

        </div>
      </div>
    </>
  );
};
