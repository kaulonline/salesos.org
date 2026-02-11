import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Users,
  Flag,
  Search,
  Plus,
  Filter,
  ChevronDown,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTasks } from '../../src/hooks';
import { useToast } from '../../src/components/ui/Toast';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../../src/types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-[#F8F8F6] text-[#666]', icon: Circle },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-[#1A1A1A]/10 text-[#1A1A1A]', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-[#93C01F]/20 text-[#1A1A1A]', icon: CheckCircle2 },
  WAITING: { label: 'Waiting', color: 'bg-[#EAD07D]/30 text-[#1A1A1A]', icon: Clock },
  DEFERRED: { label: 'Deferred', color: 'bg-[#F8F8F6] text-[#666]', icon: Circle },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  HIGH: { label: 'High', color: 'text-[#EAD07D]' },
  NORMAL: { label: 'Normal', color: 'text-[#666]' },
  LOW: { label: 'Low', color: 'text-[#999]' },
};

const TYPE_ICONS: Record<TaskType, React.ElementType> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  FOLLOW_UP: ArrowUpRight,
  OTHER: Circle,
};

function formatDate(dateString?: string): string {
  if (!dateString) return 'No due date';
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateString?: string): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date() && new Date(dateString).toDateString() !== new Date().toDateString();
}

