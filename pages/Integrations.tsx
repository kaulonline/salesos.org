import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';

const CATEGORIES = ['CRM', 'Communication', 'Data', 'Productivity'];
const INTEGRATIONS = [
    { name: 'Salesforce', cat: 'CRM', desc: 'Two-way sync for leads, contacts, and opportunities.' },
    { name: 'HubSpot', cat: 'CRM', desc: 'Keep your marketing and sales data in perfect harmony.' },
    { name: 'Slack', cat: 'Communication', desc: 'Get real-time alerts for closed deals and hot leads.' },
    { name: 'Gmail', cat: 'Communication', desc: 'Track opens, clicks, and replies directly from your inbox.' },
    { name: 'ZoomInfo', cat: 'Data', desc: 'Enrich contact profiles with firmographic data.' },
    { name: 'LinkedIn', cat: 'Data', desc: 'Import prospects with one click from Sales Navigator.' },
    { name: 'Notion', cat: 'Productivity', desc: 'Embed pipeline views directly into your workspace.' },
    { name: 'Zapier', cat: 'Productivity', desc: 'Connect SalesOS to 5,000+ other apps.' },
];

export const Integrations: React.FC = () => {
  return (
    <PageLayout 
      title="Integrations" 
      subtitle="Connects with the tools you already use. SalesOS fits perfectly into your existing stack."
    >
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <Button variant="primary" size="sm">All</Button>
        {CATEGORIES.map(cat => (
            <Button key={cat} variant="outline" size="sm" className="bg-transparent border-black/10">{cat}</Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS.map((tool) => (
          <div key={tool.name} className="bg-white rounded-2xl p-6 shadow-soft border border-black/5 hover:border-[#EAD07D] transition-colors group">
             <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#F2F1EA] rounded-xl flex items-center justify-center font-bold text-[#1A1A1A] text-xl">
                    {tool.name[0]}
                </div>
                <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] uppercase font-bold text-gray-500 tracking-wider group-hover:bg-[#EAD07D] group-hover:text-[#1A1A1A] transition-colors">{tool.cat}</span>
             </div>
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{tool.name}</h3>
             <p className="text-[#666] text-sm leading-relaxed">{tool.desc}</p>
          </div>
        ))}
      </div>
    </PageLayout>
  );
};