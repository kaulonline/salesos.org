import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Video } from 'lucide-react';

const EVENTS = [
  { id: 1, title: 'Demo with Acme Corp', time: '09:30 - 10:30', type: 'demo', color: 'bg-[#EAD07D] text-[#1A1A1A]', day: 14 },
  { id: 2, title: 'Internal Sync', time: '11:00 - 12:00', type: 'internal', color: 'bg-white border border-gray-100', day: 14 },
  { id: 3, title: 'Contract Review', time: '14:00 - 15:00', type: 'deal', color: 'bg-[#1A1A1A] text-white', day: 14 },
  { id: 4, title: 'Lunch with Lead', time: '12:30 - 13:30', type: 'external', color: 'bg-blue-100 text-blue-700', day: 15 },
];

export const Calendar: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
       <div className="mb-8 flex justify-between items-end">
          <h1 className="text-4xl font-medium text-[#1A1A1A]">Calendar</h1>
          <div className="flex gap-2">
             <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white"><ChevronLeft size={18} /></button>
             <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white"><ChevronRight size={18} /></button>
             <button className="px-4 bg-[#1A1A1A] text-white rounded-full text-sm font-bold hover:bg-black flex items-center gap-2 ml-2">
                <Plus size={16} /> New Event
             </button>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Main Calendar View */}
          <div className="lg:col-span-8 dash-card p-8 flex flex-col">
             <div className="grid grid-cols-7 mb-4 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                   <div key={day} className="text-xs font-bold text-[#999] uppercase">{day}</div>
                ))}
             </div>
             <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-2">
                {[...Array(35)].map((_, i) => {
                   const day = i - 2; // Offset for start of month
                   const isCurrentMonth = day > 0 && day <= 30;
                   const isToday = day === 14;
                   
                   return (
                      <div key={i} className={`rounded-2xl p-2 relative group transition-all ${isCurrentMonth ? 'hover:bg-[#F8F8F6] cursor-pointer' : 'opacity-30'}`}>
                         <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#1A1A1A] text-white' : 'text-[#666]'}`}>
                            {day > 0 && day <= 30 ? day : ''}
                         </span>
                         
                         {/* Event Indicators */}
                         {isCurrentMonth && day === 14 && (
                            <div className="mt-2 space-y-1">
                               <div className="w-full h-1.5 bg-[#EAD07D] rounded-full"></div>
                               <div className="w-2/3 h-1.5 bg-[#1A1A1A] rounded-full"></div>
                            </div>
                         )}
                         {isCurrentMonth && day === 15 && (
                             <div className="mt-2 space-y-1">
                               <div className="w-full h-1.5 bg-blue-400 rounded-full"></div>
                             </div>
                         )}
                      </div>
                   )
                })}
             </div>
          </div>

          {/* Agenda View */}
          <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="bg-[#1A1A1A] text-white rounded-[2rem] p-8">
                 <div className="text-6xl font-light mb-2">14</div>
                 <div className="text-xl font-medium opacity-60 mb-8">Wednesday, September</div>
                 
                 <div className="space-y-4">
                    {EVENTS.filter(e => e.day === 14).map((event) => (
                       <div key={event.id} className={`p-4 rounded-xl ${event.color} transition-transform hover:scale-105 cursor-pointer`}>
                          <div className="flex justify-between items-start mb-1">
                             <h4 className="font-bold text-sm">{event.title}</h4>
                             {event.type === 'demo' && <Video size={14} />}
                          </div>
                          <p className="text-xs opacity-70">{event.time}</p>
                       </div>
                    ))}
                 </div>
             </div>

             <div className="flex-1 bg-white rounded-[2rem] p-8 border border-black/5 flex flex-col justify-center items-center text-center">
                 <div className="w-16 h-16 bg-[#F2F1EA] rounded-full flex items-center justify-center text-[#EAD07D] mb-4">
                    <Video size={28} />
                 </div>
                 <h3 className="font-bold text-lg text-[#1A1A1A]">Zoom Integration</h3>
                 <p className="text-sm text-[#666] mt-2 mb-6">Connect your Zoom account to automatically generate meeting links.</p>
                 <button className="px-6 py-2 bg-[#F2F1EA] text-[#1A1A1A] rounded-full text-sm font-bold hover:bg-[#EAD07D] transition-colors">Connect</button>
             </div>
          </div>
       </div>
    </div>
  );
};