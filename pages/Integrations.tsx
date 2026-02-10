import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';
import { Plug, ArrowRight, Check } from 'lucide-react';
import { ScrollReveal } from '../components/ui/ScrollReveal';
import { TiltCard } from '../components/ui/TiltCard';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

const CATEGORIES = ['All', 'CRM', 'Communication', 'Data', 'Productivity'];

// Logo.dev API for fetching company logos
const LOGO_DEV_PUBLIC_KEY = 'pk_W2MYKZXiSAS4WfncVJ8b1A';
const getLogoUrl = (domain: string) => `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`;

// Integration data with brand colors and domains for logo lookup
const INTEGRATIONS = [
    { name: 'Salesforce', cat: 'CRM', desc: 'Two-way sync for leads, contacts, and opportunities.', domain: 'salesforce.com', color: '#00A1E0' },
    { name: 'HubSpot', cat: 'CRM', desc: 'Keep your marketing and sales data in perfect harmony.', domain: 'hubspot.com', color: '#FF7A59' },
    { name: 'Slack', cat: 'Communication', desc: 'Get real-time alerts for closed deals and hot leads.', domain: 'slack.com', color: '#4A154B' },
    { name: 'Gmail', cat: 'Communication', desc: 'Track opens, clicks, and replies directly from your inbox.', domain: 'google.com', color: '#EA4335' },
    { name: 'ZoomInfo', cat: 'Data', desc: 'Enrich contact profiles with firmographic data.', domain: 'zoominfo.com', color: '#6366F1' },
    { name: 'LinkedIn', cat: 'Data', desc: 'Import prospects with one click from Sales Navigator.', domain: 'linkedin.com', color: '#0A66C2' },
    { name: 'Notion', cat: 'Productivity', desc: 'Embed pipeline views directly into your workspace.', domain: 'notion.so', color: '#000000' },
    { name: 'Zapier', cat: 'Productivity', desc: 'Connect SalesOS to 5,000+ other apps.', domain: 'zapier.com', color: '#FF4A00' },
    { name: 'Zoom', cat: 'Communication', desc: 'Automatically log meetings and sync recordings.', domain: 'zoom.us', color: '#2D8CFF' },
    { name: 'Outreach', cat: 'Communication', desc: 'Bi-directional sync for sequences and engagement.', domain: 'outreach.io', color: '#5951FF' },
    { name: 'Clearbit', cat: 'Data', desc: 'Real-time enrichment for company and contact data.', domain: 'clearbit.com', color: '#3B82F6' },
    { name: 'Calendly', cat: 'Productivity', desc: 'One-click scheduling links in every email.', domain: 'calendly.com', color: '#006BFF' },
];

// Logo component with proper React state-based fallback using Logo.dev
const IntegrationLogo: React.FC<{ name: string; domain: string; color: string; size?: 'sm' | 'md' }> = ({
  name,
  domain,
  color,
  size = 'md'
}) => {
  const [hasError, setHasError] = useState(false);

  const dimensions = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';
  const padding = size === 'sm' ? 'p-1.5' : 'p-2';
  const textSize = size === 'sm' ? 'text-sm' : 'text-xl';

  if (hasError) {
    return (
      <div
        className={`${dimensions} rounded-xl flex items-center justify-center shadow-lg`}
        style={{ backgroundColor: color }}
      >
        <span className={`text-white font-bold ${textSize}`}>{name[0]}</span>
      </div>
    );
  }

  return (
    <div className={`${dimensions} rounded-xl bg-white border border-black/5 flex items-center justify-center shadow-sm overflow-hidden ${padding}`}>
      <img
        src={getLogoUrl(domain)}
        alt={`${name} logo`}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export const Integrations: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredIntegrations = activeCategory === 'All'
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.cat === activeCategory);

  return (
    <>
    <SEOHead {...SEO_CONFIGS.integrations} />
    <PageLayout
      title="Integrations"
      subtitle="Connects with the tools you already use. SalesOS fits perfectly into your existing stack."
    >
      {/* Hero Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-12 md:mb-16 h-[300px] md:h-[350px]">
        <img
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=2000"
          alt="Connected workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/90 via-[#1A1A1A]/70 to-transparent" />

        <div className="absolute inset-0 flex items-center p-6 md:p-10">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-6">
              <Plug size={14} />
              50+ Integrations
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Connect your entire stack</h2>
            <p className="text-white/70 text-lg mb-6">
              SalesOS integrates with your favorite tools out of the box. No code required.
            </p>
            <div className="flex flex-wrap gap-3">
              {['2-way Sync', 'Real-time', 'No Code'].map(tag => (
                <div key={tag} className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2">
                  <Check size={14} className="text-[#EAD07D]" />
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating integration logos */}
        <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hidden md:block">
          <div className="grid grid-cols-3 gap-2">
            {INTEGRATIONS.slice(0, 6).map((int, i) => (
              <IntegrationLogo key={i} name={int.name} domain={int.domain} color={int.color} size="sm" />
            ))}
          </div>
          <div className="text-white/60 text-xs mt-3 text-center">+44 more</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
              activeCategory === cat
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-white border border-black/10 text-[#666] hover:border-[#EAD07D] hover:text-[#1A1A1A]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
        {filteredIntegrations.map((tool, idx) => (
          <ScrollReveal key={tool.name} animation="fade-up" delay={idx * 75}>
            <TiltCard
              className="group bg-white rounded-2xl p-6 shadow-sm border border-black/5 hover:border-[#EAD07D] hover:shadow-xl transition-all duration-300 h-full"
              maxTilt={6}
              scale={1.02}
              glare
              glareMaxOpacity={0.12}
            >
               <div className="flex items-start justify-between mb-4">
                  <div className="group-hover:scale-110 transition-transform">
                    <IntegrationLogo name={tool.name} domain={tool.domain} color={tool.color} />
                  </div>
                  <span className="px-3 py-1 bg-[#F2F1EA] rounded-full text-[10px] uppercase font-bold text-[#666] tracking-wider group-hover:bg-[#EAD07D] group-hover:text-[#1A1A1A] transition-colors">
                    {tool.cat}
                  </span>
               </div>
               <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{tool.name}</h3>
               <p className="text-[#666] text-sm leading-relaxed mb-4">{tool.desc}</p>
               <button className="text-sm font-medium text-[#1A1A1A] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 Learn more <ArrowRight size={14} />
               </button>
            </TiltCard>
          </ScrollReveal>
        ))}
      </div>

      {/* CTA Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-[#1A1A1A] py-12 md:py-16 px-6 md:px-8">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#EAD07D]/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#EAD07D]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Don't see your tool?</h3>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            We're adding new integrations every week. Let us know what you need and we'll prioritize it.
          </p>
          <Button variant="secondary" className="group">
            Request Integration
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </PageLayout>
    </>
  );
};
