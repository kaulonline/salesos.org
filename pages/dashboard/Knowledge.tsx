import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Database,
  AlertCircle,
  Clock,
  Search,
  X,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  usePageIndexHealth,
  usePageIndexDocuments,
  useUploadDocument,
  useDeleteDocument,
  useSearchAllMutation,
} from '../../src/hooks';
import { useToast } from '../../src/components/ui/Toast';

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const statusConfig: Record<string, { variant: 'green' | 'yellow' | 'red' | 'gray'; label: string }> = {
  completed: { variant: 'green', label: 'Indexed' },
  processing: { variant: 'yellow', label: 'Processing...' },
  pending: { variant: 'gray', label: 'Pending' },
  error: { variant: 'red', label: 'Error' },
};

export const Knowledge: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    text: string;
    relevance_score: number;
    metadata?: Record<string, unknown>;
  }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // API hooks
  const { data: health, isLoading: healthLoading, error: healthError } = usePageIndexHealth();
  const { data: documents, isLoading: documentsLoading, refetch: refetchDocuments } = usePageIndexDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const searchMutation = useSearchAllMutation();

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast({ type: 'warning', title: 'Unsupported File Type', message: `Only PDF files are supported. Skipping: ${file.name}` });
        continue;
      }

      try {
        await uploadMutation.mutateAsync({
          file,
          options: { addSummary: true, addDescription: false },
        });
      } catch (error) {
        console.error('Upload failed:', error);
        showToast({ type: 'error', title: 'Upload Failed', message: (error as Error).message || 'Please try again' });
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadMutation]);

  const handleDelete = useCallback(async (documentId: string) => {
    try {
      await deleteMutation.mutateAsync(documentId);
      setDeleteConfirm(null);
      showToast({ type: 'success', title: 'Document Deleted' });
    } catch (error) {
      console.error('Delete failed:', error);
      showToast({ type: 'error', title: 'Failed to Delete Document', message: (error as Error).message || 'Please try again' });
    }
  }, [deleteMutation]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await searchMutation.mutateAsync({
        query: searchQuery,
        maxResults: 10,
      });
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      showToast({ type: 'error', title: 'Search Failed', message: (error as Error).message || 'Please try again' });
    }
  }, [searchQuery, searchMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const isLoading = healthLoading || documentsLoading;

  // Ensure documents is always an array (backend might return { documents: [...] })
  const documentsList = Array.isArray(documents)
    ? documents
    : (documents as any)?.documents ?? [];

  // Calculate storage stats
  const totalSize = documentsList.reduce((sum: number, doc: any) => sum + (doc.file_size || 0), 0);
  const totalVectors = documentsList.reduce((sum: number, doc: any) => sum + (doc.vector_count || 0), 0);
  const completedDocs = documentsList.filter((d: any) => d.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-[300px] rounded-[2rem] md:col-span-2" />
          <Skeleton className="h-[300px] rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Knowledge Base</h1>
          <p className="text-[#666]">The brain of your agents. Upload documents and links to ground their responses.</p>
        </div>

        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-black/5">
          <div className="flex items-center gap-2">
            {healthError ? (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Offline</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">System Healthy</span>
              </>
            )}
          </div>
          <div className="h-4 w-px bg-gray-200"></div>
          <div className="text-xs text-[#666]">
            <strong>{totalVectors.toLocaleString()}</strong> Vectors Indexed
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={20} />
          <input
            type="text"
            placeholder="Search your knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-12 pr-24 py-3 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searchMutation.isPending || !searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {searchMutation.isPending ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results Modal */}
      {showSearchResults && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-black/5">
              <h2 className="text-xl font-medium text-[#1A1A1A]">
                Search Results for "{searchQuery}"
              </h2>
              <button
                onClick={() => setShowSearchResults(false)}
                className="text-[#666] hover:text-[#1A1A1A]"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search size={40} className="mx-auto text-[#999] opacity-40 mb-3" />
                  <p className="text-[#666]">No results found</p>
                  <p className="text-sm text-[#999]">Try a different search query</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((result, i) => (
                    <div key={i} className="p-4 bg-[#F8F8F6] rounded-xl">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <span className="text-xs text-[#999]">
                          {(result.metadata?.filename as string) || 'Document'}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-[#EAD07D]/20 text-[#1A1A1A] rounded-full">
                          {Math.round(result.relevance_score * 100)}% match
                        </span>
                      </div>
                      <p className="text-sm text-[#666] line-clamp-3">{result.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Content: Sources List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="min-h-[500px] p-0 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F8F8F6]">
              <h3 className="font-bold text-[#1A1A1A]">Data Sources ({documents?.length || 0})</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => refetchDocuments()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </div>

            <div className="p-2">
              {documentsList.length === 0 ? (
                <div className="py-16 text-center">
                  <Database size={48} className="mx-auto text-[#999] opacity-40 mb-4" />
                  <p className="text-[#666] mb-2">No documents indexed yet</p>
                  <p className="text-sm text-[#999]">Upload PDFs to train your AI agents</p>
                </div>
              ) : (
                documentsList.map((doc: any) => {
                  const status = statusConfig[doc.status] || statusConfig.pending;
                  const isDeleting = deleteMutation.isPending && deleteConfirm === doc.document_id;

                  return (
                    <div
                      key={doc.document_id}
                      className="group flex items-center justify-between p-4 hover:bg-[#F8F8F6] rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/10 flex items-center justify-center text-[#1A1A1A]">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1A1A] text-sm mb-0.5">
                            {doc.filename}
                          </div>
                          <div className="text-xs text-[#666] flex items-center gap-2">
                            PDF
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            {formatFileSize(doc.file_size)}
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            {doc.vector_count?.toLocaleString() || 0} vectors
                            {doc.total_pages && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                {doc.total_pages} pages
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {doc.status === 'processing' && doc.indexed_pages && doc.total_pages && (
                          <span className="text-xs text-[#666]">
                            {doc.indexed_pages}/{doc.total_pages} pages
                          </span>
                        )}
                        <Badge variant={status.variant} size="sm" dot>
                          {status.label}
                        </Badge>
                        {deleteConfirm === doc.document_id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(doc.document_id)}
                              disabled={isDeleting}
                              className="text-xs px-3 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs px-3 py-1 bg-[#F8F8F6] text-[#666] rounded-full hover:bg-[#F0EBD8] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(doc.document_id)}
                            className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar: Upload & Limits */}
        <div className="space-y-6">
          <Card
            variant="dark"
            className="p-8 text-center border-dashed border-2 border-white/20 hover:border-[#EAD07D] transition-colors cursor-pointer group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-[#EAD07D] mx-auto mb-6 group-hover:scale-110 transition-transform">
              {uploadMutation.isPending ? (
                <Loader2 size={32} className="animate-spin" />
              ) : (
                <UploadCloud size={32} />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Documents'}
            </h3>
            <p className="text-white/60 text-sm mb-6">
              Drag & drop PDF files here to train your agents.
            </p>
            <button
              disabled={uploadMutation.isPending}
              className="px-6 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-sm font-bold hover:bg-white transition-colors disabled:opacity-50"
            >
              Select Files
            </button>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-[#1A1A1A] mb-4">Storage Usage</h3>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-[#666]">Documents</span>
              <span className="font-bold text-[#1A1A1A]">{completedDocs} indexed</span>
            </div>
            <div className="h-2 w-full bg-[#F2F1EA] rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-[#1A1A1A] transition-all duration-500"
                style={{ width: `${Math.min((documents?.length || 0) * 10, 100)}%` }}
              ></div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#666]">
                  <div className="w-2 h-2 rounded-full bg-[#EAD07D]"></div> Total Size
                </div>
                <span className="font-bold">{formatFileSize(totalSize)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#666]">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div> Vectors
                </div>
                <span className="font-bold">{totalVectors.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          <div className="bg-[#EAD07D]/10 rounded-[2rem] p-6 border border-[#EAD07D]/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] shrink-0 font-bold">!</div>
              <div>
                <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">Tip</h4>
                <p className="text-xs text-[#666] leading-relaxed">
                  Upload sales playbooks, product documentation, and competitor analysis to help your AI agents provide more accurate responses.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
