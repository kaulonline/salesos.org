import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Lock, Globe, Server } from 'lucide-react';

export const Enterprise: React.FC = () => {
  return (
    <PageLayout 
      title="Enterprise" 
      subtitle="Security, scale, and support for global organizations. Run your revenue engine with confidence."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
         <div className="bg-[#1A1A1A] text-white rounded-[2rem] p-10 flex flex-col justify-center">
            <h3 className="text-3xl font-bold mb-6">Enterprise Grade Security</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
               We maintain the highest standards of data privacy and security. SalesOS is SOC2 Type II certified, GDPR compliant, and ISO 27001 ready.
            </p>
            <div className="flex gap-4">
               <div className="bg-white/10 px-4 py-2 rounded-lg font-mono text-sm">SOC2 Type II</div>
               <div className="bg-white/10 px-4 py-2 rounded-lg font-mono text-sm">GDPR</div>
               <div className="bg-white/10 px-4 py-2 rounded-lg font-mono text-sm">ISO 27001</div>
            </div>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[
                 { icon: Lock, title: "SSO & SAML", desc: "Okta, OneLogin, and custom providers." },
                 { icon: Globe, title: "Data Residency", desc: "US, EU, and APAC data regions." },
                 { icon: ShieldCheck, title: "Audit Logs", desc: "Comprehensive activity tracking." },
                 { icon: Server, title: "Dedicated Infra", desc: "Private instances available." }
             ].map((item, i) => (
                 <div key={i} className="bg-white rounded-2xl p-6 border border-black/5 shadow-soft">
                     <item.icon className="w-8 h-8 text-[#EAD07D] mb-4" />
                     <h4 className="font-bold text-[#1A1A1A] mb-2">{item.title}</h4>
                     <p className="text-sm text-[#666]">{item.desc}</p>
                 </div>
             ))}
         </div>
      </div>
      
      <div className="text-center bg-white rounded-[2rem] p-12 border border-black/5 shadow-card">
         <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">Need a custom solution?</h3>
         <p className="text-[#666] mb-8 max-w-2xl mx-auto">Our solutions engineering team can help build custom integrations and workflows for your unique requirements.</p>
         <Button variant="primary" size="lg">Contact Enterprise Sales</Button>
      </div>
    </PageLayout>
  );
};