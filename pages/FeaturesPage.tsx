import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  BarChart3,
  Globe,
  ShieldCheck,
  Users,
  Bot,
  Calendar,
  Mail,
  Phone,
  Target,
  TrendingUp,
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Play,
  MessageSquare,
  FileText,
  Workflow,
  Clock,
  Shield,
  Database,
  LineChart
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ScrollReveal } from '../components/ui/ScrollReveal';
import { TiltCard } from '../components/ui/TiltCard';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { GradientText } from '../components/ui/GradientText';

const MAIN_FEATURES = [
  {
    id: '1',
    title: 'AI Pipeline Intelligence',
    description: 'Predictive forecasting that analyzes thousands of touchpoints to tell you exactly which deals will close and when. Get real-time insights into deal health, risk factors, and next best actions.',
    icon: Zap,
    gradient: 'from-[#EAD07D]/20 to-transparent',
    highlights: ['Deal scoring', 'Risk alerts', 'Win probability'],
  },
  {
    id: '2',
    title: 'Global Data Enrichment',
    description: 'Instantly enrich lead profiles with verified contact data from 150+ countries. Our data never goes stale with continuous refresh and verification.',
    icon: Globe,
    gradient: 'from-blue-500/10 to-transparent',
    highlights: ['150+ countries', 'Auto-refresh', 'Verified data'],
  },
  {
    id: '3',
    title: 'Automated Outreach',
    description: 'Multi-channel sequences that adapt to prospect behavior in real-time across email, phone, LinkedIn, and SMS. Personalization at scale.',
    icon: Users,
    gradient: 'from-purple-500/10 to-transparent',
    highlights: ['Multi-channel', 'Auto-personalize', 'Smart timing'],
  },
  {
    id: '4',
    title: 'Enterprise Security',
    description: 'SOC2 Type II certified with granular permission controls, SSO, and data residency options. Your data is protected with bank-level encryption.',
    icon: ShieldCheck,
    gradient: 'from-green-500/10 to-transparent',
    highlights: ['SOC2 Type II', 'SSO/SAML', 'Data residency'],
  },
  {
    id: '5',
    title: 'Revenue Analytics',
    description: 'Real-time dashboards and reports that give you complete visibility into your sales performance. Track every metric that matters.',
    icon: BarChart3,
    gradient: 'from-orange-500/10 to-transparent',
    highlights: ['Real-time', 'Custom reports', 'Forecasting'],
  },
  {
    id: '6',
    title: 'AI Sales Assistant',
    description: 'Your personal AI copilot that drafts emails, preps for meetings, and suggests talking points based on prospect context and history.',
    icon: Brain,
    gradient: 'from-pink-500/10 to-transparent',
    highlights: ['Email drafting', 'Meeting prep', 'Smart suggestions'],
  },
];

const DETAILED_FEATURES = [
  {
    category: 'Lead Management',
    icon: Target,
    color: 'bg-[#EAD07D]',
    features: [
      { name: 'Lead Scoring', description: 'AI-powered scoring based on behavior and fit' },
      { name: 'Lead Routing', description: 'Automatic assignment based on rules' },
      { name: 'Duplicate Detection', description: 'Intelligent matching and merging' },
      { name: 'Lead Capture', description: 'Forms, chat, and API integrations' },
    ],
  },
  {
    category: 'Communication',
    icon: MessageSquare,
    color: 'bg-blue-500',
    features: [
      { name: 'Email Tracking', description: 'Opens, clicks, and reply detection' },
      { name: 'Call Recording', description: 'Automatic transcription and analysis' },
      { name: 'SMS Campaigns', description: 'Two-way texting at scale' },
      { name: 'LinkedIn Integration', description: 'Connect and message from SalesOS' },
    ],
  },
  {
    category: 'Automation',
    icon: Workflow,
    color: 'bg-purple-500',
    features: [
      { name: 'Sequences', description: 'Multi-step, multi-channel campaigns' },
      { name: 'Triggers', description: 'Event-based automation rules' },
      { name: 'Tasks', description: 'Auto-generated follow-up reminders' },
      { name: 'Workflows', description: 'Complex business logic automation' },
    ],
  },
  {
    category: 'Analytics',
    icon: LineChart,
    color: 'bg-green-500',
    features: [
      { name: 'Pipeline Reports', description: 'Stage conversion and velocity' },
      { name: 'Rep Performance', description: 'Activity and outcome tracking' },
      { name: 'Forecasting', description: 'AI-powered revenue predictions' },
      { name: 'Custom Dashboards', description: 'Build your own views' },
    ],
  },
];

const QUICK_FEATURES = [
  { icon: Bot, label: 'AI Assistant', description: 'Your 24/7 sales copilot' },
  { icon: Calendar, label: 'Meeting Scheduler', description: 'One-click booking' },
  { icon: Mail, label: 'Email Sequences', description: 'Automated follow-ups' },
  { icon: Phone, label: 'Click-to-Dial', description: 'Call from anywhere' },
  { icon: FileText, label: 'Proposals', description: 'Generate & track' },
  { icon: Clock, label: 'Activity Timeline', description: 'Complete history' },
  { icon: Database, label: 'Data Import', description: 'CSV, API, sync' },
  { icon: Shield, label: 'Role Permissions', description: 'Granular access' },
];

