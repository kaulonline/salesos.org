import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, Check, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Pipeline } from '../../src/types';

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  onSelect: (pipelineId: string | null) => void;
  loading?: boolean;
  showAllOption?: boolean;
  showSettingsLink?: boolean;
}

export const PipelineSelector: React.FC<PipelineSelectorProps> = ({
  pipelines,
  selectedPipelineId,
  onSelect,
  loading = false,
  showAllOption = true,
  showSettingsLink = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const activePipelines = pipelines.filter(p => p.isActive);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-2.5 bg-white rounded-full shadow-sm border border-gray-100 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 bg-white rounded-full text-sm font-medium text-[#666] hover:text-[#1A1A1A] flex items-center gap-2 shadow-sm border border-transparent hover:border-gray-200 transition-colors"
      >
        {selectedPipeline ? (
          <>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedPipeline.color || '#6366f1' }}
            />
            <span>{selectedPipeline.name}</span>
          </>
        ) : (
          <>
            <Layers size={14} />
            <span>All Pipelines</span>
          </>
        )}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
          {showAllOption && (
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                !selectedPipelineId ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#666]" />
                <span>All Pipelines</span>
              </div>
              {!selectedPipelineId && <Check size={14} className="text-[#1A1A1A]" />}
            </button>
          )}

          {showAllOption && activePipelines.length > 0 && (
            <hr className="my-1 border-gray-100" />
          )}

          {activePipelines.map((pipeline) => (
            <button
              key={pipeline.id}
              onClick={() => {
                onSelect(pipeline.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                selectedPipelineId === pipeline.id ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: pipeline.color || '#6366f1' }}
                />
                <span>{pipeline.name}</span>
                {pipeline.isDefault && (
                  <span className="text-[10px] text-[#999] bg-gray-100 px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
              {selectedPipelineId === pipeline.id && <Check size={14} className="text-[#1A1A1A]" />}
            </button>
          ))}

          {showSettingsLink && (
            <>
              <hr className="my-1 border-gray-100" />
              <Link
                to="/dashboard/pipelines"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
              >
                <Settings size={14} />
                <span>Manage Pipelines</span>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PipelineSelector;
