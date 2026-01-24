import {
  Home, Users, Building2, Briefcase, Calendar, BarChart3,
  MessageSquare, Settings, Plus, Search, Zap, Bot, Phone,
  Mail, FileText, Target, TrendingUp, Clock, AlertTriangle,
  CheckSquare, ListTodo, Send, Sparkles, Mic, Camera
} from 'lucide-react';

export interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string[];
  keywords?: string[];
  category: CommandCategory;
  action: () => void | Promise<void>;
  disabled?: boolean;
  badge?: string;
}

export type CommandCategory =
  | 'navigation'
  | 'create'
  | 'search'
  | 'ai'
  | 'actions'
  | 'recent'
  | 'settings';

export const categoryLabels: Record<CommandCategory, string> = {
  navigation: 'Navigation',
  create: 'Create New',
  search: 'Search',
  ai: 'AI Assistant',
  actions: 'Quick Actions',
  recent: 'Recent',
  settings: 'Settings',
};

export const categoryOrder: CommandCategory[] = [
  'recent',
  'ai',
  'create',
  'navigation',
  'search',
  'actions',
  'settings',
];

// Command registry factory
export function createCommandRegistry(
  navigate: (path: string) => void,
  actions: {
    openNewDeal?: () => void;
    openNewLead?: () => void;
    openNewContact?: () => void;
    openNewMeeting?: () => void;
    openNewTask?: () => void;
    openAIChat?: () => void;
    openSmartCapture?: () => void;
    triggerVoiceSDR?: () => void;
    analyzePipeline?: () => void;
    prepareForMeeting?: (meetingId: string) => void;
  }
): Command[] {
  return [
    // Navigation Commands
    {
      id: 'nav-dashboard',
      name: 'Go to Dashboard',
      description: 'View your dashboard overview',
      icon: Home,
      shortcut: ['g', 'd'],
      keywords: ['home', 'overview', 'main'],
      category: 'navigation',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'nav-leads',
      name: 'Go to Leads',
      description: 'Manage your leads',
      icon: Target,
      shortcut: ['g', 'l'],
      keywords: ['prospects', 'potential'],
      category: 'navigation',
      action: () => navigate('/dashboard/leads'),
    },
    {
      id: 'nav-contacts',
      name: 'Go to Contacts',
      description: 'View all contacts',
      icon: Users,
      shortcut: ['g', 'c'],
      keywords: ['people', 'persons'],
      category: 'navigation',
      action: () => navigate('/dashboard/contacts'),
    },
    {
      id: 'nav-companies',
      name: 'Go to Companies',
      description: 'Manage accounts',
      icon: Building2,
      shortcut: ['g', 'a'],
      keywords: ['accounts', 'organizations'],
      category: 'navigation',
      action: () => navigate('/dashboard/companies'),
    },
    {
      id: 'nav-deals',
      name: 'Go to Deals',
      description: 'View pipeline',
      icon: Briefcase,
      shortcut: ['g', 'o'],
      keywords: ['opportunities', 'pipeline', 'sales'],
      category: 'navigation',
      action: () => navigate('/dashboard/deals'),
    },
    {
      id: 'nav-calendar',
      name: 'Go to Calendar',
      description: 'View meetings',
      icon: Calendar,
      shortcut: ['g', 'm'],
      keywords: ['meetings', 'schedule', 'appointments'],
      category: 'navigation',
      action: () => navigate('/dashboard/calendar'),
    },
    {
      id: 'nav-analytics',
      name: 'Go to Analytics',
      description: 'View reports',
      icon: BarChart3,
      shortcut: ['g', 'r'],
      keywords: ['reports', 'metrics', 'stats'],
      category: 'navigation',
      action: () => navigate('/dashboard/analytics'),
    },
    {
      id: 'nav-ai-chat',
      name: 'Open AI Chat',
      description: 'Chat with IRIS AI assistant',
      icon: MessageSquare,
      shortcut: ['g', 'i'],
      keywords: ['iris', 'assistant', 'help'],
      category: 'navigation',
      action: () => navigate('/dashboard/ai'),
    },
    {
      id: 'nav-settings',
      name: 'Go to Settings',
      description: 'Manage preferences',
      icon: Settings,
      shortcut: ['g', 's'],
      keywords: ['preferences', 'config'],
      category: 'settings',
      action: () => navigate('/dashboard/settings'),
    },

    // Create Commands
    {
      id: 'create-deal',
      name: 'New Deal',
      description: 'Create a new opportunity',
      icon: Plus,
      shortcut: ['n', 'd'],
      keywords: ['add', 'opportunity'],
      category: 'create',
      action: () => actions.openNewDeal?.(),
    },
    {
      id: 'create-lead',
      name: 'New Lead',
      description: 'Add a new lead',
      icon: Plus,
      shortcut: ['n', 'l'],
      keywords: ['add', 'prospect'],
      category: 'create',
      action: () => actions.openNewLead?.(),
    },
    {
      id: 'create-contact',
      name: 'New Contact',
      description: 'Add a new contact',
      icon: Plus,
      shortcut: ['n', 'c'],
      keywords: ['add', 'person'],
      category: 'create',
      action: () => actions.openNewContact?.(),
    },
    {
      id: 'create-meeting',
      name: 'Schedule Meeting',
      description: 'Create a new meeting',
      icon: Calendar,
      shortcut: ['n', 'm'],
      keywords: ['add', 'appointment', 'schedule'],
      category: 'create',
      action: () => actions.openNewMeeting?.(),
    },
    {
      id: 'create-task',
      name: 'New Task',
      description: 'Add a task',
      icon: CheckSquare,
      shortcut: ['n', 't'],
      keywords: ['add', 'todo'],
      category: 'create',
      action: () => actions.openNewTask?.(),
    },

    // AI Commands
    {
      id: 'ai-analyze-pipeline',
      name: 'Analyze Pipeline',
      description: 'AI analysis of your sales pipeline',
      icon: TrendingUp,
      keywords: ['forecast', 'prediction', 'insights'],
      category: 'ai',
      badge: 'AI',
      action: () => actions.analyzePipeline?.(),
    },
    {
      id: 'ai-draft-email',
      name: 'Draft Email with AI',
      description: 'Generate an email draft',
      icon: Mail,
      keywords: ['compose', 'write', 'message'],
      category: 'ai',
      badge: 'AI',
      action: () => actions.openAIChat?.(),
    },
    {
      id: 'ai-meeting-prep',
      name: 'Prepare for Meeting',
      description: 'Get AI briefing for upcoming meeting',
      icon: FileText,
      keywords: ['brief', 'research', 'prepare'],
      category: 'ai',
      badge: 'AI',
      action: () => navigate('/dashboard/calendar'),
    },
    {
      id: 'ai-smart-capture',
      name: 'Smart Capture',
      description: 'Scan business card or note',
      icon: Camera,
      keywords: ['scan', 'photo', 'business card'],
      category: 'ai',
      badge: 'AI',
      action: () => actions.openSmartCapture?.(),
    },
    {
      id: 'ai-voice-sdr',
      name: 'Voice SDR',
      description: 'Start voice-assisted prospecting',
      icon: Mic,
      keywords: ['call', 'speak', 'voice'],
      category: 'ai',
      badge: 'AI',
      action: () => actions.triggerVoiceSDR?.(),
    },
    {
      id: 'ai-ask-iris',
      name: 'Ask IRIS',
      description: 'Ask the AI anything about your data',
      icon: Bot,
      shortcut: ['/'],
      keywords: ['question', 'query', 'help'],
      category: 'ai',
      badge: 'AI',
      action: () => actions.openAIChat?.(),
    },

    // Action Commands
    {
      id: 'action-log-call',
      name: 'Log Call',
      description: 'Record a phone call',
      icon: Phone,
      keywords: ['phone', 'record'],
      category: 'actions',
      action: () => navigate('/dashboard/ai'),
    },
    {
      id: 'action-send-email',
      name: 'Send Email',
      description: 'Compose and send email',
      icon: Send,
      keywords: ['compose', 'message'],
      category: 'actions',
      action: () => navigate('/dashboard/ai'),
    },
    {
      id: 'action-view-tasks',
      name: 'View Today\'s Tasks',
      description: 'See tasks due today',
      icon: ListTodo,
      keywords: ['todos', 'due'],
      category: 'actions',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'action-at-risk-deals',
      name: 'At-Risk Deals',
      description: 'View deals needing attention',
      icon: AlertTriangle,
      keywords: ['warning', 'attention', 'stale'],
      category: 'actions',
      action: () => navigate('/dashboard/deals?filter=at-risk'),
    },

    // Search Commands
    {
      id: 'search-global',
      name: 'Search Everything',
      description: 'Search across all records',
      icon: Search,
      shortcut: ['/'],
      keywords: ['find', 'lookup'],
      category: 'search',
      action: () => {}, // Handled by command palette search
    },
    {
      id: 'search-deals',
      name: 'Search Deals',
      description: 'Find specific deals',
      icon: Briefcase,
      keywords: ['find', 'opportunity'],
      category: 'search',
      action: () => navigate('/dashboard/deals'),
    },
    {
      id: 'search-contacts',
      name: 'Search Contacts',
      description: 'Find specific contacts',
      icon: Users,
      keywords: ['find', 'person'],
      category: 'search',
      action: () => navigate('/dashboard/contacts'),
    },
  ];
}

