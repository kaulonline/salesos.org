import React, { useState, useEffect } from 'react';
import { UploadCloud, Link as LinkIcon, FileText, CheckCircle2, RefreshCw, Trash2, Database } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

const SOURCES = [
    { id: 1, name: "Sales Playbook 2024.pdf", type: "PDF", size: "2.4 MB", status: "Indexed", lastSync: "2h ago", icon: FileText },
    { id: 2, name: "Pricing_Tiers_v2.csv", type: "CSV", size: "45 KB", status: "Indexed", lastSync: "1d ago", icon: Database },
    { id: 3, name: "Competitor Analysis - Q3", type: "Web", url: "notion.so/competitors...", status: "Syncing...", lastSync: "Just now", icon: LinkIcon },
    { id: 4, name: "Product Technical Docs", type: "Web", url: "docs.salesos.io", status: "Indexed", lastSync: "3d ago", icon: LinkIcon },
];

export const Knowledge: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto">
            <Skeleton className="h-10 w-48 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-[300px] rounded-[2rem] md:col-span-2" />
                <Skeleton className="h-[300px] rounded-[2rem]" />
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Knowledge Base</h1>
                <p className="text-[#666]">The brain of your agents. Upload documents and links to ground their responses.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-black/5">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">System Healthy</span>
                </div>
                <div className="h-4 w-px bg-gray-200"></div>
                <div className="text-xs text-[#666]">
                    <strong>14,203</strong> Vectors Indexed
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content: Sources List */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="min-h-[500px] p-0 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F8F8F6]">
                        <h3 className="font-bold text-[#1A1A1A]">Data Sources</h3>
                        <div className="flex gap-2">
                             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors">
                                <RefreshCw size={12} /> Re-Index All
                             </button>
                        </div>
                    </div>
                    
                    <div className="p-2">
                        {SOURCES.map((source) => (
                            <div key={source.id} className="group flex items-center justify-between p-4 hover:bg-[#F8F8F6] rounded-2xl transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/10 flex items-center justify-center text-[#1A1A1A]">
                                        <source.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#1A1A1A] text-sm mb-0.5">{source.name}</div>
                                        <div className="text-xs text-[#666] flex items-center gap-2">
                                            {source.type} 
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span> 
                                            {source.size || source.url}
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span> 
                                            Last synced {source.lastSync}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={source.status === 'Indexed' ? 'green' : 'yellow'} size="sm" dot>
                                        {source.status}
                                    </Badge>
                                    <button className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Sidebar: Upload & Limits */}
            <div className="space-y-6">
                <Card variant="dark" className="p-8 text-center border-dashed border-2 border-white/20 hover:border-[#EAD07D] transition-colors cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-[#EAD07D] mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Upload Documents</h3>
                    <p className="text-white/60 text-sm mb-6">Drag & drop PDF, CSV, or TXT files here to train your agents.</p>
                    <button className="px-6 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-sm font-bold hover:bg-white transition-colors">
                        Select Files
                    </button>
                </Card>

                <Card className="p-6">
                    <h3 className="font-bold text-[#1A1A1A] mb-4">Storage Usage</h3>
                    <div className="mb-2 flex justify-between text-sm">
                        <span className="text-[#666]">Used</span>
                        <span className="font-bold text-[#1A1A1A]">24%</span>
                    </div>
                    <div className="h-2 w-full bg-[#F2F1EA] rounded-full overflow-hidden mb-6">
                        <div className="h-full bg-[#1A1A1A] w-[24%]"></div>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                             <div className="flex items-center gap-2 text-[#666]">
                                <div className="w-2 h-2 rounded-full bg-[#EAD07D]"></div> PDFs
                             </div>
                             <span className="font-bold">120 MB</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                             <div className="flex items-center gap-2 text-[#666]">
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div> Web Links
                             </div>
                             <span className="font-bold">14 MB</span>
                        </div>
                    </div>
                </Card>

                <div className="bg-[#EAD07D]/10 rounded-[2rem] p-6 border border-[#EAD07D]/20">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] shrink-0 font-bold">!</div>
                        <div>
                            <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">Tip</h4>
                            <p className="text-xs text-[#666] leading-relaxed">
                                Connect your CRM and Email in the <a href="#" className="underline font-bold">Integrations</a> page to allow agents to learn from historical conversations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};