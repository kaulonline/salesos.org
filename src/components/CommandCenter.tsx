import React, { useEffect, useRef, Fragment } from 'react';
import { Search, Command as CommandIcon, CornerDownLeft } from 'lucide-react';
import { useCommandCenter } from '../hooks/useCommandCenter';
import { Command, categoryLabels, CommandCategory } from '../lib/commandRegistry';

interface CommandCenterProps {
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

export function CommandCenter(props: CommandCenterProps) {
  const {
    isOpen,
    close,
    query,
    setQuery,
    groupedCommands,
    selectedIndex,
    setSelectedIndex,
    executeSelected,
    executeCommand,
    navigateUp,
    navigateDown,
    filteredCommands,
  } = useCommandCenter(props);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateDown();
        break;
      case 'Enter':
        e.preventDefault();
        executeSelected();
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  };

  if (!isOpen) {
    return null;
  }

  // Track cumulative index for selection
  let cumulativeIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Command Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, navigate, or ask AI..."
              className="flex-1 text-base outline-none placeholder:text-gray-400"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">
                esc
              </kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Commands List */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto py-2"
          >
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">No commands found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              Array.from(groupedCommands.entries()).map(([category, commands]) => {
                const categoryStartIndex = cumulativeIndex;
                cumulativeIndex += commands.length;

                return (
                  <div key={category} className="mb-2">
                    {/* Category Header */}
                    <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {categoryLabels[category]}
                    </div>

                    {/* Commands */}
                    {commands.map((command, index) => {
                      const globalIndex = categoryStartIndex + index;
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <CommandItem
                          key={command.id}
                          command={command}
                          isSelected={isSelected}
                          onClick={() => executeCommand(command)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        />
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px] font-mono">
                  <CornerDownLeft className="w-3 h-3" />
                </kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px] font-mono">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <CommandIcon className="w-3 h-3" />
              <span>K to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function CommandItem({ command, isSelected, onClick, onMouseEnter }: CommandItemProps) {
  const Icon = command.icon;

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
      } ${command.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={command.disabled}
      data-selected={isSelected}
    >
      {/* Icon */}
      {Icon && (
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isSelected ? 'bg-[#1A1A1A] text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
            {command.name}
          </span>
          {command.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#EAD07D] text-[#1A1A1A] rounded">
              {command.badge}
            </span>
          )}
        </div>
        {command.description && (
          <p className="text-xs text-gray-500 truncate">{command.description}</p>
        )}
      </div>

      {/* Shortcut */}
      {command.shortcut && command.shortcut.length > 0 && (
        <div className="flex items-center gap-0.5">
          {command.shortcut.map((key, i) => (
            <Fragment key={i}>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 rounded border border-gray-200">
                {key}
              </kbd>
              {i < command.shortcut!.length - 1 && (
                <span className="text-gray-400 text-xs">+</span>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </button>
  );
}

// Trigger button component for the header
export function CommandCenterTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border">
        <CommandIcon className="w-3 h-3" />K
      </kbd>
    </button>
  );
}
