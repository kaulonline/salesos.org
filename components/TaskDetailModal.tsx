import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Building2,
  Target,
  AlertCircle,
  Phone,
  Mail,
  Video,
  MessageSquare,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Modal } from '../src/components/ui/Modal';
import type { Task } from '../src/types/task';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkComplete?: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onMarkComplete
}) => {
  if (!task) return null;

  const getTaskIcon = () => {
    const subject = task.subject.toLowerCase();
    if (subject.includes('call') || subject.includes('phone')) return <Phone size={20} />;
    if (subject.includes('email') || subject.includes('send')) return <Mail size={20} />;
    if (subject.includes('meeting') || subject.includes('demo')) return <Video size={20} />;
    if (subject.includes('proposal') || subject.includes('quote')) return <FileText size={20} />;
    if (subject.includes('follow')) return <MessageSquare size={20} />;
    return <CheckCircle2 size={20} />;
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-700';
      case 'DEFERRED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-[#EAD07D]/20 text-[#1A1A1A]';
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700';
      case 'LOW':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-[#F8F8F6] text-[#666]';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

  const getRelatedEntityLink = () => {
    if (task.lead) {
      return { href: `/dashboard/leads/${task.leadId}`, label: `${task.lead.firstName} ${task.lead.lastName}`, type: 'Lead', icon: User };
    }
    if (task.contact) {
      return { href: `/dashboard/contacts/${task.contactId}`, label: `${task.contact.firstName} ${task.contact.lastName}`, type: 'Contact', icon: User };
    }
    if (task.opportunity) {
      return { href: `/dashboard/deals/${task.opportunityId}`, label: task.opportunity.name, type: 'Opportunity', icon: Target };
    }
    if (task.account) {
      return { href: `/dashboard/companies/${task.accountId}`, label: task.account.name, type: 'Account', icon: Building2 };
    }
    return null;
  };

  const relatedEntity = getRelatedEntityLink();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      contentClassName="p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-black/5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            task.status === 'COMPLETED'
              ? 'bg-green-100 text-green-600'
              : task.priority === 'HIGH'
                ? 'bg-[#EAD07D]/20 text-[#1A1A1A]'
                : 'bg-[#F8F8F6] text-[#666]'
          }`}>
            {task.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : getTaskIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-semibold text-[#1A1A1A] ${task.status === 'COMPLETED' ? 'line-through opacity-60' : ''}`}>
              {task.subject}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor()}`}>
                {task.priority}
              </span>
              {isOverdue && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[50vh]">
        {task.description && (
          <div>
            <h4 className="text-xs font-medium text-[#999] uppercase tracking-wide mb-2">Description</h4>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">{task.description}</p>
          </div>
        )}

        {task.dueDate && (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-100' : 'bg-[#F8F8F6]'}`}>
              <Calendar size={18} className={isOverdue ? 'text-red-600' : 'text-[#666]'} />
            </div>
            <div>
              <p className="text-xs text-[#999]">Due Date</p>
              <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-[#1A1A1A]'}`}>
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        )}

        {relatedEntity && (
          <Link
            to={relatedEntity.href}
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F8F6] hover:bg-[#EAD07D]/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <relatedEntity.icon size={18} className="text-[#666]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#999]">Related {relatedEntity.type}</p>
              <p className="text-sm font-medium text-[#1A1A1A] truncate">{relatedEntity.label}</p>
            </div>
            <ExternalLink size={16} className="text-[#999] group-hover:text-[#1A1A1A] transition-colors" />
          </Link>
        )}

        {task.assignedTo && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <User size={18} className="text-[#666]" />
            </div>
            <div>
              <p className="text-xs text-[#999]">Assigned To</p>
              <p className="text-sm font-medium text-[#1A1A1A]">{task.assignedTo.name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <Clock size={18} className="text-[#666]" />
          </div>
          <div>
            <p className="text-xs text-[#999]">Created</p>
            <p className="text-sm font-medium text-[#1A1A1A]">
              {new Date(task.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-black/5 flex items-center gap-3">
        {task.status !== 'COMPLETED' && onMarkComplete && (
          <button
            onClick={() => {
              onMarkComplete(task.id);
              onClose();
            }}
            className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-2xl font-medium text-sm hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Mark Complete
          </button>
        )}
        {relatedEntity && (
          <Link
            to={relatedEntity.href}
            onClick={onClose}
            className={`${task.status !== 'COMPLETED' && onMarkComplete ? 'flex-1' : 'w-full'} py-3 bg-[#F8F8F6] text-[#1A1A1A] rounded-2xl font-medium text-sm hover:bg-[#EAD07D]/20 transition-colors flex items-center justify-center gap-2`}
          >
            View {relatedEntity.type}
            <ExternalLink size={16} />
          </Link>
        )}
        {!relatedEntity && task.status === 'COMPLETED' && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#F8F8F6] text-[#1A1A1A] rounded-2xl font-medium text-sm hover:bg-[#EAD07D]/20 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </Modal>
  );
};

export default TaskDetailModal;
