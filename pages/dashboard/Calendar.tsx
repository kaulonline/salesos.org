import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, Clock, MapPin, MoreHorizontal, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { SearchInput } from '../../components/ui/Input';

// Mock Data
const EVENTS = [
  { id: 1, title: 'Demo with Acme Corp', time: '09:30 - 10:30', type: 'External', location: 'Zoom', attendees: [1, 2], color: 'bg-[#EAD07D]', day: 14 },
  { id: 2, title: 'Team Sync', time: '11:00 - 12:00', type: 'Internal', location: 'Office', attendees: [3, 4, 5], color: 'bg-[#1A1A1A] text-white', day: 14 },
  { id: 3, title: 'Lunch Break', time: '12:30 - 13:30', type: 'Personal', location: '-', attendees: [], color: 'bg-gray-100 text-gray-500', day: 14 },
  { id: 4, title: 'Contract Review', time: '15:00 - 16:30', type: 'Work', location: 'Google Meet', attendees: [2], color: 'bg-white border border-gray-200', day: 14 },
  { id: 5, title: 'Q3 Planning', time: '10:00 - 12:00', type: 'Internal', location: 'Board Room', attendees: [1,2,3,4,5], color: 'bg-[#1A1A1A] text-white', day: 15 },
  { id: 6, title: 'Client Dinner', time: '19:00 - 21:00', type: 'External', location: 'Nobu', attendees: [1, 6], color: 'bg-[#EAD07D]', day: 18 },
];

