import React, { useRef, useState } from 'react';
import { Upload, Loader2, File, Table, Sparkles, Tag, RefreshCw, Trash2 } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { QuoteDocument } from '../../api/quotes';

interface QuoteDocumentsTabProps {
  documents: QuoteDocument[];
  loading: boolean;
  isUploading: boolean;
  isReprocessing: boolean;
  isDeleting: boolean;
  onUpload: (file: File) => void;
  onReprocess: (docId: string) => void;
  onDeleteRequest: (docId: string) => void;
}

export const QuoteDocumentsTab: React.FC<QuoteDocumentsTabProps> = ({
  documents,
  loading,
  isUploading,
  isReprocessing,
  isDeleting,
  onUpload,
  onReprocess,
  onDeleteRequest,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-6 text-center hover:border-[#EAD07D] transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUpload(file);
              e.target.value = '';
            }
          }}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-3">
          {isUploading ? (
            <Loader2 size={20} className="text-[#EAD07D] animate-spin" />
          ) : (
            <Upload size={20} className="text-[#666]" />
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-sm font-medium text-[#1A1A1A] hover:text-[#EAD07D] transition-colors disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </button>
        <p className="text-xs text-[#888] mt-1">
          PDF documents will be processed with AI to extract summaries
        </p>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="py-8 text-center text-[#666] text-sm">
          No documents attached yet
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#F8F8F6] rounded-xl p-4 hover:bg-[#F2F1EA] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <File size={18} className="text-[#666]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#1A1A1A] truncate">
                      {doc.filename}
                    </span>
                    {doc.status === 'PROCESSING' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-[#1A1A1A]/10 text-[#1A1A1A] rounded-full flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" />
                        Processing
                      </span>
                    )}
                    {doc.status === 'COMPLETE' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-[#93C01F]/20 text-[#1A1A1A] rounded-full flex items-center gap-1">
                        <Sparkles size={10} />
                        AI Ready
                      </span>
                    )}
                    {doc.status === 'ERROR' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-[#EAD07D]/30 text-[#1A1A1A] rounded-full">
                        Error
                      </span>
                    )}
                  </div>

                  {/* Document Stats */}
                  <div className="flex items-center gap-3 text-xs text-[#888]">
                    {doc.pageCount && <span>{doc.pageCount} pages</span>}
                    {doc.tableCount && doc.tableCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Table size={10} />
                        {doc.tableCount} tables
                      </span>
                    )}
                    {doc.sizeBytes && <span>{(doc.sizeBytes / 1024).toFixed(0)} KB</span>}
                  </div>

                  {/* AI Summary */}
                  {doc.status === 'COMPLETE' && doc.summary && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                        className="text-xs font-medium text-[#EAD07D] hover:text-[#D4BA6A] flex items-center gap-1"
                      >
                        <Sparkles size={12} />
                        {expandedDocId === doc.id ? 'Hide AI Summary' : 'View AI Summary'}
                      </button>
                      {expandedDocId === doc.id && (
                        <div className="mt-2 p-3 bg-white rounded-lg border border-[#EAD07D]/30">
                          <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">
                            {doc.summary}
                          </p>
                          {doc.keyTerms && doc.keyTerms.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#F2F1EA]">
                              <div className="flex items-center gap-1 mb-1.5">
                                <Tag size={10} className="text-[#888]" />
                                <span className="text-[10px] font-medium text-[#888] uppercase">Key Terms</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {doc.keyTerms.map((term, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 text-xs bg-[#F8F8F6] text-[#666] rounded-full"
                                  >
                                    {term}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {doc.status === 'ERROR' && doc.errorMessage && (
                    <p className="mt-2 text-xs text-red-500">{doc.errorMessage}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {doc.status === 'ERROR' && (
                    <button
                      onClick={() => onReprocess(doc.id)}
                      disabled={isReprocessing}
                      className="p-1.5 text-[#888] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                      title="Retry processing"
                    >
                      <RefreshCw size={14} className={isReprocessing ? 'animate-spin' : ''} />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteRequest(doc.id)}
                    disabled={isDeleting}
                    className="p-1.5 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
