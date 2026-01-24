import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, Clock, MapPin, MoreHorizontal, Calendar as CalendarIcon, Filter, Phone, Users, Coffee, FileText, GripVertical, List } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { SearchInput } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';

// --- Types & Interfaces ---
type ViewMode = 'month' | 'week' | 'agenda';

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  type: 'External' | 'Internal' | 'Personal' | 'Work' | 'Focus';
  location: string;
  attendees: number[];
  color: string;
  icon: React.ElementType;
}

// --- Mock Data Generator ---
const generateMockEvents = (): CalendarEvent[] => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();

  return [
    { id: 1, title: 'Demo with Acme Corp', start: new Date(year, month, date, 9, 30), end: new Date(year, month, date, 10, 30), type: 'External', location: 'Zoom', attendees: [1, 2], color: 'bg-[#EAD07D] text-[#1A1A1A] border-[#EAD07D]', icon: Video },
    { id: 2, title: 'Team Sync', start: new Date(year, month, date, 11, 0), end: new Date(year, month, date, 12, 0), type: 'Internal', location: 'Office', attendees: [3, 4, 5], color: 'bg-[#1A1A1A] text-white border-[#1A1A1A]', icon: Users },
    { id: 3, title: 'Deep Work', start: new Date(year, month, date, 14, 0), end: new Date(year, month, date, 16, 0), type: 'Focus', location: 'Home', attendees: [], color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Coffee },
    { id: 4, title: 'Contract Review', start: new Date(year, month, date + 1, 15, 0), end: new Date(year, month, date + 1, 16, 30), type: 'Work', location: 'Google Meet', attendees: [2], color: 'bg-white text-[#1A1A1A] border-gray-200', icon: FileText },
    { id: 5, title: 'Q3 Planning', start: new Date(year, month, date + 2, 10, 0), end: new Date(year, month, date + 2, 12, 0), type: 'Internal', location: 'Board Room', attendees: [1,2,3,4,5], color: 'bg-[#1A1A1A] text-white border-[#1A1A1A]', icon: Users },
    { id: 6, title: 'Client Dinner', start: new Date(year, month, date + 4, 19, 0), end: new Date(year, month, date + 4, 21, 0), type: 'External', location: 'Nobu', attendees: [1, 6], color: 'bg-[#EAD07D] text-[#1A1A1A] border-[#EAD07D]', icon: MapPin },
    { id: 7, title: 'Discovery Call', start: new Date(year, month, date - 2, 13, 0), end: new Date(year, month, date - 2, 14, 0), type: 'External', location: 'Zoom', attendees: [7], color: 'bg-[#EAD07D] text-[#1A1A1A] border-[#EAD07D]', icon: Phone },
  ];
};