export const Calendar: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(14);
  const [currentMonth, setCurrentMonth] = useState('September 2024');

  // Generate 35 days (5 weeks) for the grid
  const days = Array.from({ length: 35 }, (_, i) => {
    // Sept 1, 2024 is Sunday. Index 0 is Sunday.
    // We'll just map 1-30 directly for simplicity in this view
    const offset = 0; 
    const dayNum = i - offset + 1;
    
    // Previous month days (Aug has 31)
    if (dayNum <= 0) return { date: 31 + dayNum, inMonth: false, isPast: true, events: [] };
    
    // Next month days
    if (dayNum > 30) return { date: dayNum - 30, inMonth: false, isPast: false, events: [] };

    return {
      date: dayNum,
      inMonth: true,
      isToday: dayNum === 14, // Mocking today as the 14th
      isPast: dayNum < 14,
      events: EVENTS.filter(e => e.day === dayNum)
    };
  });

  const selectedEvents = EVENTS.filter(e => e.day === selectedDay);

  return (
    <div className="max-w-7xl mx-auto">
       {/* Header */}
       <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
             <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Calendar</h1>
             <div className="flex items-center gap-2 text-[#666]">
                <Clock size={16} /> <span>{currentMonth}</span>
             </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
             <div className="w-full md:w-64">
                <SearchInput placeholder="Search events..." />
             </div>
             <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#666] hover:text-[#1A1A1A] shadow-sm">
                <Filter size={18} />
             </button>
             <button className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all whitespace-nowrap">
                <Plus size={16} /> New Event
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Calendar Grid */}
          <div className="lg:col-span-8 flex flex-col gap-8">
             
             {/* Stats Pills */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="yellow" className="flex flex-col justify-between min-h-[140px] group">
                   <div className="flex justify-between items-start z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/60">Meetings</span>
                      <Video size={18} className="text-[#1A1A1A]" />
                   </div>
                   <div className="z-10">
                      <div className="text-4xl font-medium text-[#1A1A1A]">24</div>
                      <div className="text-sm font-medium text-[#1A1A1A]/60 mt-1">Scheduled</div>
                   </div>
                   <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                </Card>

                <Card variant="dark" className="flex flex-col justify-between min-h-[140px] group">
                   <div className="flex justify-between items-start z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/60">Deep Work</span>
                      <Clock size={18} className="text-white" />
                   </div>
                   <div className="z-10">
                      <div className="text-4xl font-medium text-white">42h</div>
                      <div className="text-sm font-medium text-white/60 mt-1">Focus Time</div>
                   </div>
                   <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-[#EAD07D]/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                </Card>

                <Card variant="default" className="flex flex-col justify-between min-h-[140px] border-gray-100 relative overflow-hidden">
                   {/* Diagonal Pattern */}
                   <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 8px)', backgroundSize: '10px 10px' }}></div>
                   
                   <div className="flex justify-between items-start z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#666]">Time Off</span>
                      <CalendarIcon size={18} className="text-[#666]" />
                   </div>
                   <div className="z-10">
                      <div className="text-4xl font-medium text-[#1A1A1A]">2d</div>
                      <div className="text-sm font-medium text-[#666] mt-1">Planned</div>
                   </div>
                </Card>
             </div>

             {/* Main Calendar Grid */}
             <Card padding="lg" className="border-gray-100 min-h-[600px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-[#1A1A1A]">{currentMonth}</h2>
                   <div className="flex items-center gap-2 bg-[#F8F8F6] p-1 rounded-full">
                      <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white shadow-sm transition-all text-[#666]"><ChevronLeft size={16} /></button>
                      <button className="px-4 text-sm font-bold text-[#1A1A1A]">Today</button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white shadow-sm transition-all text-[#666]"><ChevronRight size={16} /></button>
                   </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-4">
                   {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-bold text-[#999] uppercase tracking-wider py-2">{day}</div>
                   ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-3 flex-1 auto-rows-fr">
                   {days.map((day, i) => (
                      <div 
                         key={i} 
                         onClick={() => day.inMonth && setSelectedDay(day.date)}
                         className={`
                           relative rounded-2xl p-2 flex flex-col items-start min-h-[100px] transition-all group
                           ${!day.inMonth ? 'bg-[#FAFAFA] text-gray-300 pointer-events-none' : 'cursor-pointer hover:border-black/5'}
                           ${day.inMonth && day.date === selectedDay ? 'bg-[#EAD07D] shadow-md ring-2 ring-[#EAD07D]/20 z-10 scale-[1.02]' : day.inMonth ? 'bg-[#F8F8F6] hover:bg-[#F2F1EA]' : ''}
                         `}
                      >
                         <span className={`text-sm font-bold mb-2 ml-1 ${day.date === selectedDay ? 'text-[#1A1A1A]' : day.inMonth ? 'text-[#1A1A1A]' : 'text-gray-300'}`}>
                            {day.date}
                         </span>

                         {/* Event Dots */}
                         <div className="flex flex-col gap-1 w-full px-1">
                            {day.events?.map((ev, idx) => (
                                idx < 2 && (
                                    <div key={idx} className={`h-1.5 rounded-full w-full ${day.date === selectedDay ? 'bg-[#1A1A1A]' : ev.color}`}></div>
                                )
                            ))}
                            {day.events && day.events.length > 2 && (
                                <div className={`h-1.5 w-1.5 rounded-full ${day.date === selectedDay ? 'bg-[#1A1A1A]' : 'bg-gray-300'} self-end`}></div>
                            )}
                         </div>

                         {day.isToday && day.date !== selectedDay && (
                            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-[#EAD07D] rounded-full"></div>
                         )}
                      </div>
                   ))}
                </div>
             </Card>
          </div>

          {/* Right Column: Schedule/Agenda */}
          <div className="lg:col-span-4 flex flex-col gap-6 sticky top-6">
             <Card padding="lg" className="border-gray-100 relative overflow-hidden min-h-[500px]">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#EAD07D]/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col items-center mb-8 relative z-10">
                   <div className="w-20 h-20 bg-[#F2F1EA] rounded-full flex items-center justify-center text-3xl font-light text-[#1A1A1A] mb-3 shadow-inner border border-white">
                      {selectedDay}
                   </div>
                   <h3 className="text-xl font-bold text-[#1A1A1A]">Wednesday</h3>
                   <p className="text-[#666]">September 2024</p>
                </div>

                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                   <h4 className="font-bold text-[#1A1A1A]">Schedule</h4>
                   <button className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <Plus size={14} />
                   </button>
                </div>

                <div className="space-y-4 relative z-10">
                   {selectedEvents.length > 0 ? selectedEvents.map((event) => (
                      <div key={event.id} className={`p-5 rounded-[1.5rem] transition-transform hover:scale-[1.02] cursor-pointer group ${event.color} ${event.color.includes('bg-[#1A1A1A]') ? 'shadow-lg shadow-black/10 text-white' : 'shadow-sm border border-black/5 text-[#1A1A1A]'}`}>
                         <div className="flex justify-between items-start mb-2">
                            <h5 className="font-bold text-sm leading-tight">{event.title}</h5>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                               <MoreHorizontal size={16} />
                            </button>
                         </div>
                         
                         <div className="flex items-center gap-2 text-xs opacity-70 mb-4 font-medium">
                            <Clock size={12} /> {event.time}
                         </div>

                         <div className="flex items-center justify-between">
                            <div className="flex -space-x-2">
                               {event.attendees.map(i => (
                                  <Avatar key={i} src={`https://picsum.photos/30/30?random=${i}`} size="sm" border className="w-6 h-6" />
                               ))}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                               {event.type === 'External' ? <Video size={10} /> : <MapPin size={10} />}
                               {event.location}
                            </div>
                         </div>
                      </div>
                   )) : (
                      <div className="text-center py-10 px-4 text-[#999] bg-[#F8F8F6] rounded-[1.5rem] border border-dashed border-gray-200">
                         <p className="mb-2">No events scheduled</p>
                         <button className="text-[#EAD07D] font-bold text-sm hover:underline">Add Event</button>
                      </div>
                   )}
                </div>

                {/* Bottom Action */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <button className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl font-bold text-sm hover:bg-black transition-colors shadow-lg">
                        Sync Calendar
                    </button>
                </div>
             </Card>
          </div>
       </div>
    </div>
  );
};