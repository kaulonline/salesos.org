import { Link } from 'react-router-dom';
import {
  Check, X, TrendingUp, Zap, DollarSign, Users, Clock,
  BarChart, Sparkles, Shield, Brain, Workflow, Target,
  ArrowRight, Star, ChevronRight, Award, Layers, AlertTriangle
} from 'lucide-react';
import { Card } from '../../src/components/ui/Card';
import { PricingDisclaimer } from '../../src/components/PricingDisclaimer';

export function VsZoho() {
  return (
    <div className="min-h-screen bg-[#F2F1EA]">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAD07D]/20 text-[#EAD07D] text-sm font-medium mb-6">
            <TrendingUp size={16} />
            Modern Simplicity vs Legacy Complexity
          </div>

          <h1 className="text-4xl lg:text-6xl font-light text-white mb-6">
            SalesOS vs Zoho CRM:<br />
            <span className="text-[#EAD07D]">Focused Power vs Feature Bloat</span>
          </h1>

          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-12">
            Stop wrestling with Zoho's 45+ modules and confusing interface. Get a modern CRM that actually helps you sell.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">1 Hour</div>
              <div className="text-sm text-white/60 mb-1">vs Zoho's 40+ Hours</div>
              <div className="text-white font-medium">Setup & Training</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">1 Platform</div>
              <div className="text-sm text-white/60 mb-1">vs Zoho's 45+ Apps</div>
              <div className="text-white font-medium">Unified System</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">Higher</div>
              <div className="text-sm text-white/60 mb-1">vs Zoho's Lower Adoption</div>
              <div className="text-white font-medium">User Adoption</div>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="px-8 py-4 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-semibold text-lg hover:bg-[#d4bc6f] transition-colors flex items-center gap-2"
            >
              Start Free Trial <ArrowRight size={20} />
            </Link>
            <Link
              to="/demo"
              className="px-8 py-4 bg-white/10 text-white rounded-full font-semibold text-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              See Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* The Zoho Problem */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Why Teams Leave Zoho
            </h2>
            <p className="text-lg text-[#666] max-w-3xl mx-auto">
              Zoho seems affordable until you account for the hidden costs: time, complexity, and poor user adoption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-white border-yellow-100">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600 mb-4">
                <Layers size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">45+ Disconnected Apps</h3>
              <p className="text-sm text-[#666] mb-3">
                Zoho Books, Zoho Campaigns, Zoho Desk, Zoho Social, Zoho Analytics... each requires separate setup and logins.
              </p>
              <p className="text-xs text-[#999]">Integration nightmare</p>
            </Card>

            <Card className="p-6 bg-white border-yellow-100">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Outdated Interface</h3>
              <p className="text-sm text-[#666] mb-3">
                UI looks and feels like 2010. Confusing navigation, inconsistent design across apps, mobile apps barely functional.
              </p>
              <p className="text-xs text-[#999]">Low adoption rate common</p>
            </Card>

            <Card className="p-6 bg-white border-yellow-100">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600 mb-4">
                <Clock size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Weeks of Configuration</h3>
              <p className="text-sm text-[#666] mb-3">
                Average 40-80 hours of admin time to configure. Most teams hire consultants ($2,000-$15,000) just for setup.
              </p>
              <p className="text-xs text-[#999]">G2 setup time reviews</p>
            </Card>

            <Card className="p-6 bg-white border-yellow-100">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600 mb-4">
                <Brain size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">AI is an Afterthought</h3>
              <p className="text-sm text-[#666] mb-3">
                Zia AI is limited to chatbot and email sentiment. No deal intelligence, forecasting, or coaching capabilities.
              </p>
              <p className="text-xs text-[#999]">Basic AI only</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Feature-by-Feature Breakdown
            </h2>
            <p className="text-lg text-[#666]">
              See why SalesOS delivers better results with less complexity
            </p>
          </div>

          <div className="space-y-12">
            {/* Setup & Usability */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Zap size={20} className="text-[#1A1A1A]" />
                </div>
                Setup & Usability
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Setup Time"
                  salesos="1 hour with AI-guided setup"
                  zoho="40-80 hours, often requires consultant"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="User Interface"
                  salesos="Modern, clean, intuitive 2026 design"
                  zoho="Outdated interface, inconsistent across modules"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Number of Modules"
                  salesos="One unified platform, zero context switching"
                  zoho="45+ separate apps, constant app switching"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Mobile Experience"
                  salesos="Full-featured native apps (iOS/Android)"
                  zoho="Limited mobile functionality, multiple apps needed"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="User Adoption Rate"
                  salesos="Higher adoption - reps love using it"
                  zoho="Lower adoption - features often go unused due to complexity"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* AI & Intelligence */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Brain size={20} className="text-[#1A1A1A]" />
                </div>
                AI & Intelligence
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="AI Architecture"
                  salesos="AI-first: built into every feature"
                  zoho="Zia AI: basic chatbot and email sentiment only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Deal Intelligence"
                  salesos="AI scores deals, predicts win probability, suggests actions"
                  zoho="Manual deal tracking only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Revenue Forecasting"
                  salesos="AI forecasts with 95% accuracy, confidence intervals"
                  zoho="Basic pipeline reports, no predictive analytics"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Conversation Intelligence"
                  salesos="Built-in: call recording, transcription, AI insights"
                  zoho="Not available at all"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Automated Data Entry"
                  salesos="AI captures all activities automatically"
                  zoho="Manual logging required (or email parser for extra $)"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Pricing & Value */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <DollarSign size={20} className="text-[#1A1A1A]" />
                </div>
                Pricing & Total Cost
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Pricing Model"
                  salesos="2.5% of closed deal value - pay for results"
                  zoho="$14-$52/user (need Ultimate for key features)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="User Limits"
                  salesos="Unlimited users & seats - no per-user fees"
                  zoho="Per-user pricing plus add-ons"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="True Cost with Add-Ons"
                  salesos="No add-ons needed - all features included"
                  zoho="$52 + Campaigns ($6) + Analytics ($45) + extra modules"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Implementation Cost"
                  salesos="$0 - self-service setup"
                  zoho="$2,000-$15,000 for consultant setup (typical)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Hidden Costs"
                  salesos="Zero - transparent pricing"
                  zoho="Analytics, Campaigns, advanced features all cost extra"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Support Included"
                  salesos="24/7 support, <2hr response time"
                  zoho="Email only (phone support costs $50-$100/user extra)"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Integration & Ecosystem */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Workflow size={20} className="text-[#1A1A1A]" />
                </div>
                Integration & Ecosystem
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Native Integrations"
                  salesos="50+ pre-built, tested, maintained integrations"
                  zoho="Zoho ecosystem only - limited external integrations"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Email Integration"
                  salesos="Gmail, Outlook - 2-click setup, bi-directional sync"
                  zoho="Complex setup, sync issues common per reviews"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Calendar Sync"
                  salesos="Real-time bi-directional sync, AI meeting prep"
                  zoho="Basic sync, manual meeting logging"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="API Quality"
                  salesos="Modern REST API, comprehensive documentation"
                  zoho="API exists but limited, documentation poor"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Analytics & Reporting */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <BarChart size={20} className="text-[#1A1A1A]" />
                </div>
                Analytics & Reporting
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Built-in Analytics"
                  salesos="Advanced analytics included: cohorts, churn, attribution"
                  zoho="Basic reports - need Zoho Analytics ($45/user extra)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Custom Dashboards"
                  salesos="Unlimited AI-generated dashboards, all users"
                  zoho="Limited dashboards (need Analytics add-on)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Revenue Intelligence"
                  salesos="Deep revenue analytics, pipeline health, deal risk"
                  zoho="Basic pipeline reports only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Report Sharing"
                  salesos="Real-time dashboards, scheduled emails, public links"
                  zoho="Manual export and share"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Support & Reliability */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Shield size={20} className="text-[#1A1A1A]" />
                </div>
                Support & Reliability
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Support Response Time"
                  salesos="<2 hours, 24/7 coverage included"
                  zoho="24-48 hours email only (phone costs extra)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Uptime SLA"
                  salesos="99.9% uptime guarantee"
                  zoho="No SLA on lower tiers, frequent outages reported"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Data Backup"
                  salesos="Automated daily backups, point-in-time restore"
                  zoho="Manual backup required (API export)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Documentation"
                  salesos="Comprehensive docs, video tutorials, interactive guides"
                  zoho="Outdated docs, inconsistent across apps"
                  salesosWins={true}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* True Cost Comparison */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              The Real Cost of Zoho
            </h2>
            <p className="text-lg text-[#666]">
              Zoho's low price looks attractive until you add what you actually need
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* SalesOS Pricing */}
            <Card className="p-8 border-2 border-[#EAD07D]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Target size={24} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-[#1A1A1A]">SalesOS</h3>
                  <p className="text-sm text-[#666]">Complete Platform</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-light text-[#1A1A1A] mb-2">2.5%</div>
                <div className="text-[#666]">of closed deal value</div>
                <div className="text-sm text-[#93C01F] mt-2 font-medium">Only pay when you close deals</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>All features included</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Advanced AI & analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Conversation intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>24/7 premium support</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>No per-user fees</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Unlimited users & seats</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Modern interface</span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/10">
                <div className="text-sm text-[#666] mb-2">Cost Example:</div>
                <div className="text-3xl font-light text-[#1A1A1A]">$2,500</div>
                <div className="text-xs text-[#999] mt-1">$100K in closed deals = $2,500</div>
              </div>

              <PricingDisclaimer />
            </Card>

            {/* Zoho Pricing */}
            <Card className="p-8 bg-gray-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                  <DollarSign size={24} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-[#1A1A1A]">Zoho</h3>
                  <p className="text-sm text-[#666]">Ultimate + Add-Ons</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-light text-[#1A1A1A] mb-2">$52</div>
                <div className="text-[#666]">per user/month (base Ultimate tier)</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-gray-400" />
                  <span>Zoho CRM Ultimate: $52/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Zoho Analytics: +$45/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Zoho Campaigns: +$6/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Setup consultant: +$5,000</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Premium support: +$50/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>No conversation intelligence</span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/10">
                <div className="text-sm text-[#666] mb-2">Annual Total (10 users):</div>
                <div className="text-3xl font-light text-red-600">$23,360</div>
                <div className="text-xs text-[#999] mt-1">
                  ($52 + $45 + $6 + $50) × 10 × 12 + $5k setup
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="inline-block p-6 bg-[#93C01F]/10 border-[#93C01F]/30">
              <div className="flex items-center gap-3">
                <Award size={24} className="text-[#93C01F]" />
                <div className="text-left">
                  <div className="font-semibold text-[#1A1A1A]">Outcome-Based Pricing</div>
                  <div className="text-sm text-[#666]">Only pay for closed deals with unlimited users - no monthly per-seat fees</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Teams Switch */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Why Teams Leave Zoho
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                <Clock size={24} className="text-[#1A1A1A]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Setup Complexity</h3>
              <p className="text-[#666]">
                Teams report spending significant time on configuration and often hiring consultants. Modern CRMs offer faster setup with AI-guided onboarding.
              </p>
            </Card>

            <Card className="p-8">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                <Layers size={24} className="text-[#1A1A1A]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">App Fragmentation</h3>
              <p className="text-[#666]">
                Managing multiple separate apps creates workflow friction. Unified platforms reduce context switching and improve team productivity.
              </p>
            </Card>

            <Card className="p-8">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                <DollarSign size={24} className="text-[#1A1A1A]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Hidden Costs</h3>
              <p className="text-[#666]">
                Low base pricing can be misleading when critical features require expensive add-ons. Transparent pricing models include all features upfront.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-12 text-center">
            Common Questions About Switching
          </h2>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Can I import my Zoho data?
              </h3>
              <p className="text-[#666] ml-7">
                Yes! Export from Zoho CRM (they make this easy), then our AI imports and maps everything automatically. We have migrated hundreds of Zoho customers - usually takes 30-45 minutes total.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                What about all my Zoho apps?
              </h3>
              <p className="text-[#666] ml-7">
                Most Zoho apps you are using just to fill CRM gaps (Analytics, Campaigns, Desk, etc.) - SalesOS includes all that in one platform. For Zoho Books or other specialized apps, we integrate via API or Zapier.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Is SalesOS easier to use than Zoho?
              </h3>
              <p className="text-[#666] ml-7">
                Dramatically easier. Zoho has lower adoption rates due to complexity. SalesOS achieves higher adoption because our modern interface is more intuitive. Minimal training is needed.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                How does outcome-based pricing compare to Zoho's per-user model?
              </h3>
              <p className="text-[#666] ml-7">
                With SalesOS, you only pay 2.5% of closed deal value - no monthly per-user fees. Zoho charges $14-$52/user plus Analytics (+$45), Campaigns (+$6), premium support (+$50), and consultant setup ($5k+). Our model aligns costs with your success, not headcount.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-5xl font-light text-white mb-6">
            Ready to Leave Zoho Behind?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Escape the complexity and get a CRM your team will actually use
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/signup"
              className="px-8 py-4 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-semibold text-lg hover:bg-[#d4bc6f] transition-colors flex items-center gap-2"
            >
              Start Free Trial <ArrowRight size={20} />
            </Link>
            <Link
              to="/demo"
              className="px-8 py-4 bg-white/10 text-white rounded-full font-semibold text-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              See Live Demo
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              <span>Free Zoho migration</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              <span>Setup in 1 hour</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              <span>No credit card required</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ComparisonRow({
  feature,
  salesos,
  zoho,
  salesosWins
}: {
  feature: string;
  salesos: string;
  zoho: string;
  salesosWins: boolean;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-4 items-center p-4 rounded-xl bg-white border border-black/5 hover:border-[#EAD07D]/30 transition-colors">
      <div className="font-medium text-[#1A1A1A]">{feature}</div>
      <div className="flex items-start gap-2">
        <Check size={18} className="text-[#93C01F] flex-shrink-0 mt-0.5" />
        <span className="text-sm text-[#666]">{salesos}</span>
      </div>
      <div className="flex items-start gap-2">
        {salesosWins ? (
          <>
            <X size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#999]">{zoho}</span>
          </>
        ) : (
          <>
            <Check size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#666]">{zoho}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default VsZoho;