export const Tasks: React.FC = () => {
  const { tasks, loading, complete, isCompleting, refetch } = useTasks();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState<{
    subject: string;
    description: string;
    type: TaskType;
    priority: TaskPriority;
    dueDate: string;
  }>({
    subject: '',
    description: '',
    type: 'OTHER',
    priority: 'NORMAL',
    dueDate: '',
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const pending = filteredTasks.filter((t) => t.status !== 'COMPLETED');
    const completed = filteredTasks.filter((t) => t.status === 'COMPLETED');
    return { pending, completed };
  }, [filteredTasks]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const overdue = tasks.filter((t) => t.status !== 'COMPLETED' && isOverdue(t.dueDate)).length;
    const highPriority = tasks.filter((t) => t.status !== 'COMPLETED' && t.priority === 'HIGH').length;
    return { total, completed, overdue, highPriority };
  }, [tasks]);

  const handleComplete = async (taskId: string) => {
    try {
      await complete(taskId);
      showToast({ type: 'success', title: 'Task Completed' });
    } catch (error) {
      console.error('Failed to complete task:', error);
      showToast({ type: 'error', title: 'Failed to Complete Task', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.subject.trim()) return;
    setIsCreating(true);
    try {
      // Simulate API call - in production, this would call a create task API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateModal(false);
      setNewTask({
        subject: '',
        description: '',
        type: 'OTHER',
        priority: 'NORMAL',
        dueDate: '',
      });
      refetch();
      showToast({ type: 'success', title: 'Task Created' });
    } catch (error) {
      console.error('Failed to create task:', error);
      showToast({ type: 'error', title: 'Failed to Create Task', message: (error as Error).message || 'Please try again' });
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setNewTask({
      subject: '',
      description: '',
      type: 'OTHER',
      priority: 'NORMAL',
      dueDate: new Date().toISOString().split('T')[0],
    });
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-64 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-medium text-[#1A1A1A]">Tasks</h1>
          <p className="text-[#666] mt-1">Manage your to-dos and follow-ups</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} className="text-[#666]" />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg"
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666]">Total Tasks</p>
              <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <CheckCircle2 size={24} className="text-[#666]" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666]">Completed</p>
              <p className="text-3xl font-bold text-[#93C01F] mt-1">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-[#93C01F]" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666]">Overdue</p>
              <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{stats.overdue}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/30 flex items-center justify-center">
              <AlertCircle size={24} className="text-[#1A1A1A]" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666]">High Priority</p>
              <p className="text-3xl font-bold text-[#EAD07D] mt-1">{stats.highPriority}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Flag size={24} className="text-[#EAD07D]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${
            showFilters ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter size={18} />
          Filters
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <Card className="p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm font-medium text-[#666] mb-2">Status</p>
              <div className="flex gap-2">
                {['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'COMPLETED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as TaskStatus | 'ALL')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-gray-100 text-[#666] hover:bg-gray-200'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : STATUS_CONFIG[status as TaskStatus]?.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#666] mb-2">Priority</p>
              <div className="flex gap-2">
                {['ALL', 'HIGH', 'NORMAL', 'LOW'].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority as TaskPriority | 'ALL')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      priorityFilter === priority
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-gray-100 text-[#666] hover:bg-gray-200'
                    }`}
                  >
                    {priority === 'ALL' ? 'All' : PRIORITY_CONFIG[priority as TaskPriority]?.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Pending Tasks */}
      {groupedTasks.pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#999] uppercase tracking-wider mb-4">
            Pending ({groupedTasks.pending.length})
          </h2>
          <div className="space-y-3">
            {groupedTasks.pending.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={handleComplete} isCompleting={isCompleting} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {groupedTasks.completed.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-[#999] uppercase tracking-wider mb-4">
            Completed ({groupedTasks.completed.length})
          </h2>
          <div className="space-y-3">
            {groupedTasks.completed.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={handleComplete} isCompleting={isCompleting} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-[#999]" />
          </div>
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">No tasks found</h3>
          <p className="text-[#666] mb-6">
            {searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Create your first task to get started'}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
          >
            <Plus size={18} />
            Create Task
          </button>
        </Card>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Plus size={18} className="text-[#1A1A1A]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create New Task</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Subject *</label>
                <input
                  type="text"
                  value={newTask.subject}
                  onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                  placeholder="Enter task subject..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add details about this task..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Type</label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  >
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  >
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium hover:bg-[#F0EBD8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!newTask.subject.trim() || isCreating}
                  className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Task Card Component
interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, isCompleting }) => {
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const TypeIcon = task.type ? TYPE_ICONS[task.type] : Circle;
  const overdue = task.status !== 'COMPLETED' && isOverdue(task.dueDate);

  // Determine related entity link
  const getRelatedLink = () => {
    if (task.leadId) return { href: `/dashboard/leads/${task.leadId}`, label: 'Lead' };
    if (task.contactId) return { href: `/dashboard/contacts/${task.contactId}`, label: 'Contact' };
    if (task.opportunityId) return { href: `/dashboard/deals/${task.opportunityId}`, label: 'Opportunity' };
    return null;
  };

  const relatedLink = getRelatedLink();

  return (
    <Card className={`p-4 hover:shadow-md transition-all ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => task.status !== 'COMPLETED' && onComplete(task.id)}
          disabled={isCompleting || task.status === 'COMPLETED'}
          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            task.status === 'COMPLETED'
              ? 'bg-[#93C01F] border-[#93C01F]'
              : 'border-gray-300 hover:border-[#EAD07D] hover:bg-[#EAD07D]/10'
          }`}
        >
          {task.status === 'COMPLETED' ? (
            <CheckCircle2 size={14} className="text-white" />
          ) : isCompleting ? (
            <Loader2 size={14} className="animate-spin text-[#EAD07D]" />
          ) : null}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                className={`font-medium text-[#1A1A1A] ${task.status === 'COMPLETED' ? 'line-through' : ''}`}
              >
                {task.subject}
              </h3>
              {task.description && (
                <p className="text-sm text-[#666] mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Flag size={14} className={priorityConfig.color} />
              <Badge variant={task.status === 'COMPLETED' ? 'green' : 'neutral'} size="sm">
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1.5 text-[#666]">
              <TypeIcon size={14} />
              <span>{task.type || 'Task'}</span>
            </div>
            <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-500' : 'text-[#666]'}`}>
              <Calendar size={14} />
              <span>{formatDate(task.dueDate)}</span>
              {overdue && <AlertCircle size={12} />}
            </div>
            {relatedLink && (
              <Link
                to={relatedLink.href}
                className="flex items-center gap-1.5 text-[#EAD07D] hover:text-[#d4bc5e] transition-colors"
              >
                <ArrowUpRight size={14} />
                <span>{relatedLink.label}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Tasks;
