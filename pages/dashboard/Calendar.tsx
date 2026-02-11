import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, Clock, MapPin, MoreHorizontal, Calendar as CalendarIcon, Filter, Users, Phone, AlertCircle, X, RefreshCw, Link, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { SearchInput } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCalendarMeetings, useMeetings } from '../../src/hooks';
import { calendarIntegrationsApi, type CalendarConnection } from '../../src/api/integrations';
import type { Meeting, MeetingType, CreateMeetingDto } from '../../src/types';
import { useToast } from '../../src/components/ui/Toast';

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatTimeRange = (start: string, end: string) => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};

const getMeetingColor = (meeting: Meeting) => {
  if (meeting.status === 'CANCELLED') return 'bg-gray-100 text-gray-500';
  if (meeting.accountId || meeting.opportunityId) return 'bg-[#EAD07D]'; // External
  if (meeting.type === 'VIDEO' || meeting.type === 'CALL') return 'bg-[#1A1A1A] text-white';
  return 'bg-white border border-gray-200';
};

const getMeetingTypeIcon = (type: MeetingType) => {
  switch (type) {
    case 'VIDEO': return Video;
    case 'CALL': return Phone;
    case 'IN_PERSON': return MapPin;
    case 'WEBINAR': return Users;
    default: return Video;
  }
};

