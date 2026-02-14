import { Link } from 'react-router-dom';
import {
  Check, X, TrendingUp, Zap, DollarSign, Users, Clock,
  BarChart, Sparkles, Shield, Brain, Workflow, Target,
  ArrowRight, Star, ChevronRight, Award, AlertCircle
} from 'lucide-react';
import { Card } from '../../src/components/ui/Card';
import { PricingDisclaimer } from '../../src/components/PricingDisclaimer';

export function VsPipedrive() {
  return (
    <div className="min-h-screen bg-[#F2F1EA]">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAD07D]/20 text-[#EAD07D] text-sm font-medium mb-6">
            <TrendingUp size={16} />
            Simple + Powerful vs Just Simple
          </div>

          <h1 className="text-4xl lg:text-6xl font-light text-white mb-6">
            SalesOS vs Pipedrive:<br />
            <span className="text-[#EAD07D]">Enterprise Power, Pipedrive Simplicity</span>
          </h1>

          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-12">
            Get Pipedrive's ease of use plus AI intelligence, forecasting, and revenue analytics they cannot match.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">10x</div>
              <div className="text-sm text-white/60 mb-1">vs Pipedrive's Basic AI</div>
              <div className="text-white font-medium">AI Capabilities</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">2.5%</div>
              <div className="text-sm text-white/60 mb-1">vs Pipedrive's $119+ (Enterprise)</div>
              <div className="text-white font-medium">Pay for Results</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">All-in-One</div>
              <div className="text-sm text-white/60 mb-1">vs Pipedrive's Add-On Model</div>
              <div className="text-white font-medium">Platform</div>
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

      {/* The Pipedrive Problem */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              When Pipedrive is Not Enough
            </h2>
            <p className="text-lg text-[#666] max-w-3xl mx-auto">
              Pipedrive is great for basic pipeline management, but growing teams quickly hit its limitations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-white border-orange-100">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                <Brain size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Limited AI</h3>
              <p className="text-sm text-[#666] mb-3">
                Basic email suggestions only. No deal intelligence, forecasting, or predictive analytics.
              </p>
              <p className="text-xs text-[#999]">Sales Assistant add-on required</p>
            </Card>

            <Card className="p-6 bg-white border-orange-100">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                <BarChart size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Weak Analytics</h3>
              <p className="text-sm text-[#666] mb-3">
                Basic reports only. No revenue forecasting, cohort analysis, or predictive insights for revenue teams.
              </p>
              <p className="text-xs text-[#999]">Advanced analytics missing</p>
            </Card>

            <Card className="p-6 bg-white border-orange-100">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                <DollarSign size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Add-On Costs</h3>
              <p className="text-sm text-[#666] mb-3">
                LeadBooster ($39), Web Visitors ($49), Smart Docs ($29), Projects ($7.50) all cost extra per user.
              </p>
              <p className="text-xs text-[#999]">Real cost: $119-240/user/mo</p>
            </Card>

            <Card className="p-6 bg-white border-orange-100">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">No Conversation Intelligence</h3>
              <p className="text-sm text-[#666] mb-3">
                Cannot record, transcribe, or analyze sales calls. Requires third-party integration.
              </p>
              <p className="text-xs text-[#999]">Critical for coaching</p>
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
              Everything Pipedrive has, plus enterprise features you will need as you grow
            </p>
          </div>

          <div className="space-y-12">
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
                  feature="AI Deal Scoring"
                  salesos="AI analyzes every deal, predicts win probability"
                  pipedrive="Manual deal scoring only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Email Intelligence"
                  salesos="Sentiment analysis, auto-responses, engagement tracking"
                  pipedrive="Basic email templates and tracking"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Revenue Forecasting"
                  salesos="AI-powered forecasts with confidence intervals"
                  pipedrive="Basic pipeline value summation"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Conversation Intelligence"
                  salesos="Built-in call recording, transcription, AI coaching"
                  pipedrive="Not available - requires Gong/Chorus integration"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Ease of Use */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-[#1A1A1A]" />
                </div>
                Ease of Use
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="User Interface"
                  salesos="Modern, intuitive AI-guided interface"
                  pipedrive="Simple visual pipeline (strength of Pipedrive)"
                  salesosWins={false}
                />
                <ComparisonRow
                  feature="Mobile App"
                  salesos="Full-featured iOS/Android apps"
                  pipedrive="Good mobile apps with offline mode"
                  salesosWins={false}
                />
                <ComparisonRow
                  feature="Setup Time"
                  salesos="1 hour with AI-guided setup"
                  pipedrive="2-4 hours manual configuration"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Learning Curve"
                  salesos="Steep for advanced features, AI helps onboard"
                  pipedrive="Very easy for basic use (Pipedrive advantage)"
                  salesosWins={false}
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
                  feature="Revenue Analytics"
                  salesos="Deep revenue analytics, cohort analysis, churn prediction"
                  pipedrive="Basic deal and activity reports"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Custom Dashboards"
                  salesos="Unlimited AI-generated custom dashboards"
                  pipedrive="Limited custom reports (Enterprise only)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Forecasting"
                  salesos="AI forecasting with 95% accuracy"
                  pipedrive="Pipeline weighted value only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Goal Tracking"
                  salesos="Team and individual goals with AI recommendations"
                  pipedrive="Basic goal setting and tracking"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <DollarSign size={20} className="text-[#1A1A1A]" />
                </div>
                Pricing & Value
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Pricing Model"
                  salesos="2.5% of closed deal value - pay for results"
                  pipedrive="$14-$119/user (need Enterprise for key features)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="User Limits"
                  salesos="Unlimited users & seats - no per-user fees"
                  pipedrive="Per-user pricing plus add-ons"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Hidden Add-Ons"
                  salesos="None - all features included"
                  pipedrive="LeadBooster ($39), Web Visitors ($49), Smart Docs ($29)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Contract Flexibility"
                  salesos="Monthly or annual, cancel anytime"
                  pipedrive="Annual discount requires 12-month commitment"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Integrations */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Workflow size={20} className="text-[#1A1A1A]" />
                </div>
                Integrations & Extensions
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Native Integrations"
                  salesos="50+ pre-built, maintained integrations"
                  pipedrive="350+ marketplace apps (quality varies)"
                  salesosWins={false}
                />
                <ComparisonRow
                  feature="Email Integration"
                  salesos="Gmail, Outlook - bi-directional sync"
                  pipedrive="Good email integration (Pipedrive strength)"
                  salesosWins={false}
                />
                <ComparisonRow
                  feature="API Access"
                  salesos="Full REST API, all plans"
                  pipedrive="API limited on lower tiers"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Zapier Actions"
                  salesos="Full Zapier support with advanced triggers"
                  pipedrive="Good Zapier support"
                  salesosWins={false}
                />
              </div>
            </div>

            {/* Enterprise Features */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Shield size={20} className="text-[#1A1A1A]" />
                </div>
                Enterprise & Scale
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Team Hierarchies"
                  salesos="Unlimited hierarchies, territories, role-based access"
                  pipedrive="Basic teams (Enterprise only)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Advanced Permissions"
                  salesos="Granular field-level permissions, all tiers"
                  pipedrive="Limited (Enterprise tier only)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Audit Logs"
                  salesos="Complete audit trail included"
                  pipedrive="Available on Enterprise only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="SLA Support"
                  salesos="24/7 support with <2hr response time"
                  pipedrive="Email support only (phone on Enterprise)"
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
              Pipedrive seems cheaper until you add what you actually need
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
                  <p className="text-sm text-[#666]">All-in-One Platform</p>
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
                  <span>AI deal intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Conversation intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Revenue forecasting</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Advanced analytics</span>
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
                  <span>24/7 support</span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/10">
                <div className="text-sm text-[#666] mb-2">Cost Example:</div>
                <div className="text-3xl font-light text-[#1A1A1A]">$2,500</div>
                <div className="text-xs text-[#999] mt-1">$100K in closed deals = $2,500</div>
              </div>

              <PricingDisclaimer />
            </Card>

            {/* Pipedrive Pricing */}
            <Card className="p-8 bg-gray-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                  <DollarSign size={24} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-[#1A1A1A]">Pipedrive</h3>
                  <p className="text-sm text-[#666]">Enterprise + Add-Ons</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-light text-[#1A1A1A] mb-2">$119</div>
                <div className="text-[#666]">per user/month (Enterprise base)</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-gray-400" />
                  <span>Enterprise tier: $119/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>LeadBooster: +$39/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Web Visitors: +$49/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Smart Docs: +$29/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>No conversation intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Limited AI capabilities</span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/10">
                <div className="text-sm text-[#666] mb-2">Annual Cost (10 users):</div>
                <div className="text-3xl font-light text-red-600">$28,560+</div>
                <div className="text-xs text-[#999] mt-1">
                  $119 + $39 + $49 + $29 = $236/user × 10 × 12
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

      {/* Why Teams Upgrade */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Why Growing Teams Upgrade from Pipedrive
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                <Brain size={24} className="text-[#1A1A1A]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Enterprise AI Features</h3>
              <p className="text-[#666]">
                Growing teams need advanced forecasting, deal intelligence, and conversation analytics that basic pipeline tools do not provide.
              </p>
            </Card>

            <Card className="p-8">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                <DollarSign size={24} className="text-[#1A1A1A]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Transparent Pricing</h3>
              <p className="text-[#666]">
                Teams report frustration with add-on costs accumulating over time. Outcome-based pricing aligns costs with results rather than features.
              </p>
            </Card>

            <Card className="p-8">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                <BarChart size={24} className="text-[#1A1A1A]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Revenue Intelligence</h3>
              <p className="text-[#666]">
                Scaling companies need deeper analytics, predictive insights, and revenue operations capabilities beyond basic reporting.
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
                Is SalesOS as easy to use as Pipedrive?
              </h3>
              <p className="text-[#666] ml-7">
                Pipedrive wins on simplicity for basic pipeline management. SalesOS has more features so there is a slightly steeper learning curve, but our AI-guided onboarding gets your team productive in under an hour. Most teams find the extra power worth the small learning investment.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Can I import my Pipedrive data?
              </h3>
              <p className="text-[#666] ml-7">
                Yes! Our AI automatically maps your Pipedrive fields to SalesOS and imports all your deals, contacts, activities, and custom fields. Most imports complete in under 30 minutes with zero data loss.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                What about Pipedrive's marketplace apps?
              </h3>
              <p className="text-[#666] ml-7">
                SalesOS has 50+ native integrations for the most popular tools. If you use a Pipedrive marketplace app we do not support, we can often build a custom integration or connect via Zapier. Our integration team will work with you during migration.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Do you have a mobile app as good as Pipedrive's?
              </h3>
              <p className="text-[#666] ml-7">
                Yes! Our iOS and Android apps are full-featured and work offline. While Pipedrive has excellent mobile apps (one of their strengths), our apps include AI features like deal scoring and intelligent notifications that Pipedrive cannot match.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-5xl font-light text-white mb-6">
            Ready to Upgrade from Pipedrive?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Keep the simplicity, add enterprise power and AI intelligence
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
              <span>Free Pipedrive migration</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              <span>14-day free trial</span>
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
  pipedrive,
  salesosWins
}: {
  feature: string;
  salesos: string;
  pipedrive: string;
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
            <X size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#999]">{pipedrive}</span>
          </>
        ) : (
          <>
            <Check size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#666]">{pipedrive}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default VsPipedrive;
