import { Link } from 'react-router-dom';
import {
  Check, X, TrendingUp, Zap, DollarSign, Users, Clock,
  BarChart, Sparkles, Shield, Brain, Workflow, Target,
  ArrowRight, Star, ChevronRight, Award, Kanban, Phone
} from 'lucide-react';
import { Card } from '../../src/components/ui/Card';

export function VsMonday() {
  return (
    <div className="min-h-screen bg-[#F2F1EA]">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAD07D]/20 text-[#EAD07D] text-sm font-medium mb-6">
            <TrendingUp size={16} />
            Built for Sales vs Adapted for Sales
          </div>

          <h1 className="text-4xl lg:text-6xl font-light text-white mb-6">
            SalesOS vs Monday.com:<br />
            <span className="text-[#EAD07D]">Purpose-Built CRM vs Project Tool</span>
          </h1>

          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-12">
            Monday.com is great for project management. But sales needs more than colorful boards—you need AI, forecasting, and revenue intelligence.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">Built-in</div>
              <div className="text-sm text-white/60 mb-1">vs Monday's No AI</div>
              <div className="text-white font-medium">AI Intelligence</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">$99</div>
              <div className="text-sm text-white/60 mb-1">vs Monday's $99-$249+ (CRM add-on)</div>
              <div className="text-white font-medium">True All-in Cost</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="text-3xl font-light text-[#EAD07D] mb-2">Purpose-Built</div>
              <div className="text-sm text-white/60 mb-1">vs Monday's Generic Boards</div>
              <div className="text-white font-medium">Sales CRM</div>
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

      {/* The Monday Problem */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-4">
              Why Sales Teams Outgrow Monday.com
            </h2>
            <p className="text-lg text-[#666] max-w-3xl mx-auto">
              Monday.com is a visual project management tool trying to be a CRM. Sales teams need specialized features it simply cannot provide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-white border-purple-100">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                <Brain size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Zero AI for Sales</h3>
              <p className="text-sm text-[#666] mb-3">
                No deal intelligence, no forecasting, no predictive analytics. Just colorful boards with manual data entry.
              </p>
              <p className="text-xs text-[#999]">Project management DNA</p>
            </Card>

            <Card className="p-6 bg-white border-purple-100">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                <Phone size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">No Sales Communication</h3>
              <p className="text-sm text-[#666] mb-3">
                No native email, no call tracking, no conversation intelligence. Requires 5+ third-party integrations.
              </p>
              <p className="text-xs text-[#999]">Not built for sales</p>
            </Card>

            <Card className="p-6 bg-white border-purple-100">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                <BarChart size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Basic Reporting Only</h3>
              <p className="text-sm text-[#666] mb-3">
                Cannot do revenue forecasting, pipeline analysis, win/loss analysis, or any advanced sales analytics.
              </p>
              <p className="text-xs text-[#999]">Limited to board views</p>
            </Card>

            <Card className="p-6 bg-white border-purple-100">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                <DollarSign size={24} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Add-On Pricing Trap</h3>
              <p className="text-sm text-[#666] mb-3">
                Monday Sales CRM costs extra. Plus integrations, automations, and seat minimums quickly add up.
              </p>
              <p className="text-xs text-[#999]">Real cost: $99-249+/user</p>
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
              See why dedicated sales CRM beats adapted project management tool
            </p>
          </div>

          <div className="space-y-12">
            {/* Core CRM Capabilities */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Target size={20} className="text-[#1A1A1A]" />
                </div>
                Core CRM Capabilities
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Purpose-Built for Sales"
                  salesos="Yes - every feature designed for revenue teams"
                  monday="No - project management tool adapted for sales"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Contact Management"
                  salesos="Deep contact profiles with AI enrichment"
                  monday="Basic contact storage (board items)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Deal Pipeline"
                  salesos="Intelligent pipeline with AI insights per deal"
                  monday="Visual board columns (manual management)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Activity Tracking"
                  salesos="Auto-logs emails, calls, meetings with AI insights"
                  monday="Manual updates to board items"
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
                AI & Sales Intelligence
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="AI Deal Scoring"
                  salesos="AI analyzes deals, predicts win probability"
                  monday="Not available at all"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Revenue Forecasting"
                  salesos="AI-powered forecasts with 95% accuracy"
                  monday="Manual board summation only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Conversation Intelligence"
                  salesos="Built-in: call recording, transcription, AI coaching"
                  monday="Not available (requires Gong/Chorus)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Email Intelligence"
                  salesos="Sentiment analysis, auto-responses, engagement tracking"
                  monday="Basic email integration via third-party"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Next Best Action"
                  salesos="AI suggests what to do for each deal"
                  monday="Manual task creation"
                  salesosWins={true}
                />
              </div>
            </div>

            {/* Communication & Engagement */}
            <div>
              <h3 className="text-2xl font-medium text-[#1A1A1A] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Phone size={20} className="text-[#1A1A1A]" />
                </div>
                Communication & Engagement
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Native Email Integration"
                  salesos="Built-in Gmail/Outlook sync, auto-logging"
                  monday="Requires third-party apps (Integromat, Zapier)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Call Tracking"
                  salesos="Native call tracking with recording"
                  monday="Not available - requires separate tool"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Meeting Scheduler"
                  salesos="Built-in scheduling with calendar sync"
                  monday="Via third-party integration only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Email Templates"
                  salesos="AI-powered templates with personalization"
                  monday="Basic templates via integrations"
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
                Analytics & Forecasting
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Sales Analytics"
                  salesos="Deep: win rates, cycle times, rep performance, attribution"
                  monday="Basic board metrics and charts only"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Revenue Forecasting"
                  salesos="AI forecasting with scenarios and confidence intervals"
                  monday="Sum of deal values only (no forecasting)"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Pipeline Analysis"
                  salesos="AI identifies bottlenecks, at-risk deals, opportunities"
                  monday="Manual board review"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Custom Dashboards"
                  salesos="Unlimited AI-generated revenue dashboards"
                  monday="Board views and basic charts"
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
                Ease of Use & Flexibility
              </h3>
              <div className="grid gap-4">
                <ComparisonRow
                  feature="Visual Interface"
                  salesos="Modern sales-focused UI with AI guidance"
                  monday="Very visual, colorful boards (strength)"
                  salesosWins={false}
                />
                <ComparisonRow
                  feature="Customization"
                  salesos="Sales-optimized fields and workflows"
                  monday="Highly flexible board customization (strength)"
                  salesosWins={false}
                />
                <ComparisonRow
                  feature="Learning Curve for Sales"
                  salesos="30 minutes - designed for sales teams"
                  monday="2-4 hours - need to adapt project tool for sales"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Mobile Experience"
                  salesos="Full-featured sales mobile app"
                  monday="Good mobile app for board updates"
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
                  feature="Base Price"
                  salesos="$99/user - all sales features included"
                  monday="$99-249/user for Sales CRM add-on"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Seat Minimum"
                  salesos="No minimum seats"
                  monday="3-seat minimum on most plans"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Hidden Costs"
                  salesos="Zero - everything included"
                  monday="Automations ($8/250), integrations, advanced features"
                  salesosWins={true}
                />
                <ComparisonRow
                  feature="Implementation"
                  salesos="$0 - self-service AI-guided setup"
                  monday="Often requires consultant to adapt for sales use"
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
              Monday.com looks affordable until you add what sales teams actually need
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
                  <p className="text-sm text-[#666]">Complete Sales CRM</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-light text-[#1A1A1A] mb-2">$99</div>
                <div className="text-[#666]">per user/month</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Full CRM + AI intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Email & call tracking built-in</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>Conversation intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>AI forecasting & analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>No seat minimums</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-[#93C01F]" />
                  <span>24/7 support</span>
                </div>
              </div>

              <div className="pt-6 border-t border-black/10">
                <div className="text-sm text-[#666] mb-2">Annual Cost (5 users):</div>
                <div className="text-3xl font-light text-[#1A1A1A]">$5,940</div>
                <div className="text-xs text-[#999] mt-1">$99 × 5 users × 12 months</div>
              </div>
            </Card>

            {/* Monday Pricing */}
            <Card className="p-8 bg-gray-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                  <DollarSign size={24} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-[#1A1A1A]">Monday.com</h3>
                  <p className="text-sm text-[#666]">Sales CRM Add-On</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-light text-[#1A1A1A] mb-2">$129</div>
                <div className="text-[#666]">per user/month (Pro + CRM add-on)</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-gray-400" />
                  <span>Monday Pro: $99/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Sales CRM add-on: +$30/user</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>Automations pack: +$8/250 actions</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X size={16} />
                  <span>3-seat minimum required</span>
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
                <div className="text-sm text-[#666] mb-2">Annual Cost (5 users):</div>
                <div className="text-3xl font-light text-red-600">$7,740+</div>
                <div className="text-xs text-[#999] mt-1">
                  $129 × 5 users × 12 months (minimum)
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="inline-block p-6 bg-[#93C01F]/10 border-[#93C01F]/30">
              <div className="flex items-center gap-3">
                <Award size={24} className="text-[#93C01F]" />
                <div className="text-left">
                  <div className="font-semibold text-[#1A1A1A]">Save $1,800 annually</div>
                  <div className="text-sm text-[#666]">Plus get AI, forecasting, and conversation intelligence Monday cannot provide</div>
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
              Teams Who Switched to a Real CRM
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="fill-[#EAD07D] text-[#EAD07D]" />
                ))}
              </div>
              <p className="text-[#666] mb-6 italic">
                "Monday.com worked great for our product team, but sales was a mess. We had to use 4 separate tools just to track emails and calls. SalesOS has everything in one place."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center font-semibold text-[#1A1A1A]">
                  EG
                </div>
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Emma Garcia</div>
                  <div className="text-sm text-[#666]">Head of Sales, TeamSync</div>
                  <div className="text-xs text-[#999]">10-person sales team</div>
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
                "We loved Monday's visual boards but it is a project management tool, not a CRM. No forecasting, no deal scoring, no email tracking. SalesOS gave us everything we were missing."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center font-semibold text-[#1A1A1A]">
                  BS
                </div>
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Brian Sullivan</div>
                  <div className="text-sm text-[#666]">VP Revenue, CloudBridge</div>
                  <div className="text-xs text-[#999]">14-person sales team</div>
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
                "Monday charged us $129/user plus automation fees. SalesOS is $99 and includes AI forecasting that Monday will never have. Easy decision."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center font-semibold text-[#1A1A1A]">
                  NT
                </div>
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Nina Torres</div>
                  <div className="text-sm text-[#666]">CRO, GrowthPath</div>
                  <div className="text-xs text-[#999]">8-person sales team</div>
                </div>
              </div>
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
                Can I migrate my Monday.com data?
              </h3>
              <p className="text-[#666] ml-7">
                Yes! Export your boards from Monday.com, and our AI imports contacts, deals, and activities automatically. Takes about 20-30 minutes. We have migrated dozens of Monday.com sales teams.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                What if I like Monday's visual boards?
              </h3>
              <p className="text-[#666] ml-7">
                SalesOS has visual pipeline views too, but specifically designed for sales (not generic project boards). You get the visual simplicity plus AI intelligence, forecasting, and email/call tracking that Monday lacks.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Can I still use Monday.com for project management?
              </h3>
              <p className="text-[#666] ml-7">
                Absolutely! Many customers use Monday.com for product/project management and SalesOS for sales. We integrate with Monday.com via API so you can sync relevant data between both systems.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <ChevronRight size={20} className="text-[#EAD07D]" />
                Is SalesOS as flexible as Monday.com?
              </h3>
              <p className="text-[#666] ml-7">
                Monday.com wins on generic flexibility because it is a blank canvas. SalesOS is purpose-built for sales, so you get sales-specific features (forecasting, deal scoring, email tracking) without having to configure everything manually. Trade generic flexibility for sales power.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-5xl font-light text-white mb-6">
            Ready for a Real Sales CRM?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Get AI, forecasting, and conversation intelligence Monday.com cannot provide
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
              <span>Free Monday.com migration</span>
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
  monday,
  salesosWins
}: {
  feature: string;
  salesos: string;
  monday: string;
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
            <X size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#999]">{monday}</span>
          </>
        ) : (
          <>
            <Check size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[#666]">{monday}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default VsMonday;
