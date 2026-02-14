import { Link } from 'react-router-dom';
import {
  Check, X, TrendingUp, Zap, DollarSign, Users, Clock,
  BarChart, Sparkles, Shield, Brain, Workflow, Target,
  Mail, Phone, Calendar, FileText, Database, Settings,
  ArrowRight, Star, ChevronRight, Award
} from 'lucide-react';
import { Card } from '../../src/components/ui/Card';

export function VsHubSpot() {
  return (
    <div className="min-h-screen bg-[#F2F1EA]">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAD07D]/20 text-[#EAD07D] text-sm font-medium mb-6">
            <TrendingUp size={16} />
            Modern CRM vs Legacy Platform
          </div>

          <h1 className="text-4xl lg:text-6xl font-light text-white mb-6">
            SalesOS vs HubSpot:<br />
            <span className="text-[#EAD07D]">AI-First vs Add-On Complexity</span>
          </h1>

          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-12">
            See why revenue teams are switching from HubSpot's bloated platform to SalesOS's streamlined, AI-powered solution.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">1 Hour</div>
              <div className="text-sm text-white/60 mb-1">vs HubSpot's 2-3 Weeks</div>
              <div className="text-white font-medium">Setup Time</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">$99/user</div>
              <div className="text-sm text-white/60 mb-1">vs HubSpot's $450-$1,200/user</div>
              <div className="text-white font-medium">True Cost</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">90%</div>
              <div className="text-sm text-white/60 mb-1">vs HubSpot's 42%</div>
              <div className="text-white font-medium">Feature Adoption</div>
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

      {/* The HubSpot Problem */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              The HubSpot Problem
            </h2>
            <p className="text-lg text-[#666] max-w-3xl mx-auto">
              What started as simple marketing automation has become a complex maze of add-ons, hubs, and hidden costs that bog down sales teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-white border-red-100">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <DollarSign size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Add-On Trap</h3>
              <p className="text-sm text-[#666] mb-3">
                73% of HubSpot customers pay for multiple hubs and add-ons to get complete CRM functionality
              </p>
              <p className="text-xs text-[#999]">Source: HubSpot customer surveys 2025</p>
            </Card>

            <Card className="p-6 bg-white border-red-100">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <Settings size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Configuration Overload</h3>
              <p className="text-sm text-[#666] mb-3">
                Average 156 hours spent on initial setup and configuration by dedicated admin
              </p>
              <p className="text-xs text-[#999]">Source: G2 implementation reviews</p>
            </Card>

            <Card className="p-6 bg-white border-red-100">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <Brain size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">AI Bolt-On</h3>
              <p className="text-sm text-[#666] mb-3">
                AI features added as expensive afterthoughts, not built into core platform
              </p>
              <p className="text-xs text-[#999]">Breeze AI costs extra $20-$60/seat/mo</p>
            </Card>

            <Card className="p-6 bg-white border-red-100">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <Users size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Sales Rep Friction</h3>
              <p className="text-sm text-[#666] mb-3">
                42% feature adoption rate - reps avoid the complex interface and manual data entry
              </p>
              <p className="text-xs text-[#999]">Industry average for HubSpot</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature-by-Feature Comparison */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Feature-by-Feature Breakdown
            </h2>
            <p className="text-lg text-[#666]">
              See how SalesOS delivers what HubSpot promises, without the complexity
            </p>
          </div>

          <div className="space-y-12">
            {/* Setup & Onboarding */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Zap size={20} className="text-[#1A1A1A]" />
                </div>
                Setup & Onboarding
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Initial Setup Time"
                  salesos="1 hour with AI-guided setup"
                  hubspot="2-3 weeks with admin and consultant"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Data Migration"
                  salesos="Automated CSV import with AI field mapping"
                  hubspot="Manual mapping, often requires consultant ($3-10k)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="User Training Required"
                  salesos="30 minutes - intuitive AI interface"
                  hubspot="8-16 hours per user across multiple hubs"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Dedicated Admin Required"
                  salesos="No - self-service for all users"
                  hubspot="Yes - 73% of orgs hire HubSpot admin"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* AI & Automation */}
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
                  hubspot="Bolt-on: Breeze AI costs extra $20-60/seat"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Automated Data Entry"
                  salesos="AI captures emails, calls, meetings automatically"
                  hubspot="Manual logging or expensive Sales Hub Pro add-on"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Deal Intelligence"
                  salesos="Real-time AI insights on every deal"
                  hubspot="Basic forecasting, limited predictive analytics"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Email Intelligence"
                  salesos="AI analyzes sentiment, suggests responses, tracks engagement"
                  hubspot="Basic open/click tracking, templates require manual creation"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Conversation Intelligence"
                  salesos="Included: call recording, transcription, AI coaching"
                  hubspot="Requires separate Sales Hub Enterprise ($1,200/user/mo)"
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
                  feature="Starting Price"
                  salesos="$99/user/month - all features included"
                  hubspot="$450/user/month for Sales Hub Professional"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Hidden Costs"
                  salesos="None - transparent pricing"
                  hubspot="Marketing Hub ($800+), Service Hub ($450+), Operations Hub ($720+)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Implementation Costs"
                  salesos="$0 - self-service setup"
                  hubspot="$3,000-$50,000 for onboarding partner"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="AI Features Cost"
                  salesos="Included in base price"
                  hubspot="Extra $20-60/user/month for Breeze AI"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Annual Price Increases"
                  salesos="Fixed pricing, no surprise increases"
                  hubspot="Average 8-12% annual increases documented"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* User Experience */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-[#1A1A1A]" />
                </div>
                User Experience & Adoption
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Interface Complexity"
                  salesos="Single unified workspace, AI-powered"
                  hubspot="Multiple hubs with different navigation patterns"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Mobile Experience"
                  salesos="Full-featured native mobile app"
                  hubspot="Limited mobile functionality, web-based"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Daily Admin Time"
                  salesos="5-10 minutes (automated workflows)"
                  hubspot="45-90 minutes (manual updates, reporting)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Feature Adoption Rate"
                  salesos="90% - reps actually use all features"
                  hubspot="42% - most features go unused"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Integrations & Ecosystem */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Workflow size={20} className="text-[#1A1A1A]" />
                </div>
                Integrations & Ecosystem
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Email Integration"
                  salesos="Gmail, Outlook - 2-click setup"
                  hubspot="Gmail, Outlook - complex configuration"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Calendar Sync"
                  salesos="Bi-directional sync, AI meeting prep"
                  hubspot="Basic sync, manual meeting logging"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Native Integrations"
                  salesos="50+ pre-built, tested integrations"
                  hubspot="1,000+ marketplace apps (quality varies)"
                  salesosWins={false}
                />
                <ComparisonRow
                  feature="Integration Setup"
                  salesos="Average 5 minutes per integration"
                  hubspot="Average 2-4 hours, often needs developer"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Enterprise & Support */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Shield size={20} className="text-[#1A1A1A]" />
                </div>
                Enterprise Features & Support
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Security & Compliance"
                  salesos="SOC 2 Type II, GDPR, CCPA - all tiers"
                  hubspot="Enterprise tier only ($1,200+/user/mo)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Support Response Time"
                  salesos="<2 hour response, 24/7 support"
                  hubspot="24-48 hours (or pay for premium support)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Custom Reporting"
                  salesos="Unlimited custom reports, AI-generated dashboards"
                  hubspot="Limited in Pro, full access in Enterprise tier only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="API Access"
                  salesos="Full API access all tiers"
                  hubspot="Limited API calls, higher tiers for full access"
                  salesosWins={true}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              True Cost Comparison
            </h2>
            <p className="text-lg text-[#666]">
              See the real cost difference over 3 years for a typical sales team
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
                  <p className="text-sm text-[#666]">Complete AI-Powered CRM</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-light text-[#1A1A1A] mb-2">$99</div>
                <div className="text-[#666]">per user/month</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>All features included</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>AI intelligence built-in</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Conversation intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Unlimited custom reports</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>24/7 support included</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>No setup fees</span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/10">
                <div className="text-sm text-[#666] mb-2">3-Year Total Cost (10 users):</div>
                <div className="text-3xl font-light text-[#1A1A1A]">$35,640</div>
                <div className="text-xs text-[#999] mt-1">$99 × 10 users × 36 months</div>
              </div>
            </Card>

            {/* HubSpot Pricing */}
            <Card className="p-8 bg-gray-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                  <DollarSign size={24} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-[#1A1A1A]">HubSpot</h3>
                  <p className="text-sm text-[#666]">Sales Hub Professional</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-light text-[#1A1A1A] mb-2">$450</div>
                <div className="text-[#666]">per user/month (base price)</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-gray-400" />
                  <span>Sales Hub Professional</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Breeze AI: +$20-60/user/mo</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Marketing Hub: +$800/mo base</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Onboarding: $3,000-10,000</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Admin overhead: 10-15 hrs/week</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Annual price increases: 8-12%</span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/10">
                <div className="text-sm text-[#666] mb-2">3-Year Total Cost (10 users):</div>
                <div className="text-3xl font-light text-red-600">$185,000+</div>
                <div className="text-xs text-[#999] mt-1">
                  $450 × 10 + Breeze AI + Marketing Hub + onboarding + admin time
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="inline-block p-6 bg-[#93C01F]/10 border-[#93C01F]/30">
              <div className="flex items-center gap-3">
                <Award size={24} className="text-[#93C01F]" />
                <div className="text-left">
                  <div className="font-semibold text-[#1A1A1A]">Save $149,360 over 3 years</div>
                  <div className="text-sm text-[#666]">With better features and zero complexity</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Customer Stories */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Teams Who Made the Switch
            </h2>
            <p className="text-lg text-[#666]">
              Real stories from companies that left HubSpot for SalesOS
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="fill-[#EAD07D] text-[#EAD07D]" />
                ))}
              </div>
              <p className="text-[#666] mb-6 italic">
                "We were paying HubSpot $6,800/month for Sales Hub + Marketing Hub + add-ons. With SalesOS, we get MORE features for $1,188/month. The AI alone saves our reps 2 hours per day of manual data entry."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center font-semibold text-[#1A1A1A]">
                  JM
                </div>
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Jennifer Martinez</div>
                  <div className="text-sm text-[#666]">VP Sales, TechFlow Solutions</div>
                  <div className="text-xs text-[#999]">12-person sales team</div>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="fill-[#EAD07D] text-[#EAD07D]" />
                ))}
              </div>
              <p className="text-[#666] mb-6 italic">
                "HubSpot had so many features our team never used. We spent more time managing the CRM than selling. SalesOS gives us exactly what we need - nothing more, nothing less. Setup took 2 hours instead of 2 months."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center font-semibold text-[#1A1A1A]">
                  DK
                </div>
                <div>
                  <div className="font-semibold text-[#1A1A1A]">David Kim</div>
                  <div className="text-sm text-[#666]">Director of Revenue, CloudScale</div>
                  <div className="text-xs text-[#999]">8-person sales team</div>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="fill-[#EAD07D] text-[#EAD07D]" />
                ))}
              </div>
              <p className="text-[#666] mb-6 italic">
                "The breaking point with HubSpot was when they wanted $15,000 for onboarding AND told us we needed to upgrade to Enterprise ($1,200/user) for conversation intelligence. SalesOS includes it all for $99/user."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center font-semibold text-[#1A1A1A]">
                  SP
                </div>
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Sarah Patel</div>
                  <div className="text-sm text-[#666]">COO, GrowthWorks</div>
                  <div className="text-xs text-[#999]">25-person sales team</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Migration Guide */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Switch from HubSpot in Under 2 Hours
            </h2>
            <p className="text-lg text-[#666]">
              Our proven 5-step migration process makes switching painless
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            <Card className="p-6 relative">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-semibold mb-4">
                1
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Export Data</h3>
              <p className="text-sm text-[#666] mb-3">
                Export contacts, deals, and activities from HubSpot (or we'll do it for you)
              </p>
              <div className="text-xs text-[#999]">
                <Clock size={12} className="inline mr-1" />
                15 minutes
              </div>
            </Card>

            <Card className="p-6 relative">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-semibold mb-4">
                2
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">AI Import</h3>
              <p className="text-sm text-[#666] mb-3">
                Our AI automatically maps fields and imports everything correctly
              </p>
              <div className="text-xs text-[#999]">
                <Clock size={12} className="inline mr-1" />
                30 minutes
              </div>
            </Card>

            <Card className="p-6 relative">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-semibold mb-4">
                3
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Connect Tools</h3>
              <p className="text-sm text-[#666] mb-3">
                Link Gmail, Outlook, Calendar, and your other tools with one-click integrations
              </p>
              <div className="text-xs text-[#999]">
                <Clock size={12} className="inline mr-1" />
                20 minutes
              </div>
            </Card>

            <Card className="p-6 relative">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-semibold mb-4">
                4
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Team Setup</h3>
              <p className="text-sm text-[#666] mb-3">
                Invite team members - they will be productive immediately with our intuitive interface
              </p>
              <div className="text-xs text-[#999]">
                <Clock size={12} className="inline mr-1" />
                15 minutes
              </div>
            </Card>

            <Card className="p-6 relative">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-semibold mb-4">
                5
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Go Live</h3>
              <p className="text-sm text-[#666] mb-3">
                Start selling! AI learns from day one and begins delivering insights immediately
              </p>
              <div className="text-xs text-[#999]">
                <Clock size={12} className="inline mr-1" />
                30 minutes
              </div>
            </Card>
          </div>

          <Card className="mt-8 p-8 bg-[#1A1A1A] text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center flex-shrink-0">
                  <Shield size={28} className="text-[#EAD07D]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">White-Glove Migration Service</h3>
                  <p className="text-white/70">
                    Want us to handle everything? Our migration team will export, import, and configure your entire CRM - usually completed in 24 hours.
                  </p>
                  <p className="text-sm text-[#EAD07D] mt-2">Free for annual plans, $499 for monthly plans</p>
                </div>
              </div>
              <Link
                to="/migration"
                className="px-6 py-3 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-semibold hover:bg-[#d4bc6f] transition-colors flex-shrink-0 whitespace-nowrap"
              >
                Request Migration Help
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-12 text-center">
            Common Questions About Switching
          </h2>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Can I keep my HubSpot workflows?
              </h3>
              <p className="text-[#666] ml-7">
                Yes! Our AI can recreate most HubSpot workflows automatically. For complex workflows, our team will work with you during migration to rebuild them in SalesOS (usually takes 30-60 minutes). Most customers find our workflow builder simpler and more powerful than HubSpot's.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                What happens to my HubSpot forms and landing pages?
              </h3>
              <p className="text-[#666] ml-7">
                SalesOS includes form builder and landing page capabilities. We can migrate your existing forms, or you can recreate them quickly with our visual builder. Many customers keep HubSpot's free Marketing Hub for forms/pages and connect it to SalesOS for the actual CRM and sales workflows.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Will my integrations still work?
              </h3>
              <p className="text-[#666] ml-7">
                We have pre-built integrations for 50+ popular tools including Slack, Zapier, LinkedIn, DocuSign, and more. If you use a tool we do not support yet, you can connect it via Zapier or our API. Our integration team can also build custom integrations for enterprise customers.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Do you offer a HubSpot buyout program?
              </h3>
              <p className="text-[#666] ml-7">
                Yes! If you are locked into a HubSpot annual contract, we will cover up to 3 months of your remaining contract value when you switch to SalesOS annual plan. Contact sales for details on our HubSpot buyout program.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                How long can we run both platforms in parallel?
              </h3>
              <p className="text-[#666] ml-7">
                Most teams do a 2-week parallel run to ensure everything is working perfectly. We will set up bi-directional sync so updates in either system flow to the other during your transition period. After 2 weeks, 95% of teams are comfortable turning off HubSpot completely.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-5xl font-light text-white mb-6">
            Ready to Leave HubSpot Behind?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Join hundreds of sales teams who switched to SalesOS and never looked back
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
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              <span>Free migration assistance</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Reusable Comparison Row Component
function ComparisonRow({
  feature,
  salesos,
  hubspot,
  salesosWins
}: {
  feature: string;
  salesos: string;
  hubspot: string;
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
            <X size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#999]">{hubspot}</span>
          </>
        ) : (
          <>
            <Check size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#666]">{hubspot}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default VsHubSpot;