// Fuzzy search for commands
export function searchCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) {
    return commands;
  }

  const lowerQuery = query.toLowerCase();

  return commands
    .map((cmd) => {
      let score = 0;

      // Exact name match (highest priority)
      if (cmd.name.toLowerCase() === lowerQuery) {
        score = 100;
      }
      // Name starts with query
      else if (cmd.name.toLowerCase().startsWith(lowerQuery)) {
        score = 80;
      }
      // Name contains query
      else if (cmd.name.toLowerCase().includes(lowerQuery)) {
        score = 60;
      }
      // Keywords match
      else if (cmd.keywords?.some((kw) => kw.includes(lowerQuery))) {
        score = 40;
      }
      // Description contains query
      else if (cmd.description?.toLowerCase().includes(lowerQuery)) {
        score = 20;
      }

      return { cmd, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ cmd }) => cmd);
}

// Group commands by category
export function groupCommandsByCategory(commands: Command[]): Map<CommandCategory, Command[]> {
  const grouped = new Map<CommandCategory, Command[]>();

  categoryOrder.forEach((category) => {
    grouped.set(category, []);
  });

  commands.forEach((cmd) => {
    const group = grouped.get(cmd.category);
    if (group) {
      group.push(cmd);
    }
  });

  // Remove empty categories
  grouped.forEach((commands, category) => {
    if (commands.length === 0) {
      grouped.delete(category);
    }
  });

  return grouped;
}