const getDayName = (date: Date) => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const getMonthName = (year: number, month: number) => {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const Calendar: React.FC = () => {
  const { showToast } = useToast();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MeetingType | 'ALL'>('ALL');

  // Calendar sync state
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const { meetingsByDate, stats, loading, error, refetch } = useCalendarMeetings(currentYear, currentMonth);
  const { create, isCreating } = useMeetings();

  // Fetch calendar connections on mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await calendarIntegrationsApi.getConnections();
        if (response.success) {
          setCalendarConnections(response.connections.filter(c => c.status === 'ACTIVE'));
        }
      } catch (err) {
        console.error('Failed to fetch calendar connections:', err);
        showToast({ type: 'error', title: 'Failed to Load Calendar Connections', message: (err as Error).message || 'Please try again' });
      }
    };
    fetchConnections();
  }, []);

  // Handle calendar sync
  const handleCalendarSync = async () => {
    if (calendarConnections.length === 0) {
      setSyncMessage({ type: 'info', text: 'No calendars connected. Go to Integrations to connect your calendar.' });
      setTimeout(() => setSyncMessage(null), 5000);
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      // Sync all active connections
      const syncPromises = calendarConnections.map(conn =>
        calendarIntegrationsApi.triggerSync(conn.id)
      );
      await Promise.all(syncPromises);

      // Refresh calendar data
      await refetch();

      setSyncMessage({ type: 'success', text: `Synced ${calendarConnections.length} calendar${calendarConnections.length > 1 ? 's' : ''} successfully!` });
    } catch (err: any) {
      console.error('Calendar sync failed:', err);
      showToast({ type: 'error', title: 'Calendar Sync Failed', message: (err as Error).message || 'Please try again' });
      setSyncMessage({ type: 'error', text: err.response?.data?.message || 'Failed to sync calendar. Please try again.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // New event form state
  const getDefaultStartTime = () => {
    const date = new Date(currentYear, currentMonth, selectedDay);
    date.setHours(9, 0, 0, 0);
    return date.toISOString().slice(0, 16);
  };

  const getDefaultEndTime = () => {
    const date = new Date(currentYear, currentMonth, selectedDay);
    date.setHours(10, 0, 0, 0);
    return date.toISOString().slice(0, 16);
  };

  const [newEvent, setNewEvent] = useState<Partial<CreateMeetingDto>>({
    title: '',
    type: 'VIDEO',
    startTime: getDefaultStartTime(),
    endTime: getDefaultEndTime(),
    description: '',
    location: '',
  });

  const handleOpenNewEventModal = () => {
    setNewEvent({
      title: '',
      type: 'VIDEO',
      startTime: getDefaultStartTime(),
      endTime: getDefaultEndTime(),
      description: '',
      location: '',
    });
    setShowNewEventModal(true);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;
    try {
      await create({
        title: newEvent.title,
        type: newEvent.type || 'VIDEO',
        startTime: new Date(newEvent.startTime).toISOString(),
        endTime: new Date(newEvent.endTime).toISOString(),
        description: newEvent.description,
        location: newEvent.location,
        meetingLink: newEvent.meetingLink,
      });
      await refetch();
      setShowNewEventModal(false);
      showToast({ type: 'success', title: 'Event Created' });
    } catch (err) {
      console.error('Failed to create event:', err);
      showToast({ type: 'error', title: 'Failed to Create Event', message: (err as Error).message || 'Please try again' });
    }
  };

  // Calculate calendar days
  const days = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const calendarDays = [];

    // Previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({
        date: prevMonthLastDay - i,
        inMonth: false,
        isPast: true,
        events: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const isToday = currentDate.toDateString() === today.toDateString();
      const isPast = currentDate < today && !isToday;

      calendarDays.push({
        date: day,
        inMonth: true,
        isToday,
        isPast,
        events: meetingsByDate[day] || [],
      });
    }

    // Next month days to fill grid
    const remainingDays = 35 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({
        date: i,
        inMonth: false,
        isPast: false,
        events: [],
      });
    }

    return calendarDays;
  }, [currentYear, currentMonth, meetingsByDate, today]);

  const selectedEvents = useMemo(() => {
    let events = meetingsByDate[selectedDay] || [];

    // Apply type filter
    if (typeFilter !== 'ALL') {
      events = events.filter(e => e.type === typeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      events = events.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return events;
  }, [meetingsByDate, selectedDay, searchQuery, typeFilter]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentYear, currentMonth + direction);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
    setSelectedDay(1);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const selectedDate = new Date(currentYear, currentMonth, selectedDay);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-64 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[140px] rounded-[2rem] bg-[#EAD07D]" />
              <Skeleton className="h-[140px] rounded-[2rem] bg-[#1A1A1A]" />
              <Skeleton className="h-[140px] rounded-[2rem]" />
            </div>
            <Skeleton className="h-[600px] rounded-[2rem]" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-[600px] rounded-[2rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Unable to Load Calendar</h2>
          <p className="text-[#666] mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Calendar</h1>
          <div className="flex items-center gap-2 text-[#666]">
            <Clock size={16} /> <span>{getMonthName(currentYear, currentMonth)}</span>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="w-full md:w-64">
            <SearchInput
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                typeFilter !== 'ALL' ? 'bg-[#EAD07D] text-[#1A1A1A]' : 'bg-white text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              <Filter size={18} />
            </button>
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 text-xs font-bold text-[#999] uppercase">Filter by Type</div>
                  {(['ALL', 'VIDEO', 'CALL', 'IN_PERSON', 'WEBINAR'] as const).map((type) => {
                    const labels: Record<string, string> = {
                      ALL: 'All Types',
                      VIDEO: 'Video Call',
                      CALL: 'Phone Call',
                      IN_PERSON: 'In Person',
                      WEBINAR: 'Webinar',
                    };
                    const icons: Record<string, React.ElementType> = {
                      ALL: CalendarIcon,
                      VIDEO: Video,
                      CALL: Phone,
                      IN_PERSON: MapPin,
                      WEBINAR: Users,
                    };
                    const Icon = icons[type];
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setTypeFilter(type);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          typeFilter === type ? 'bg-[#EAD07D]/20 text-[#1A1A1A] font-medium' : 'text-[#666] hover:bg-[#F8F8F6]'
                        }`}
                      >
                        <Icon size={14} />
                        {labels[type]}
                        {typeFilter === type && <CheckCircle2 size={14} className="ml-auto text-[#EAD07D]" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleOpenNewEventModal}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all whitespace-nowrap"
          >
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
                <div className="text-4xl font-medium text-[#1A1A1A]">{stats.totalMeetings}</div>
                <div className="text-sm font-medium text-[#1A1A1A]/60 mt-1">This Month</div>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
            </Card>

            <Card variant="dark" className="flex flex-col justify-between min-h-[140px] group">
              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Meeting Time</span>
                <Clock size={18} className="text-white" />
              </div>
              <div className="z-10">
                <div className="text-4xl font-medium text-white">{stats.totalHours}h</div>
                <div className="text-sm font-medium text-white/60 mt-1">Total Hours</div>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-[#EAD07D]/20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
            </Card>

            <Card variant="default" className="flex flex-col justify-between min-h-[140px] border-gray-100 relative overflow-hidden">
              {/* Diagonal Pattern */}
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 8px)', backgroundSize: '10px 10px' }}></div>

              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-[#666]">External</span>
                <Users size={18} className="text-[#666]" />
              </div>
              <div className="z-10">
                <div className="text-4xl font-medium text-[#1A1A1A]">{stats.externalMeetings}</div>
                <div className="text-sm font-medium text-[#666] mt-1">Client Meetings</div>
              </div>
            </Card>
          </div>

          {/* Main Calendar Grid */}
          <Card padding="lg" className="border-gray-100 min-h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1A1A1A]">{getMonthName(currentYear, currentMonth)}</h2>
              <div className="flex items-center gap-2 bg-[#F8F8F6] p-1 rounded-full">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white shadow-sm transition-all text-[#666]"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 text-sm font-bold text-[#1A1A1A]"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white shadow-sm transition-all text-[#666]"
                >
                  <ChevronRight size={16} />
                </button>
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
                    {day.events?.slice(0, 2).map((ev, idx) => (
                      <div key={idx} className={`h-1.5 rounded-full w-full ${day.date === selectedDay ? 'bg-[#1A1A1A]' : getMeetingColor(ev)}`}></div>
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
              <h3 className="text-xl font-bold text-[#1A1A1A]">{getDayName(selectedDate)}</h3>
              <p className="text-[#666]">{getMonthName(currentYear, currentMonth)}</p>
            </div>

            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h4 className="font-bold text-[#1A1A1A]">Schedule</h4>
              <button
                onClick={handleOpenNewEventModal}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              {selectedEvents.length > 0 ? selectedEvents.map((event) => {
                const TypeIcon = getMeetingTypeIcon(event.type);
                const colorClass = getMeetingColor(event);
                const isDark = colorClass.includes('text-white');

                return (
                  <div key={event.id} className={`p-5 rounded-[1.5rem] transition-transform hover:scale-[1.02] cursor-pointer group ${colorClass} ${isDark ? 'shadow-lg shadow-black/10' : 'shadow-sm border border-black/5'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-bold text-sm leading-tight">{event.title}</h5>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    <div className={`flex items-center gap-2 text-xs ${isDark ? 'opacity-70' : 'text-[#666]'} mb-4 font-medium`}>
                      <Clock size={12} /> {formatTimeRange(event.startTime, event.endTime)}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {event.participants?.slice(0, 3).map((p, i) => (
                          <Avatar
                            key={i}
                            name={p.name}
                            size="sm"
                            border
                            className="w-6 h-6"
                          />
                        ))}
                        {event.participants && event.participants.length > 3 && (
                          <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-white/20' : 'bg-[#F2F1EA]'} flex items-center justify-center text-[10px] font-bold border-2 border-white`}>
                            +{event.participants.length - 3}
                          </div>
                        )}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'opacity-60' : 'text-[#666]'} flex items-center gap-1`}>
                        <TypeIcon size={10} />
                        {event.location || event.meetingLink ? (event.location || 'Online') : event.type}
                      </div>
                    </div>

                    {event.account && (
                      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                        <Badge variant={isDark ? 'outline' : 'yellow'} size="sm">
                          {event.account.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-10 px-4 text-[#999] bg-[#F8F8F6] rounded-[1.5rem] border border-dashed border-gray-200">
                  <CalendarIcon size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="mb-2">No events scheduled</p>
                  <button
                    onClick={handleOpenNewEventModal}
                    className="text-[#EAD07D] font-bold text-sm hover:underline"
                  >
                    Add Event
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Action */}
            <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
              {/* Sync Message */}
              {syncMessage && (
                <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  syncMessage.type === 'success' ? 'bg-[#93C01F]/20 text-[#93C01F]' :
                  syncMessage.type === 'error' ? 'bg-red-100 text-red-600' :
                  'bg-[#EAD07D]/20 text-[#1A1A1A]'
                }`}>
                  {syncMessage.type === 'info' && <Link size={16} />}
                  {syncMessage.type === 'success' && <CalendarIcon size={16} />}
                  {syncMessage.type === 'error' && <AlertCircle size={16} />}
                  {syncMessage.text}
                </div>
              )}

              <button
                onClick={handleCalendarSync}
                disabled={isSyncing}
                className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl font-bold text-sm hover:bg-black transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Sync Calendar
                    {calendarConnections.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                        {calendarConnections.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">New Event</h2>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Meeting with client..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Meeting Type</label>
                <select
                  value={newEvent.type || 'VIDEO'}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as MeetingType })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                >
                  <option value="VIDEO">Video Call</option>
                  <option value="CALL">Phone Call</option>
                  <option value="IN_PERSON">In Person</option>
                  <option value="WEBINAR">Webinar</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startTime || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    value={newEvent.endTime || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Location / Room</label>
                <input
                  type="text"
                  value={newEvent.location || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Conference Room A..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Meeting Link</label>
                <input
                  type="url"
                  value={newEvent.meetingLink || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
                <textarea
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  placeholder="Meeting agenda..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowNewEventModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={isCreating || !newEvent.title || !newEvent.startTime || !newEvent.endTime}
                className="px-6 py-2 text-sm font-medium bg-[#1A1A1A] text-white rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Plus size={16} />
                {isCreating ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
