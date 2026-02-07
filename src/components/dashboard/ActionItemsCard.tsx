import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  PhoneCall,
  Mail,
  Video,
  FileText,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import type { Task } from '../../types/task';

interface ActionItemsCardProps {
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  onTaskClick: (task: Task) => void;
}

const getTaskIcon = (subject: string) => {
  const lowerSubject = subject.toLowerCase();
  if (lowerSubject.includes('call') || lowerSubject.includes('phone')) return <PhoneCall size={14} />;
  if (lowerSubject.includes('email') || lowerSubject.includes('send')) return <Mail size={14} />;
  if (lowerSubject.includes('meeting') || lowerSubject.includes('demo')) return <Video size={14} />;
  if (lowerSubject.includes('proposal') || lowerSubject.includes('quote')) return <FileText size={14} />;
  if (lowerSubject.includes('follow')) return <MessageSquare size={14} />;
  return <CheckCircle2 size={14} />;
};

export const ActionItemsCard: React.FC<ActionItemsCardProps> = ({
  tasks,
  completedCount,
  totalCount,
  onTaskClick,
}) => {
  return (
    <Card variant="dark" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-white">Action Items</h3>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-light text-white">{completedCount}</span>
          <span className="text-lg text-white/50">/{totalCount}</span>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.length > 0 ? tasks.map((task) => {
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

          return (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="w-full flex items-center gap-3 group p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                task.status === 'COMPLETED'
                  ? 'bg-green-500/20 text-green-500'
                  : task.priority === 'HIGH'
                    ? 'bg-[#EAD07D]/20 text-[#EAD07D]'
                    : 'bg-white/10 text-white/50'
              }`}>
                {task.status === 'COMPLETED' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  getTaskIcon(task.subject)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  task.status === 'COMPLETED' ? 'text-white/40 line-through' : 'text-white'
                }`}>
                  {task.subject}
                </p>
                {task.dueDate && (
                  <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-white/40'}`}>
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {task.lead && ` • ${task.lead.firstName} ${task.lead.lastName}`}
                  </p>
                )}
              </div>
              {task.status === 'COMPLETED' && (
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
              )}
              {task.priority === 'HIGH' && task.status !== 'COMPLETED' && (
                <AlertCircle size={16} className="text-[#EAD07D] flex-shrink-0" />
              )}
            </button>
          );
        }) : (
          <div className="text-center py-8">
            <CheckCircle2 size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/50 text-sm">All caught up!</p>
          </div>
        )}
      </div>

      <Link
        to="/dashboard/tasks"
        className="mt-6 w-full py-3 bg-white/10 text-white rounded-2xl font-medium text-sm hover:bg-white/20 flex items-center justify-center gap-2 transition-all border border-white/10"
      >
        View All Tasks
        <ChevronRight size={16} />
      </Link>
    </Card>
  );
};
