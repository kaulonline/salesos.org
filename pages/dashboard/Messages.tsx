import React from 'react';
import { Search, Edit, Phone, Video, MoreHorizontal, Send, Paperclip } from 'lucide-react';

const CONVERSATIONS = [
  { id: 1, name: "Katy Fuller", role: "Engineering Lead", time: "2m", unread: 2, online: true, preview: "Can we schedule a sync for tomorrow?" },
  { id: 2, name: "Harry Bender", role: "Head of Design", time: "1h", unread: 0, online: false, preview: "The new mockups are ready for review." },
  { id: 3, name: "Sarah Page", role: "Network Engineer", time: "3h", unread: 0, online: true, preview: "Server maintenance is complete." },
  { id: 4, name: "Billie Wright", role: "Sales Manager", time: "1d", unread: 0, online: false, preview: "Q3 reports are attached." },
  { id: 5, name: "Erica Wyatt", role: "Product Manager", time: "2d", unread: 0, online: false, preview: "Updated roadmap is live." },
];

export const Messages: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] dash-card overflow-hidden flex">
       {/* Sidebar */}
       <div className="w-full md:w-80 border-r border-gray-100 flex flex-col bg-white">
          <div className="p-6 border-b border-gray-100">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-medium text-[#1A1A1A]">Messages</h2>
                <button className="w-8 h-8 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors">
                   <Edit size={14} />
                </button>
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-[#F8F8F6] rounded-full text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]" />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
             {CONVERSATIONS.map((chat) => (
                <div key={chat.id} className={`p-4 flex gap-3 hover:bg-[#F8F8F6] cursor-pointer transition-colors border-l-4 ${chat.id === 1 ? 'bg-[#F8F8F6] border-[#EAD07D]' : 'border-transparent'}`}>
                   <div className="relative">
                      <img src={`https://picsum.photos/50/50?random=${chat.id + 10}`} className="w-12 h-12 rounded-full object-cover" alt={chat.name} />
                      {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                         <h4 className={`text-sm font-bold truncate ${chat.unread > 0 ? 'text-[#1A1A1A]' : 'text-[#666]'}`}>{chat.name}</h4>
                         <span className="text-xs text-[#999]">{chat.time}</span>
                      </div>
                      <p className={`text-xs truncate ${chat.unread > 0 ? 'text-[#1A1A1A] font-medium' : 'text-[#999]'}`}>{chat.preview}</p>
                   </div>
                   {chat.unread > 0 && (
                      <div className="flex flex-col justify-center">
                         <div className="w-5 h-5 bg-[#EAD07D] rounded-full flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">{chat.unread}</div>
                      </div>
                   )}
                </div>
             ))}
          </div>
       </div>

       {/* Chat Area */}
       <div className="flex-1 flex flex-col bg-[#F9F9F9]">
          <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <img src="https://picsum.photos/50/50?random=11" className="w-10 h-10 rounded-full object-cover" alt="Current Chat" />
                <div>
                   <h3 className="font-bold text-[#1A1A1A]">Katy Fuller</h3>
                   <span className="text-xs text-green-600 flex items-center gap-1">● Online</span>
                </div>
             </div>
             <div className="flex gap-2">
                <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#666] hover:bg-[#F2F1EA]"><Phone size={18} /></button>
                <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#666] hover:bg-[#F2F1EA]"><Video size={18} /></button>
                <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#666] hover:bg-[#F2F1EA]"><MoreHorizontal size={18} /></button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <div className="flex justify-center">
                <span className="bg-[#E5E5E5] text-[#666] text-xs px-3 py-1 rounded-full">Today</span>
             </div>
             
             <div className="flex gap-4">
                <img src="https://picsum.photos/50/50?random=11" className="w-8 h-8 rounded-full object-cover self-end" alt="Sender" />
                <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm max-w-md">
                   <p className="text-sm text-[#1A1A1A]">Hi Valentina, I've reviewed the latest designs. They look great!</p>
                </div>
             </div>

             <div className="flex gap-4">
                <img src="https://picsum.photos/50/50?random=11" className="w-8 h-8 rounded-full object-cover self-end" alt="Sender" />
                <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm max-w-md">
                   <p className="text-sm text-[#1A1A1A]">Can we schedule a sync for tomorrow to discuss the next steps for development?</p>
                </div>
             </div>

             <div className="flex gap-4 flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center font-bold text-[#1A1A1A] text-xs self-end">V</div>
                <div className="bg-[#1A1A1A] text-white p-4 rounded-2xl rounded-br-none shadow-sm max-w-md">
                   <p className="text-sm">Absolutely! How does 2 PM sound?</p>
                </div>
             </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100 m-4 rounded-[2rem] shadow-sm flex items-center gap-3">
             <button className="text-[#999] hover:text-[#1A1A1A]"><Paperclip size={20} /></button>
             <input type="text" placeholder="Type a message..." className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400" />
             <button className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] hover:bg-[#E5C973] shadow-md transition-all">
                <Send size={18} className="ml-1" />
             </button>
          </div>
       </div>
    </div>
  );
};