export const FeaturesPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getTransition = (delay: number) => {
    return `transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;
  };

  return (
    <>
    <SEOHead {...SEO_CONFIGS.features} />
    <div className="bg-[#F2F1EA]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background Ambient Blobs */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EAD07D] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-[#D1D1C7] rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[-10%] left-[30%] w-[40%] h-[40%] bg-[#EAD07D] rounded-full mix-blend-multiply filter blur-[128px] opacity-15 animate-blob" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            {/* Frosted Pill */}
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm mb-8 ${getTransition(0)}`}>
              <span className="w-2 h-2 rounded-full bg-[#EAD07D] animate-pulse shadow-[0_0_10px_#EAD07D]" />
              <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Platform Features</span>
            </div>

            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-[#1A1A1A] ${getTransition(0)}`} style={{ transitionDelay: '100ms' }}>
              Everything you need to <br />
              <span className="text-[#666]">close more deals.</span>
            </h1>

            <p className={`text-lg md:text-xl text-[#666] mb-10 max-w-2xl leading-relaxed ${getTransition(0)}`} style={{ transitionDelay: '200ms' }}>
              Replace your fragmented tech stack with a unified platform designed for speed, intelligence, and scale. From first touch to closed-won.
            </p>

            <div className={`flex flex-col sm:flex-row items-start gap-4 ${getTransition(0)}`} style={{ transitionDelay: '300ms' }}>
              <Button variant="primary" size="lg" className="group">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="bg-white/80 backdrop-blur-sm border-white/50 shadow-sm text-[#1A1A1A] hover:bg-white">
                <Play className="mr-2 w-4 h-4" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MAIN_FEATURES.map((feature, index) => (
              <ScrollReveal key={feature.id} animation="fade-up" delay={index * 100}>
                <TiltCard
                  className="group relative bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:shadow-xl hover:border-[#EAD07D]/30 transition-all duration-300 h-full"
                  maxTilt={6}
                  scale={1.02}
                  glare
                  glareMaxOpacity={0.15}
                >
                  {/* Hover Gradient */}
                  <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F7F4] border border-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] group-hover:scale-110 group-hover:bg-[#EAD07D] transition-all duration-300 shadow-sm">
                        <feature.icon size={26} strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{feature.title}</h3>

                    {/* Description */}
                    <p className="text-[#666] leading-relaxed text-[15px] mb-6">{feature.description}</p>

                    {/* Highlights */}
                    <div className="flex flex-wrap gap-2">
                      {feature.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F7F4] text-xs font-medium text-[#1A1A1A]"
                        >
                          <CheckCircle2 size={12} className="text-[#EAD07D]" />
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Features Bar */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">And so much more</h2>
              <p className="text-[#666] text-lg">Every tool your sales team needs, in one place.</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUICK_FEATURES.map((item, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 75}>
                <div className="group bg-[#F8F7F4] hover:bg-[#1A1A1A] rounded-2xl p-5 transition-all duration-300 hover:scale-105 cursor-pointer h-full">
                  <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] mb-4 transition-colors shadow-sm group-hover:scale-110">
                    <item.icon size={20} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-semibold text-[#1A1A1A] group-hover:text-white mb-1 transition-colors">{item.label}</h4>
                  <p className="text-sm text-[#666] group-hover:text-gray-400 transition-colors">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Features by Category */}
      <section className="py-24 bg-[#F2F1EA]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm mb-6">
              <Sparkles size={14} className="text-[#EAD07D]" />
              <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Feature Deep Dive</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6">
              Built for every <span className="text-[#666]">workflow.</span>
            </h2>
            <p className="text-lg text-[#666] max-w-2xl mx-auto">
              From prospecting to closing, every stage of your sales process is covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {DETAILED_FEATURES.map((category) => (
              <div
                key={category.category}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center text-white shadow-lg`}>
                    <category.icon size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-[#1A1A1A]">{category.category}</h3>
                </div>

                <div className="space-y-4">
                  {category.features.map((feature) => (
                    <div key={feature.name} className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F7F4] hover:bg-[#F2F1EA] transition-colors">
                      <CheckCircle2 size={20} className="text-[#EAD07D] mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-[#1A1A1A]">{feature.name}</h4>
                        <p className="text-sm text-[#666]">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-[#1A1A1A] text-white relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50+', label: 'Integrations' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '150+', label: 'Countries' },
              { value: '24/7', label: 'Support' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl md:text-5xl font-bold text-[#EAD07D] mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#F2F1EA] relative overflow-hidden">
        {/* Background Ambient */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6">
            Ready to transform your <span className="text-[#666]">sales process?</span>
          </h2>
          <p className="text-lg text-[#666] mb-10 max-w-2xl mx-auto">
            Join thousands of sales teams who have already made the switch. Start your free trial today and see the difference.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" className="group min-w-[200px]">
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#1A1A1A] rounded-full font-semibold text-sm hover:bg-[#F8F7F4] transition-colors shadow-sm border border-black/5"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};
