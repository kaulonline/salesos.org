import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  createCommandRegistry,
  searchCommands,
  groupCommandsByCategory,
  CommandCategory,
} from '../lib/commandRegistry';

interface UseCommandCenterOptions {
  onOpenNewDeal?: () => void;
  onOpenNewLead?: () => void;
  onOpenNewContact?: () => void;
  onOpenNewMeeting?: () => void;
  onOpenNewTask?: () => void;
  onOpenAIChat?: () => void;
  onOpenSmartCapture?: () => void;
  onTriggerVoiceSDR?: () => void;
  onAnalyzePipeline?: () => void;
}

interface UseCommandCenterReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  query: string;
  setQuery: (query: string) => void;
  commands: Command[];
  filteredCommands: Command[];
  groupedCommands: Map<CommandCategory, Command[]>;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  executeSelected: () => void;
  executeCommand: (command: Command) => void;
  navigateUp: () => void;
  navigateDown: () => void;
  recentCommands: Command[];
  addToRecent: (commandId: string) => void;
}

const RECENT_COMMANDS_KEY = 'salesos-recent-commands';
const MAX_RECENT_COMMANDS = 5;

export function useCommandCenter(options: UseCommandCenterOptions = {}): UseCommandCenterReturn {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_COMMANDS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // Create command registry
  const commands = useMemo(
    () =>
      createCommandRegistry(navigate, {
        openNewDeal: options.onOpenNewDeal,
        openNewLead: options.onOpenNewLead,
        openNewContact: options.onOpenNewContact,
        openNewMeeting: options.onOpenNewMeeting,
        openNewTask: options.onOpenNewTask,
        openAIChat: options.onOpenAIChat,
        openSmartCapture: options.onOpenSmartCapture,
        triggerVoiceSDR: options.onTriggerVoiceSDR,
        analyzePipeline: options.onAnalyzePipeline,
      }),
    [navigate, options]
  );

  // Recent commands
  const recentCommands = useMemo(() => {
    return recentCommandIds
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is Command => c !== undefined)
      .map((c) => ({ ...c, category: 'recent' as const }));
  }, [recentCommandIds, commands]);

  // Add recent commands to the list
  const allCommands = useMemo(() => {
    if (query) {
      return commands; // Don't show recent when searching
    }
    return [...recentCommands, ...commands.filter((c) => !recentCommandIds.includes(c.id))];
  }, [commands, recentCommands, recentCommandIds, query]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    return searchCommands(allCommands, query);
  }, [allCommands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    return groupCommandsByCategory(filteredCommands);
  }, [filteredCommands]);

  // Flatten grouped commands for navigation
  const flattenedCommands = useMemo(() => {
    const flat: Command[] = [];
    groupedCommands.forEach((cmds) => {
      flat.push(...cmds);
    });
    return flat;
  }, [groupedCommands]);

  // Add to recent commands
  const addToRecent = useCallback((commandId: string) => {
    setRecentCommandIds((prev) => {
      const filtered = prev.filter((id) => id !== commandId);
      const updated = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS);
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Execute a command
  const executeCommand = useCallback(
    (command: Command) => {
      if (command.disabled) return;

      addToRecent(command.id);
      setIsOpen(false);
      setQuery('');
      setSelectedIndex(0);

      command.action();
    },
    [addToRecent]
  );

  // Execute currently selected command
  const executeSelected = useCallback(() => {
    const command = flattenedCommands[selectedIndex];
    if (command) {
      executeCommand(command);
    }
  }, [flattenedCommands, selectedIndex, executeCommand]);

  // Navigation
  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) => (prev <= 0 ? flattenedCommands.length - 1 : prev - 1));
  }, [flattenedCommands.length]);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) => (prev >= flattenedCommands.length - 1 ? 0 : prev + 1));
  }, [flattenedCommands.length]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Open/close handlers
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
    query,
    setQuery,
    commands,
    filteredCommands: flattenedCommands,
    groupedCommands,
    selectedIndex,
    setSelectedIndex,
    executeSelected,
    executeCommand,
    navigateUp,
    navigateDown,
    recentCommands,
    addToRecent,
  };
}
