import React from 'react';
import { Plus, Mail, Phone, Calendar } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
      { label: "New Deal", icon: Plus, color: "bg-[#1A1A1A] text-white" },
      { label: "Email", icon: Mail, color: "bg-white text-[#1A1A1A] border border-black/5" },
      { label: "Call", icon: Phone, color: "bg-white text-[#1A1A1A] border border-black/5" },
      { label: "Meeting", icon: Calendar, color: "bg-white text-[#1A1A1A] border border-black/5" },
  ];

  return (
    <div className="bg-[#F8F8F6] p-4 rounded-[2rem] border border-black/5 h-full flex flex-col justify-center">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#999] mb-4 px-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
            {actions.map((action, i) => (
                <button key={i} className={`p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm hover:shadow-md ${action.color} h-20`}>
                    <action.icon size={20} />
                    <span className="text-xs font-bold">{action.label}</span>
                </button>
            ))}
        </div>
        <div className="mt-4 px-2 flex justify-between items-center text-[10px] text-[#999]">
            <span>Press <strong className="font-bold text-[#666]">⌘K</strong> for more</span>
        </div>
    </div>
  );
};