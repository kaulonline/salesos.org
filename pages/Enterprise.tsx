import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Lock, Globe, Server, Building2, Users, Headphones, ArrowRight } from 'lucide-react';

export const Enterprise: React.FC = () => {
  return (
    <PageLayout
      title="Enterprise"
      subtitle="Security, scale, and support for global organizations. Run your revenue engine with confidence."
    >
      {/* Hero Image Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-20 h-[450px]">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000"
          alt="Enterprise Building"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/90 via-[#1A1A1A]/60 to-transparent" />

        <div className="absolute inset-0 flex items-center p-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-6">
              <Building2 size={14} />
              Built for Scale
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Trusted by Fortune 500</h2>
            <p className="text-white/70 text-lg mb-8">
              Enterprise-grade infrastructure that scales with your business. 99.99% uptime guaranteed.
            </p>

            {/* Frosted trust badges */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-sm font-medium">
                SOC2 Type II
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-sm font-medium">
                GDPR Compliant
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-sm font-medium">
                ISO 27001
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-sm font-medium">
                HIPAA Ready
              </div>
            </div>
          </div>
        </div>

        {/* Floating stats */}
        <div className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#EAD07D]">99.99%</div>
              <div className="text-xs text-white/60">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#EAD07D]">500+</div>
              <div className="text-xs text-white/60">Enterprise Clients</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
         <div className="bg-[#1A1A1A] text-white rounded-[2rem] p-10 flex flex-col justify-center relative overflow-hidden">
            {/* Background image with overlay */}
            <img
              src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1000"
              alt="Server Room"
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
            <div className="relative z-10">
              <ShieldCheck className="w-12 h-12 text-[#EAD07D] mb-6" />
              <h3 className="text-3xl font-bold mb-6">Enterprise Grade Security</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                 We maintain the highest standards of data privacy and security. SalesOS is SOC2 Type II certified, GDPR compliant, and ISO 27001 ready.
              </p>
              <div className="flex flex-wrap gap-3">
                 <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg font-mono text-sm border border-white/10">SOC2 Type II</div>
                 <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg font-mono text-sm border border-white/10">GDPR</div>
                 <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg font-mono text-sm border border-white/10">ISO 27001</div>
              </div>
            </div>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[
                 { icon: Lock, title: "SSO & SAML", desc: "Okta, OneLogin, Azure AD, and custom providers supported.", color: "bg-blue-500" },
                 { icon: Globe, title: "Data Residency", desc: "Choose US, EU, or APAC data regions for compliance.", color: "bg-green-500" },
                 { icon: ShieldCheck, title: "Audit Logs", desc: "Comprehensive activity tracking and compliance reports.", color: "bg-purple-500" },
                 { icon: Server, title: "Dedicated Infra", desc: "Private instances with custom SLAs available.", color: "bg-orange-500" }
             ].map((item, i) => (
                 <div key={i} className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:shadow-lg transition-shadow group">
                     <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                       <item.icon size={24} />
                     </div>
                     <h4 className="font-bold text-[#1A1A1A] mb-2">{item.title}</h4>
                     <p className="text-sm text-[#666]">{item.desc}</p>
                 </div>
             ))}
         </div>
      </div>

      {/* Support Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden mb-20">
        <img
          src="https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=2000"
          alt="Support Team"
          className="w-full h-[350px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/90 to-[#1A1A1A]/70" />

        <div className="absolute inset-0 flex items-center justify-between p-10">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-4">
              <Headphones size={14} />
              Dedicated Support
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">White-glove onboarding & support</h2>
            <p className="text-white/70 mb-6">
              Every enterprise customer gets a dedicated success manager, custom onboarding, and 24/7 priority support.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
                  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100',
                ].map((src, i) => (
                  <img key={i} src={src} alt="Support team" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <span className="text-white/70 text-sm">Your dedicated team</span>
            </div>
          </div>

          {/* Frosted card */}
          <div className="hidden md:block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-xs">
            <div className="text-4xl font-bold text-[#EAD07D] mb-2">24/7</div>
            <div className="text-white font-medium mb-4">Priority Support</div>
            <ul className="space-y-2 text-white/70 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EAD07D]" />
                Dedicated Slack channel
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EAD07D]" />
                Phone support
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EAD07D]" />
                {"< 1hr response time"}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-white rounded-[2rem] p-12 border border-black/5 shadow-lg relative overflow-hidden">
         {/* Background pattern */}
         <div className="absolute inset-0 opacity-5">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D] rounded-full blur-3xl" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#EAD07D] rounded-full blur-3xl" />
         </div>

         <div className="relative z-10">
           <Users className="w-12 h-12 text-[#EAD07D] mx-auto mb-6" />
           <h3 className="text-3xl font-bold text-[#1A1A1A] mb-4">Need a custom solution?</h3>
           <p className="text-[#666] mb-8 max-w-2xl mx-auto">Our solutions engineering team can help build custom integrations and workflows for your unique requirements.</p>
           <Button variant="primary" size="lg" className="group">
             Contact Enterprise Sales
             <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </Button>
         </div>
      </div>
    </PageLayout>
  );
};
