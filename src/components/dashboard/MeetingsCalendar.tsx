import React, { useMemo, useState } from 'react';
import { Video, Phone, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import type { Meeting } from '../../types';

interface MeetingsCalendarProps {
  meetings: Meeting[];
}

export const MeetingsCalendar: React.FC<MeetingsCalendarProps> = ({ meetings }) => {
  // Calendar month state for navigation
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);

  // Calculate displayed month based on offset
  const displayedMonth = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + calendarMonthOffset);
    return date;
  }, [calendarMonthOffset]);

  const currentMonthLabel = displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const prevMonthLabel = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1).toLocaleDateString('en-US', { month: 'long' });
  const nextMonthLabel = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1).toLocaleDateString('en-US', { month: 'long' });

  // Get week dates based on displayed month - first week of the month
  const weekDates = useMemo(() => {
    // Get the first day of the displayed month
    const firstOfMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);

    // Find the Monday of the week containing the first of the month
    const dayOfWeek = firstOfMonth.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(firstOfMonth);
    startOfWeek.setDate(firstOfMonth.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [displayedMonth]);

  // Filter meetings for the displayed week
  const thisWeekMeetings = useMemo(() => {
    if (weekDates.length === 0) return [];

    const startOfWeek = weekDates[0];
    const endOfWeek = new Date(weekDates[weekDates.length - 1]);
    endOfWeek.setHours(23, 59, 59, 999);

    return meetings.filter(m => {
      const meetingDate = new Date(m.startTime);
      return meetingDate >= startOfWeek && meetingDate <= endOfWeek;
    });
  }, [meetings, weekDates]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1A1A1A]">Upcoming Meetings</h3>
        <Link to="/dashboard/calendar" className="text-[#999] hover:text-[#1A1A1A]">
          <ArrowUpRight size={18} />
        </Link>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setCalendarMonthOffset(prev => prev - 1)}
          className="px-4 py-2 bg-[#F0EBD8] rounded-full text-sm font-medium text-[#666] hover:bg-[#EAD07D] transition-all"
        >
          {prevMonthLabel}
        </button>
        <button
          onClick={() => setCalendarMonthOffset(0)}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            calendarMonthOffset === 0
              ? 'bg-[#EAD07D] text-[#1A1A1A]'
              : 'bg-[#F0EBD8] text-[#666] hover:bg-[#EAD07D]'
          }`}
        >
          {currentMonthLabel}
        </button>
        <button
          onClick={() => setCalendarMonthOffset(prev => prev + 1)}
          className="px-4 py-2 bg-[#F0EBD8] rounded-full text-sm font-medium text-[#666] hover:bg-[#EAD07D] transition-all"
        >
          {nextMonthLabel}
        </button>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-4 mb-4">
        <div className="col-span-1"></div>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
          const date = weekDates[i];
          const isToday = date?.toDateString() === new Date().toDateString();
          return (
            <div key={day} className="text-center">
              <p className={`text-sm font-medium ${isToday ? 'text-[#1A1A1A]' : 'text-[#999]'}`}>{day}</p>
              <p className={`text-lg font-medium ${isToday ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'}`}>
                {date?.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time Slots */}
      <div className="space-y-2">
        {['9:00 am', '10:00 am', '11:00 am', '2:00 pm'].map((time, timeIndex) => {
          const hours = [9, 10, 11, 14];
          return (
            <div key={time} className="grid grid-cols-7 gap-4 min-h-[60px]">
              <div className="col-span-1 text-xs text-[#999] pt-2">{time}</div>
              {weekDates.map((date, dayIndex) => {
                const slotMeetings = thisWeekMeetings.filter(m => {
                  const meetingDate = new Date(m.startTime);
                  return (
                    meetingDate.getDate() === date.getDate() &&
                    meetingDate.getMonth() === date.getMonth() &&
                    meetingDate.getHours() === hours[timeIndex]
                  );
                });

                return (
                  <div key={dayIndex} className="col-span-1">
                    {slotMeetings.map(meeting => (
                      <Link
                        key={meeting.id}
                        to="/dashboard/calendar"
                        className="block bg-[#EAD07D]/30 rounded-xl p-2 hover:bg-[#EAD07D]/50 transition-all"
                      >
                        <p className="text-xs font-medium text-[#1A1A1A] truncate">
                          {meeting.title}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {meeting.type === 'VIDEO' ? (
                            <Video size={10} className="text-[#666]" />
                          ) : (
                            <Phone size={10} className="text-[#666]" />
                          )}
                          <span className="text-[10px] text-[#666]">
                            {meeting.account?.name || 'Client Call'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Link
        to="/dashboard/calendar"
        className="mt-4 w-full py-3 text-center text-sm font-medium text-[#666] hover:text-[#1A1A1A] block"
      >
        View Full Calendar →
      </Link>
    </Card>
  );
};