export const Calendar: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
        setEvents(generateMockEvents());
        setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // --- Date Logic Helpers ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const daysArray = [];
    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
        daysArray.push({ date: new Date(year, month, -firstDay + i + 1), isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= days; i++) {
        daysArray.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month padding to fill 42 cells (6 rows * 7 cols)
    const remaining = 42 - daysArray.length;
    for (let i = 1; i <= remaining; i++) {
        daysArray.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return daysArray;
  };

  const getWeekDays = (date: Date) => {
      const curr = new Date(date);
      const first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
      
      const week = [];
      for (let i = 0; i < 7; i++) {
          week.push(new Date(curr.setDate(first + i)));
          // Reset for next iteration calculation (since setDate mutates)
          curr.setDate(curr.getDate()); 
      }
      // Re-calculate to be safe against mutation issues in loop
      const safeWeek = [];
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      for(let i=0; i<7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          safeWeek.push(d);
      }
      return safeWeek;
  };

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() && 
             d1.getMonth() === d2.getMonth() && 
             d1.getFullYear() === d2.getFullYear();
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  // --- Navigation Handlers ---
  const next = () => {
      const newDate = new Date(currentDate);
      if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
      else newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
  };

  const prev = () => {
      const newDate = new Date(currentDate);
      if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, eventId: number) => {
      e.dataTransfer.setData('eventId', eventId.toString());
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
      e.preventDefault();
      const eventId = parseInt(e.dataTransfer.getData('eventId'));
      
      setEvents(prevEvents => prevEvents.map(ev => {
          if (ev.id === eventId) {
              // Calculate new start and end times preserving duration
              const duration = ev.end.getTime() - ev.start.getTime();
              const newStart = new Date(targetDate);
              newStart.setHours(ev.start.getHours(), ev.start.getMinutes());
              const newEnd = new Date(newStart.getTime() + duration);
              return { ...ev, start: newStart, end: newEnd };
          }
          return ev;
      }));
  };

  // --- Formatters ---
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-64 rounded-full" />
                </div>
            </div>
            <Skeleton className="h-[600px] rounded-[2rem]" />
        </div>
      )
  }

  // --- View Renderers ---

  const renderMonthView = () => {
      const days = getDaysInMonth(currentDate);
      return (
          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-50 text-center py-3 text-xs font-bold text-[#999] uppercase tracking-wider">
                    {day}
                </div>
             ))}
             {days.map((dayObj, i) => {
                 const dayEvents = events.filter(e => isSameDay(e.start, dayObj.date));
                 const isDayToday = isToday(dayObj.date);

                 return (
                    <div 
                        key={i} 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dayObj.date)}
                        className={`min-h-[120px] bg-white p-2 transition-colors hover:bg-gray-50 flex flex-col gap-1.5 ${!dayObj.isCurrentMonth ? 'bg-gray-50/50' : ''}`}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isDayToday ? 'bg-[#1A1A1A] text-white' : dayObj.isCurrentMonth ? 'text-[#1A1A1A]' : 'text-gray-300'}`}>
                                {dayObj.date.getDate()}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            {dayEvents.map(ev => (
                                <div 
                                    key={ev.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, ev.id)}
                                    className={`text-[10px] px-2 py-1.5 rounded-md border cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 truncate group ${ev.color}`}
                                >
                                    <ev.icon size={10} className="shrink-0" />
                                    <span className="truncate font-semibold">{ev.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                 );
             })}
          </div>
      );
  };

  const renderWeekView = () => {
      const weekDays = getWeekDays(currentDate);
      return (
          <div className="grid grid-cols-7 gap-3 h-[600px]">
              {weekDays.map((day, i) => {
                  const dayEvents = events.filter(e => isSameDay(e.start, day));
                  const isDayToday = isToday(day);
                  
                  return (
                      <div 
                        key={i} 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                        className={`flex flex-col gap-3 rounded-2xl p-3 border transition-colors h-full overflow-y-auto custom-scrollbar ${isDayToday ? 'bg-white border-[#EAD07D] shadow-sm ring-1 ring-[#EAD07D]/20' : 'bg-[#F8F8F6] border-transparent hover:bg-gray-100'}`}
                      >
                          <div className="text-center pb-2 border-b border-gray-200/50 mb-1">
                              <div className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                              <div className={`text-xl font-medium ${isDayToday ? 'text-[#1A1A1A]' : 'text-[#666]'}`}>{day.getDate()}</div>
                          </div>
                          
                          <div className="flex flex-col gap-2 flex-1">
                              {dayEvents.map(ev => (
                                  <div 
                                      key={ev.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, ev.id)}
                                      className={`p-3 rounded-xl border cursor-grab shadow-sm flex flex-col gap-1.5 ${ev.color} ${ev.type === 'Focus' ? 'h-32' : ''}`}
                                  >
                                      <div className="flex justify-between items-start">
                                          <span className="font-bold text-xs line-clamp-2">{ev.title}</span>
                                          <ev.icon size={12} className="shrink-0 mt-0.5 opacity-70" />
                                      </div>
                                      <div className="text-[10px] opacity-70 flex items-center gap-1">
                                          <Clock size={10} /> 
                                          {ev.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </div>
                                  </div>
                              ))}
                              {dayEvents.length === 0 && (
                                  <div className="flex-1 flex items-center justify-center text-[#999] text-xs opacity-40 italic">
                                      No events
                                  </div>
                              )}
                          </div>
                      </div>
                  )
              })}
          </div>
      );
  };

  const renderAgendaView = () => {
      // Sort events by date
      const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
      
      // Group by Date
      const grouped: {[key: string]: CalendarEvent[]} = {};
      sortedEvents.forEach(ev => {
          const key = ev.start.toDateString();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(ev);
      });

      return (
          <div className="space-y-6 max-w-3xl mx-auto">
              {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([dateStr, dayEvents]) => (
                  <div key={dateStr} className="animate-in slide-in-from-bottom-2">
                      <h3 className="text-sm font-bold text-[#666] uppercase tracking-wider mb-3 pl-4 border-l-2 border-[#EAD07D]">
                          {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h3>
                      <div className="space-y-3">
                          {dayEvents.map(ev => (
                              <div key={ev.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${ev.color.split(' ')[0]} ${ev.color.split(' ')[1]}`}>
                                      <span className="text-xs font-bold">{ev.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-[#1A1A1A]">{ev.title}</h4>
                                      <div className="flex items-center gap-3 text-xs text-[#666] mt-1">
                                          <span className="flex items-center gap-1"><Clock size={12} /> {((ev.end.getTime() - ev.start.getTime()) / (1000 * 60))} min</span>
                                          <span className="flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>
                                          <span className="flex items-center gap-1"><Users size={12} /> {ev.attendees.length} Attendees</span>
                                      </div>
                                  </div>
                                  <button className="p-2 hover:bg-gray-50 rounded-full text-[#999]">
                                      <MoreHorizontal size={16} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )) : (
                <div className="text-center py-20 text-[#666]">No upcoming events found.</div>
              )}
          </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
       {/* Header Controls */}
       <div className="mb-8 flex flex-col lg:flex-row justify-between items-end gap-6">
          <div>
             <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Calendar</h1>
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    <button onClick={prev} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><ChevronLeft size={18} className="text-[#666]" /></button>
                    <button onClick={goToToday} className="px-3 text-sm font-bold text-[#1A1A1A] hover:bg-gray-100 rounded-md py-1 transition-colors">Today</button>
                    <button onClick={next} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><ChevronRight size={18} className="text-[#666]" /></button>
                 </div>
                 <div className="text-lg font-medium text-[#1A1A1A] w-48">
                    {view === 'agenda' ? 'Upcoming Events' : `${currentMonthName} ${currentYear}`}
                 </div>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             {/* View Toggle */}
             <div className="bg-gray-100 p-1 rounded-full flex items-center self-start sm:self-auto">
                {(['month', 'week', 'agenda'] as ViewMode[]).map((m) => (
                    <button 
                        key={m}
                        onClick={() => setView(m)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${view === m ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'}`}
                    >
                        {m}
                    </button>
                ))}
             </div>

             <div className="flex gap-3">
                 <div className="w-full sm:w-64">
                    <SearchInput placeholder="Search events..." />
                 </div>
                 <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#666] hover:text-[#1A1A1A] shadow-sm shrink-0">
                    <Filter size={18} />
                 </button>
                 <button className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all whitespace-nowrap shrink-0">
                    <Plus size={16} /> New Event
                 </button>
             </div>
          </div>
       </div>

       {/* Stats Overview (Only in Month View) */}
       {view === 'month' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card variant="yellow" className="flex flex-col justify-between min-h-[120px] group relative overflow-hidden">
                   <div className="flex justify-between items-start z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/60">Meetings</span>
                      <Video size={18} className="text-[#1A1A1A]" />
                   </div>
                   <div className="z-10">
                      <div className="text-3xl font-medium text-[#1A1A1A]">24</div>
                      <div className="text-sm font-medium text-[#1A1A1A]/60 mt-1">Scheduled this month</div>
                   </div>
                   <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                </Card>

                <Card variant="dark" className="flex flex-col justify-between min-h-[120px] group relative overflow-hidden">
                   <div className="flex justify-between items-start z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/60">Deep Work</span>
                      <Coffee size={18} className="text-white" />
                   </div>
                   <div className="z-10">
                      <div className="text-3xl font-medium text-white">42h</div>
                      <div className="text-sm font-medium text-white/60 mt-1">Focus blocks protected</div>
                   </div>
                   <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-[#EAD07D]/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                </Card>

                <Card variant="default" className="flex flex-col justify-between min-h-[120px] border-gray-100 relative overflow-hidden">
                   <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 8px)', backgroundSize: '10px 10px' }}></div>
                   <div className="flex justify-between items-start z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#666]">Tasks</span>
                      <FileText size={18} className="text-[#666]" />
                   </div>
                   <div className="z-10">
                      <div className="text-3xl font-medium text-[#1A1A1A]">12</div>
                      <div className="text-sm font-medium text-[#666] mt-1">Deadlines upcoming</div>
                   </div>
                </Card>
           </div>
       )}

       {/* Main View Area */}
       <Card padding="lg" className="border-gray-100 min-h-[600px] flex flex-col relative overflow-visible">
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'agenda' && renderAgendaView()}
       </Card>

    </div>
  );
};