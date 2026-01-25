import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { MapPin, Users, Target, Award } from 'lucide-react';

const TEAM_MEMBERS = [
  {
    name: 'Sarah Chen',
    role: 'CEO & Co-Founder',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    location: 'San Francisco'
  },
  {
    name: 'Michael Torres',
    role: 'CTO & Co-Founder',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400',
    location: 'New York'
  },
  {
    name: 'Emily Watson',
    role: 'VP of Sales',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400',
    location: 'London'
  },
  {
    name: 'David Kim',
    role: 'VP of Engineering',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    location: 'Singapore'
  },
];

const STATS = [
  { value: '2,000+', label: 'Companies', icon: Users },
  { value: '$2B+', label: 'Pipeline Managed', icon: Target },
  { value: '50+', label: 'Countries', icon: MapPin },
  { value: '4.9/5', label: 'Customer Rating', icon: Award },
];

export const About: React.FC = () => {
  return (
    <PageLayout
      title="About Us"
      subtitle="We're on a mission to fix the broken sales model. Less admin, more closing."
    >
      {/* Hero Image Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-20 h-[450px]">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000"
          alt="Team collaboration"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent" />

        {/* Stats overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-center">
                <stat.icon className="w-6 h-6 text-[#EAD07D] mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24 items-center">
         <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD07D]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider mb-6">
              Our Story
            </div>
            <h3 className="text-3xl font-bold text-[#1A1A1A] mb-6">Built by salespeople, for salespeople.</h3>
            <div className="space-y-4 text-[#666] leading-relaxed">
                <p>
                    SalesOS began in 2021 when our founders, frustrated by the bloat and complexity of legacy CRMs, decided to build something better.
                </p>
                <p>
                    We believe that sales software should work for the rep, not the other way around. It should be fast, intuitive, and actually help you sell—rather than just being a database for your manager.
                </p>
                <p>
                    Today, we serve over 2,000 high-growth revenue teams across the globe, processing millions of dollars in pipeline every single day.
                </p>
            </div>
         </div>
         <div className="relative">
           <div className="bg-white p-3 rounded-[2rem] shadow-xl">
             <img
               src="https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&q=80&w=800"
               alt="Sales team collaborating"
               className="rounded-[1.5rem] w-full h-auto"
             />
           </div>
           {/* Floating frosted card */}
           <div className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl p-4 shadow-xl">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-bold text-lg">
                 5Y
               </div>
               <div>
                 <div className="text-sm font-bold text-[#1A1A1A]">Founded in 2021</div>
                 <div className="text-xs text-[#666]">San Francisco, CA</div>
               </div>
             </div>
           </div>
         </div>
      </div>

      {/* Values Section */}
      <div className="mb-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD07D]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider mb-4">
            Our Values
          </div>
          <h3 className="text-3xl font-bold text-[#1A1A1A]">What drives us forward</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Customer Obsessed',
              desc: 'Every feature we build starts with a real customer problem. We listen more than we talk.',
              image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=600'
            },
            {
              title: 'Move Fast',
              desc: 'Speed is our competitive advantage. We ship weekly and iterate based on feedback.',
              image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600'
            },
            {
              title: 'Stay Humble',
              desc: "We're always learning. The best ideas come from anywhere in the organization.",
              image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600'
            },
          ].map((value, i) => (
            <div key={i} className="group relative rounded-[2rem] overflow-hidden h-[380px]">
              {/* Background Image */}
              <img
                src={value.image}
                alt={value.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />

              {/* Frosted Glass Tile - Like Calendar Strip */}
              <div className="absolute bottom-5 left-5 right-5 bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-lg">
                {/* Title */}
                <h4 className="text-xl font-bold text-white mb-2">{value.title}</h4>

                {/* Description */}
                <p className="text-white/80 text-sm leading-relaxed">{value.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAD07D]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider mb-4">
            Leadership
          </div>
          <h3 className="text-3xl font-bold text-[#1A1A1A]">Meet the team</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {TEAM_MEMBERS.map((member, i) => (
                <div key={i} className="group">
                    <div className="relative mb-4 overflow-hidden rounded-2xl">
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full aspect-square object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105"
                        />
                        {/* Frosted location badge */}
                        <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-[#1A1A1A] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MapPin size={12} />
                          {member.location}
                        </div>
                    </div>
                    <h4 className="font-bold text-[#1A1A1A]">{member.name}</h4>
                    <p className="text-sm text-[#666]">{member.role}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Join Our Team Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-[#1A1A1A] p-12 md:p-16">
        {/* Ambient Background Blobs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#EAD07D]/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#EAD07D]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[150px] pointer-events-none" />

        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        {/* Floating Decorative Elements */}
        <div className="absolute top-8 left-8 w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center animate-float">
          <div className="w-8 h-8 rounded-full bg-[#EAD07D]/20 flex items-center justify-center">
            <span className="text-[#EAD07D] text-lg">✦</span>
          </div>
        </div>
        <div className="absolute top-16 right-16 w-16 h-16 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-12 left-20 w-12 h-12 rounded-lg bg-[#EAD07D]/10 backdrop-blur-sm border border-[#EAD07D]/20 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-12 w-24 h-24 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 animate-float" style={{ animationDelay: '0.5s' }} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Frosted Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[#EAD07D] animate-pulse" />
            We're hiring
          </div>

          <h3 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Join our team and help <br />
            <span className="text-[#EAD07D]">shape the future of sales.</span>
          </h3>

          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            We're always looking for talented people who want to change how the world sells. Remote-first, competitive pay, and unlimited growth.
          </p>

          {/* Benefits Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {['Remote-First', 'Equity Package', 'Unlimited PTO', 'Health & Wellness', 'Learning Budget'].map((benefit) => (
              <div key={benefit} className="px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/80 text-sm">
                {benefit}
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <a
            href="/careers"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-semibold text-lg hover:bg-white transition-colors shadow-lg shadow-[#EAD07D]/20"
          >
            View Open Positions
            <span className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center group-hover:bg-[#1A1A1A]/20 transition-colors">
              →
            </span>
          </a>

          {/* Open Roles Count */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border-2 border-[#1A1A1A] flex items-center justify-center text-white/60 text-xs font-medium">
                  {['🎨', '💻', '📈'][i-1]}
                </div>
              ))}
            </div>
            <span className="text-white/50 text-sm">12 open roles across 4 teams</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
