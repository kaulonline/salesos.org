import React from 'react';
import { Check, X, ArrowRight, Clock, DollarSign, Zap, Users, Shield, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../../src/components/SEO';
import { PricingDisclaimer } from '../../src/components/PricingDisclaimer';

export const VsSalesforce: React.FC = () => {
  const comparisonData = [
    {
      category: 'Setup & Implementation',
      features: [
        {
          name: 'Time to first value',
          salesos: '15 minutes',
          salesforce: '6+ months',
          winner: 'salesos',
          description: 'Start selling immediately vs lengthy implementation'
        },
        {
          name: 'Implementation cost',
          salesos: '$0',
          salesforce: '$50k-$500k+',
          winner: 'salesos',
          description: 'No consultants needed vs expensive implementation partners'
        },
        {
          name: 'Training required',
          salesos: '<1 hour',
          salesforce: '40+ hours',
          winner: 'salesos',
          description: 'Intuitive interface vs complex training programs'
        },
        {
          name: 'Data migration',
          salesos: 'Automated',
          salesforce: 'Manual/Complex',
          winner: 'salesos',
          description: 'One-click CSV import vs custom migration projects'
        },
      ]
    },
    {
      category: 'AI & Automation',
      features: [
        {
          name: 'Native AI',
          salesos: 'Built-in from day 1',
          salesforce: 'Einstein add-on',
          winner: 'salesos',
          description: 'AI in every feature vs expensive add-on package'
        },
        {
          name: 'Automated data entry',
          salesos: 'Yes',
          salesforce: 'Limited',
          winner: 'salesos',
          description: 'Fully automated vs still requires manual input'
        },
        {
          name: 'AI deal scoring',
          salesos: 'Included',
          salesforce: 'Einstein Analytics ($75/user)',
          winner: 'salesos',
          description: 'Predictive analytics included vs expensive add-on'
        },
        {
          name: 'Smart sequences',
          salesos: 'Behavior-based',
          salesforce: 'Time-based only',
          winner: 'salesos',
          description: 'Adapts to prospect behavior vs rigid schedules'
        },
      ]
    },
    {
      category: 'Pricing & Value',
      features: [
        {
          name: 'Starting price',
          salesos: 'Outcome-based (2.5% of deals)',
          salesforce: '$25/user/month minimum',
          winner: 'salesos',
          description: 'Pay for results vs pay per seat'
        },
        {
          name: 'Hidden costs',
          salesos: 'None',
          salesforce: 'Many (add-ons, consultants)',
          winner: 'salesos',
          description: 'Transparent pricing vs surprise costs'
        },
        {
          name: 'Contract flexibility',
          salesos: 'Monthly, cancel anytime',
          salesforce: 'Annual commitment',
          winner: 'salesos',
          description: 'No lock-in vs 12-month minimum'
        },
        {
          name: 'ROI timeline',
          salesos: 'Week 1',
          salesforce: 'Month 6-12',
          winner: 'salesos',
          description: 'Immediate value vs long payback period'
        },
      ]
    },
    {
      category: 'User Experience',
      features: [
        {
          name: 'Interface',
          salesos: 'Modern, intuitive',
          salesforce: 'Complex, dated',
          winner: 'salesos',
          description: 'Clean 2026 design vs legacy UI'
        },
        {
          name: 'Mobile experience',
          salesos: 'Native, fast',
          salesforce: 'Clunky',
          winner: 'salesos',
          description: 'Built for mobile-first vs retrofitted'
        },
        {
          name: 'Admin overhead',
          salesos: 'Minimal',
          salesforce: 'Requires dedicated admin',
          winner: 'salesos',
          description: 'Self-managing vs needs full-time admin'
        },
        {
          name: 'Rep adoption rate',
          salesos: 'High adoption',
          salesforce: 'Lower adoption',
          winner: 'salesos',
          description: 'Sales reps actually use it vs constant resistance'
        },
      ]
    },
    {
      category: 'Features & Capabilities',
      features: [
        {
          name: 'Pipeline intelligence',
          salesos: 'AI-powered',
          salesforce: 'Manual + Einstein ($$$)',
          winner: 'salesos',
          description: 'Predictive deal insights included'
        },
        {
          name: 'Email sequences',
          salesos: 'Multi-channel + AI',
          salesforce: 'Basic (requires Pardot)',
          winner: 'salesos',
          description: 'Advanced automation vs basic or expensive add-on'
        },
        {
          name: 'Data enrichment',
          salesos: 'Included (150+ countries)',
          salesforce: 'Requires Data.com ($$$)',
          winner: 'salesos',
          description: 'Built-in global data vs expensive add-on'
        },
        {
          name: 'Sales coaching',
          salesos: 'AI coaching included',
          salesforce: 'Not available',
          winner: 'salesos',
          description: 'Real-time coaching vs no coaching features'
        },
      ]
    },
    {
      category: 'Enterprise & Security',
      features: [
        {
          name: 'Security compliance',
          salesos: 'SOC2 Type II',
          salesforce: 'SOC2 Type II',
          winner: 'tie',
          description: 'Both enterprise-grade secure'
        },
        {
          name: 'SSO/SAML',
          salesos: 'Included',
          salesforce: 'Included',
          winner: 'tie',
          description: 'Enterprise authentication on both'
        },
        {
          name: 'Data residency',
          salesos: 'Available',
          salesforce: 'Available',
          winner: 'tie',
          description: 'Both offer data residency options'
        },
        {
          name: 'Uptime SLA',
          salesos: '99.9%',
          salesforce: '99.9%',
          winner: 'tie',
          description: 'Same reliability guarantee'
        },
      ]
    },
  ];

  const switchReasons = [
    {
      title: "Faster Implementation",
      description: "Sales teams report being fully operational in days instead of months, with minimal training required."
    },
    {
      title: "Lower Total Cost",
      description: "Teams switching from Salesforce typically eliminate implementation costs, reduce per-user fees, and avoid expensive add-ons."
    },
    {
      title: "Better AI Integration",
      description: "Native AI features are included in the platform instead of requiring expensive add-ons that need separate configuration."
    },
  ];

  const migrationSteps = [
    {
      step: 1,
      title: 'Export your data from Salesforce',
      description: 'Use Salesforce Data Export (Setup → Data Export) to download your accounts, contacts, opportunities, and activities as CSV files.',
      time: '30 minutes'
    },
    {
      step: 2,
      title: 'Sign up for SalesOS',
      description: 'Create your SalesOS account in under 2 minutes. No credit card required for the 14-day trial.',
      time: '2 minutes'
    },
    {
      step: 3,
      title: 'Import your data',
      description: 'Use our one-click CSV importer to bring in all your data. Our AI automatically maps fields and deduplicates records.',
      time: '5 minutes'
    },
    {
      step: 4,
      title: 'Connect integrations',
      description: 'Connect Gmail, Calendar, LinkedIn, and other tools in seconds. No developer needed.',
      time: '5 minutes'
    },
    {
      step: 5,
      title: 'Invite your team',
      description: 'Add team members and they will be productive immediately thanks to our intuitive interface.',
      time: '3 minutes'
    },
  ];

  const pricingComparison = [
    {
      scenario: '10-person sales team',
      salesforce: '$25/user × 10 users = $250/month (Essentials)',
      salesforceNote: '+ $5,000-$50,000 implementation + $40/month for Einstein',
      salesforceTotal: '$~300/month + $25,000 setup',
      salesos: '2.5% of closed revenue',
      salesosNote: 'No setup fees, no per-user charges',
      salesosTotal: '$0 upfront, pay only on success',
      winner: 'salesos'
    },
    {
      scenario: '50-person sales team with automation',
      salesforce: '$165/user × 50 = $8,250/month (Unlimited)',
      salesforceNote: '+ $75/user Einstein + $100k implementation',
      salesforceTotal: '$12,000/month + $100k setup',
      salesos: '2.5% of closed revenue',
      salesosNote: 'All AI features included',
      salesosTotal: '$0 upfront, AI included',
      winner: 'salesos'
    },
  ];

  return (
    <>
      <SEO
        title="SalesOS vs Salesforce: Why Teams Are Switching in 2026"
        description="Compare SalesOS vs Salesforce. 15-minute setup vs 6-month implementation. Native AI vs expensive add-ons. Outcome pricing vs per-seat fees. See why sales teams are switching."
        keywords="SalesOS vs Salesforce, Salesforce alternative, replace Salesforce, modern CRM vs Salesforce, fast CRM implementation, Salesforce competitor, better than Salesforce, Salesforce replacement, AI CRM vs Salesforce, why switch from Salesforce"
      />

      <div className="min-h-screen bg-[#F2F1EA] py-20">
        <div className="max-w-7xl mx-auto px-6">

          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm mb-6">
              <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Detailed Comparison</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold text-[#1A1A1A] mb-6">
              SalesOS vs Salesforce:<br />
              <span className="text-[#666]">15 Minutes vs 6 Months</span>
            </h1>

            <p className="text-xl text-[#666] mb-8 leading-relaxed">
              Sales teams are switching from Salesforce to SalesOS because they're tired of:
              6-month implementations, $100k+ setup costs, complex interfaces, and expensive add-ons.
              Here's the complete comparison.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-semibold hover:bg-[#333] transition-colors inline-flex items-center gap-2"
              >
                Try SalesOS Free
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 bg-white text-[#1A1A1A] rounded-full font-semibold border border-black/10 hover:bg-[#F8F8F6] transition-colors"
              >
                Schedule Demo
              </Link>
            </div>

            <p className="text-sm text-[#999] mt-4">
              Migration from Salesforce takes under 1 hour • No credit card required
            </p>
          </div>

          {/* Quick Stats Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="bg-white rounded-3xl p-8 text-center border border-black/5">
              <div className="w-16 h-16 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-[#1A1A1A]" />
              </div>
              <div className="text-4xl font-bold text-[#1A1A1A] mb-2">15 min</div>
              <div className="text-[#666] mb-1">SalesOS Setup Time</div>
              <div className="text-sm text-red-600 font-medium">vs 6+ months (Salesforce)</div>
            </div>

            <div className="bg-white rounded-3xl p-8 text-center border border-black/5">
              <div className="w-16 h-16 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} className="text-[#1A1A1A]" />
              </div>
              <div className="text-4xl font-bold text-[#1A1A1A] mb-2">$0</div>
              <div className="text-[#666] mb-1">Implementation Cost</div>
              <div className="text-sm text-red-600 font-medium">vs $50k-$500k (Salesforce)</div>
            </div>

            <div className="bg-white rounded-3xl p-8 text-center border border-black/5">
              <div className="w-16 h-16 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} className="text-[#1A1A1A]" />
              </div>
              <div className="text-4xl font-bold text-[#1A1A1A] mb-2">High</div>
              <div className="text-[#666] mb-1">Rep Adoption Rate</div>
              <div className="text-sm text-red-600 font-medium">Teams actually use it</div>
            </div>
          </div>

          {/* The Salesforce Problem */}
          <div className="bg-[#1A1A1A] rounded-[32px] p-12 mb-20 text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-center">
              The Salesforce Problem
            </h2>
            <p className="text-white/80 text-center mb-12 max-w-3xl mx-auto text-lg">
              Salesforce was built in 1999. It shows. While it's powerful, it comes with massive overhead
              that modern sales teams shouldn't have to tolerate.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-5xl font-bold text-[#EAD07D] mb-2">6+ months</div>
                <div className="text-white/60 text-sm">Average implementation time</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-[#EAD07D] mb-2">$150k</div>
                <div className="text-white/60 text-sm">Average implementation cost</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-[#EAD07D] mb-2">40+ hrs</div>
                <div className="text-white/60 text-sm">Training required per user</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-[#EAD07D] mb-2">15+</div>
                <div className="text-white/60 text-sm">Add-ons needed for basic AI</div>
              </div>
            </div>
          </div>

          {/* Detailed Feature Comparison */}
          <div className="mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] text-center mb-4">
              Feature-by-Feature Breakdown
            </h2>
            <p className="text-center text-[#666] mb-12 max-w-2xl mx-auto">
              A comprehensive comparison of every major feature. See exactly where SalesOS wins.
            </p>

            <div className="space-y-12">
              {comparisonData.map((category, idx) => (
                <div key={idx} className="bg-white rounded-3xl overflow-hidden border border-black/5">
                  <div className="bg-[#F8F8F6] px-8 py-4 border-b border-black/5">
                    <h3 className="text-xl font-bold text-[#1A1A1A]">{category.category}</h3>
                  </div>

                  <div className="divide-y divide-black/5">
                    {category.features.map((feature, featIdx) => (
                      <div key={featIdx} className="p-6 hover:bg-[#F8F8F6]/50 transition-colors">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                          <div>
                            <div className="font-semibold text-[#1A1A1A] mb-1">{feature.name}</div>
                            <div className="text-sm text-[#666]">{feature.description}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center flex-shrink-0">
                              {feature.winner === 'salesos' || feature.winner === 'tie' ? (
                                <Check size={20} className="text-green-600" />
                              ) : (
                                <X size={20} className="text-red-500" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-[#999] uppercase tracking-wide mb-0.5">SalesOS</div>
                              <div className="font-semibold text-[#1A1A1A]">{feature.salesos}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#F8F8F6] flex items-center justify-center flex-shrink-0">
                              {feature.winner === 'salesforce' || feature.winner === 'tie' ? (
                                <Check size={20} className="text-green-600 opacity-40" />
                              ) : (
                                <X size={20} className="text-red-500 opacity-40" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-[#999] uppercase tracking-wide mb-0.5">Salesforce</div>
                              <div className="font-medium text-[#666]">{feature.salesforce}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Comparison */}
          <div className="mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] text-center mb-4">
              Pricing: The Real Cost Comparison
            </h2>
            <p className="text-center text-[#666] mb-12 max-w-2xl mx-auto">
              Salesforce's pricing looks simple until you add implementation costs, required add-ons,
              admin salaries, and training. Here's the real total cost of ownership.
            </p>

            <div className="space-y-6">
              {pricingComparison.map((scenario, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 border border-black/5">
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">{scenario.scenario}</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Salesforce */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="text-sm font-semibold text-[#666] uppercase tracking-wide">Salesforce</div>
                      </div>
                      <div className="text-2xl font-bold text-[#1A1A1A]">{scenario.salesforce}</div>
                      <div className="text-sm text-[#666]">{scenario.salesforceNote}</div>
                      <div className="pt-4 border-t border-black/10">
                        <div className="text-sm text-[#999] mb-1">Total Year 1 Cost:</div>
                        <div className="text-xl font-bold text-red-600">{scenario.salesforceTotal}</div>
                      </div>
                    </div>

                    {/* SalesOS */}
                    <div className="space-y-3 bg-[#F8F8F6] rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide">SalesOS</div>
                        <div className="px-2 py-0.5 bg-[#EAD07D] rounded text-xs font-bold">WINNER</div>
                      </div>
                      <div className="text-2xl font-bold text-[#1A1A1A]">{scenario.salesos}</div>
                      <div className="text-sm text-[#666]">{scenario.salesosNote}</div>
                      <div className="pt-4 border-t border-black/10">
                        <div className="text-sm text-[#999] mb-1">Total Year 1 Cost:</div>
                        <div className="text-xl font-bold text-green-600">{scenario.salesosTotal}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-[#FFF9E6] border border-[#EAD07D]/30 rounded-2xl p-6">
              <div className="flex gap-4">
                <AlertCircle size={24} className="text-[#EAD07D] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#1A1A1A] mb-1">Hidden Salesforce Costs</div>
                  <ul className="text-sm text-[#666] space-y-1">
                    <li>• Implementation consultants: $50k-$500k+</li>
                    <li>• Einstein AI add-on: +$75/user/month</li>
                    <li>• Full-time Salesforce admin: $120k/year salary</li>
                    <li>• Training programs: $5k-$50k</li>
                    <li>• Data migration: $10k-$100k</li>
                    <li>• Ongoing customization: $50k+/year</li>
                  </ul>
                </div>
              </div>
            </div>

            <PricingDisclaimer />
          </div>

          {/* Why Teams Switch */}
          <div className="mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] text-center mb-4">
              Why Teams Switch from Salesforce
            </h2>
            <p className="text-center text-[#666] mb-12 max-w-2xl mx-auto">
              Common benefits reported by sales teams who migrated from Salesforce to SalesOS.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {switchReasons.map((reason, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 border border-black/5">
                  <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                    <Check size={24} className="text-[#1A1A1A]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">{reason.title}</h3>
                  <p className="text-[#666] leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Migration Guide */}
          <div className="mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] text-center mb-4">
              How to Migrate from Salesforce
            </h2>
            <p className="text-center text-[#666] mb-12 max-w-2xl mx-auto">
              Switching from Salesforce to SalesOS takes less than 1 hour. Here's the complete process.
            </p>

            <div className="bg-white rounded-3xl p-8 border border-black/5">
              <div className="space-y-6">
                {migrationSteps.map((step) => (
                  <div key={step.step} className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-[#EAD07D] flex items-center justify-center flex-shrink-0 font-bold text-[#1A1A1A]">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-[#1A1A1A]">{step.title}</h3>
                        <div className="text-sm text-[#999] flex items-center gap-1">
                          <Clock size={14} />
                          {step.time}
                        </div>
                      </div>
                      <p className="text-[#666]">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-black/10 text-center">
                <div className="text-2xl font-bold text-[#1A1A1A] mb-2">
                  Total Migration Time: ~45 Minutes
                </div>
                <p className="text-[#666] mb-6">
                  vs 6+ months for Salesforce implementation
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-semibold hover:bg-[#333] transition-colors"
                  >
                    Start Migration Now
                    <ArrowRight size={20} />
                  </Link>
                  <Link
                    to="/docs/migration/salesforce-migration"
                    className="inline-flex items-center gap-2 px-8 py-4 border border-black/10 text-[#1A1A1A] rounded-full font-semibold hover:bg-white transition-colors"
                  >
                    View Migration Guide
                    <FileText size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="bg-[#1A1A1A] rounded-[32px] p-12 lg:p-16 text-center text-white">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Ready to Leave Salesforce Behind?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Join the hundreds of sales teams who switched from Salesforce and saw immediate results.
              15-minute setup. No implementation costs. No consultants needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="px-8 py-4 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-bold hover:bg-[#EAD07D]/90 transition-colors inline-flex items-center gap-2"
              >
                Start Free 14-Day Trial
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 bg-white/10 text-white rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-colors"
              >
                Talk to Sales Team
              </Link>
            </div>
            <p className="text-white/60 text-sm mt-6">
              Migration support included • No credit card required • Cancel anytime
            </p>
          </div>

        </div>
      </div>
    </>
  );
};
