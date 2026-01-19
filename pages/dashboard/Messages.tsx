import React, { useState } from 'react';
import { Search, Edit, Phone, Video, MoreHorizontal, Send, Paperclip } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    time: string;
}

interface Conversation {
    id: number;
    name: string;
    role: string;
    time: string;
    unread: number;
    online: boolean;
    preview: string;
    messages: Message[];
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  { 
      id: 1, 
      name: "Katy Fuller", 
      role: "Engineering Lead", 
      time: "2m", 
      unread: 0, 
      online: true, 
      preview: "Can we schedule a sync for tomorrow?",
      messages: [
          { id: '1', text: "Hi Valentina, I've reviewed the latest designs. They look great!", sender: 'them', time: '10:00 AM' },
          { id: '2', text: "Can we schedule a sync for tomorrow to discuss the next steps for development?", sender: 'them', time: '10:05 AM' },
          { id: '3', text: "Absolutely! How does 2 PM sound?", sender: 'me', time: '10:15 AM' }
      ]
  },
  { 
      id: 2, 
      name: "Harry Bender", 
      role: "Head of Design", 
      time: "1h", 
      unread: 2, 
      online: false, 
      preview: "The new mockups are ready for review.",
      messages: [
          { id: '1', text: "Hey, are the new assets ready?", sender: 'me', time: 'Yesterday' },
          { id: '2', text: "Yes, I just uploaded them to Figma.", sender: 'them', time: '1 hour ago' },
          { id: '3', text: "The new mockups are ready for review.", sender: 'them', time: '1 hour ago' }
      ]
  },
  { 
      id: 3, 
      name: "Sarah Page", 
      role: "Network Engineer", 
      time: "3h", 
      unread: 0, 
      online: true, 
      preview: "Server maintenance is complete.",
      messages: [
          { id: '1', text: "Server maintenance is complete.", sender: 'them', time: '3 hours ago' }
      ]
  },
  { 
      id: 4, 
      name: "Billie Wright", 
      role: "Sales Manager", 
      time: "1d", 
      unread: 0, 
      online: false, 
      preview: "Q3 reports are attached.",
      messages: [
           { id: '1', text: "Here are the Q3 reports.", sender: 'them', time: 'Yesterday' }
      ]
  },
  { 
      id: 5, 
      name: "Erica Wyatt", 
      role: "Product Manager", 
      time: "2d", 
      unread: 0, 
      online: false, 
      preview: "Updated roadmap is live.",
      messages: [
          { id: '1', text: "The updated roadmap is live on Notion.", sender: 'them', time: '2 days ago' }
      ]
  },
];

export const Messages: React.FC = () => {
  const [activeId, setActiveId] = useState<number>(1);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [inputValue, setInputValue] = useState('');

  const activeChat = conversations.find(c => c.id === activeId) || conversations[0];

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim()) return;

      const newMessage: Message = {
          id: Date.now().toString(),
          text: inputValue,
          sender: 'me',
          time: 'Just now'
      };

      const updatedConversations = conversations.map(c => {
          if (c.id === activeId) {
              return {
                  ...c,
                  messages: [...c.messages, newMessage],
                  preview: "You: " + inputValue,
                  time: "Now"
              };
          }
          return c;
      });

      setConversations(updatedConversations);
      setInputValue('');
  };

  const handleConversationClick = (id: number) => {
      setActiveId(id);
      // Mark as read logic could go here
      const updatedConversations = conversations.map(c => {
          if (c.id === id) {
              return { ...c, unread: 0 };
          }
          return c;
      });
      setConversations(updatedConversations);
  };

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
             {conversations.map((chat) => (
                <div 
                    key={chat.id} 
                    onClick={() => handleConversationClick(chat.id)}
                    className={`p-4 flex gap-3 cursor-pointer transition-colors border-l-4 ${activeId === chat.id ? 'bg-[#F8F8F6] border-[#EAD07D]' : 'border-transparent hover:bg-[#F8F8F6]'}`}
                >
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
                <img src={`https://picsum.photos/50/50?random=${activeChat.id + 10}`} className="w-10 h-10 rounded-full object-cover" alt="Current Chat" />
                <div>
                   <h3 className="font-bold text-[#1A1A1A]">{activeChat.name}</h3>
                   {activeChat.online ? (
                       <span className="text-xs text-green-600 flex items-center gap-1">● Online</span>
                   ) : (
                       <span className="text-xs text-gray-400">Offline</span>
                   )}
                </div>
             </div>
             <div className="flex gap-2">
                <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#666] hover:bg-[#F2F1EA]"><Phone size={18} /></button>
                <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#666] hover:bg-[#F2F1EA]"><Video size={18} /></button>
                <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#666] hover:bg-[#F2F1EA]"><MoreHorizontal size={18} /></button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
             <div className="flex justify-center">
                <span className="bg-[#E5E5E5] text-[#666] text-xs px-3 py-1 rounded-full">Today</span>
             </div>
             
             {activeChat.messages.map((msg) => (
                 <div key={msg.id} className={`flex gap-4 ${msg.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                    {msg.sender === 'them' ? (
                        <img src={`https://picsum.photos/50/50?random=${activeChat.id + 10}`} className="w-8 h-8 rounded-full object-cover self-end" alt="Sender" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center font-bold text-[#1A1A1A] text-xs self-end">V</div>
                    )}
                    
                    <div className={`p-4 rounded-2xl shadow-sm max-w-md ${
                        msg.sender === 'me' 
                        ? 'bg-[#1A1A1A] text-white rounded-br-none' 
                        : 'bg-white text-[#1A1A1A] rounded-bl-none'
                    }`}>
                       <p className="text-sm">{msg.text}</p>
                    </div>
                 </div>
             ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 m-4 rounded-[2rem] shadow-sm flex items-center gap-3">
             <button type="button" className="text-[#999] hover:text-[#1A1A1A]"><Paperclip size={20} /></button>
             <input 
                type="text" 
                placeholder="Type a message..." 
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
             />
             <button type="submit" className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] hover:bg-[#E5C973] shadow-md transition-all">
                <Send size={18} className="ml-1" />
             </button>
          </form>
       </div>
    </div>
  );
};