import React, { useState } from 'react';
import {
  FileSignature,
  Send,
  Plus,
  Trash2,
  Loader2,
  X,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Eye,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useQuoteESignatures, useESignatureRequest, useDownloadSignedDocument } from '../../hooks/useESignature';
import type { ESignProvider, ESignStatus, CreateSignerDto } from '../../types/esignature';

interface ESignatureButtonProps {
  quoteId: string;
  quoteName?: string;
  disabled?: boolean;
}

const providerOptions: { value: ESignProvider; label: string }[] = [
  { value: 'DOCUSIGN', label: 'DocuSign' },
  { value: 'ADOBE_SIGN', label: 'Adobe Sign' },
  { value: 'HELLOSIGN', label: 'HelloSign' },
  { value: 'PANDADOC', label: 'PandaDoc' },
];

const statusConfig: Record<ESignStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-3.5 h-3.5" /> },
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3.5 h-3.5" /> },
  SENT: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: <Send className="w-3.5 h-3.5" /> },
  VIEWED: { label: 'Viewed', color: 'bg-indigo-100 text-indigo-700', icon: <Eye className="w-3.5 h-3.5" /> },
  SIGNED: { label: 'Signed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  VOIDED: { label: 'Voided', color: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  EXPIRED: { label: 'Expired', color: 'bg-orange-100 text-orange-700', icon: <Clock className="w-3.5 h-3.5" /> },
};

export function ESignatureButton({ quoteId, quoteName, disabled }: ESignatureButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { signatures, loading, create, isCreating, refetch } = useQuoteESignatures(quoteId);

  const handleOpenModal = () => {
    setShowModal(true);
    refetch();
  };

  const activeSignature = signatures.find((s) =>
    !['COMPLETED', 'DECLINED', 'VOIDED', 'EXPIRED'].includes(s.status)
  );

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={disabled}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        <FileSignature className="w-4 h-4" />
        E-Sign
        {activeSignature && (
          <span className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">E-Signature Requests</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setShowCreateForm(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {showCreateForm ? (
                <CreateESignatureForm
                  quoteId={quoteId}
                  quoteName={quoteName}
                  onSubmit={async (data) => {
                    await create(data);
                    setShowCreateForm(false);
                  }}
                  onCancel={() => setShowCreateForm(false)}
                  isSubmitting={isCreating}
                />
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500">
                      {signatures.length} request{signatures.length !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-3 py-1.5 text-sm bg-[#1C1C1C] text-white rounded-lg hover:bg-[#2C2C2C] transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Request
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : signatures.length === 0 ? (
                    <div className="text-center py-8">
                      <FileSignature className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No e-signature requests yet</p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Create Request
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {signatures.map((sig) => (
                        <ESignatureCard key={sig.id} signature={sig} onRefresh={refetch} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface CreateESignatureFormProps {
  quoteId: string;
  quoteName?: string;
  onSubmit: (data: {
    provider: ESignProvider;
    subject: string;
    message?: string;
    signers: CreateSignerDto[];
    sendImmediately?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function CreateESignatureForm({ quoteId, quoteName, onSubmit, onCancel, isSubmitting }: CreateESignatureFormProps) {
  const [provider, setProvider] = useState<ESignProvider>('DOCUSIGN');
  const [subject, setSubject] = useState(`Please sign: ${quoteName || 'Quote'}`);
  const [message, setMessage] = useState('');
  const [signers, setSigners] = useState<CreateSignerDto[]>([
    { name: '', email: '', role: 'Signer' },
  ]);
  const [sendImmediately, setSendImmediately] = useState(true);

  const handleAddSigner = () => {
    setSigners([...signers, { name: '', email: '', role: 'Signer', order: signers.length + 1 }]);
  };

  const handleRemoveSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const handleSignerChange = (index: number, field: keyof CreateSignerDto, value: string) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      provider,
      subject,
      message: message || undefined,
      signers: signers.map((s, i) => ({ ...s, order: i + 1 })),
      sendImmediately,
    });
  };

  const isValid = subject.trim() && signers.every((s) => s.name.trim() && s.email.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as ESignProvider)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors"
        >
          {providerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors"
          placeholder="Email subject line"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors resize-none"
          placeholder="Additional message to include in the email"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Signers</label>
          <button
            type="button"
            onClick={handleAddSigner}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Signer
          </button>
        </div>
        <div className="space-y-3">
          {signers.map((signer, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={signer.name}
                onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                placeholder="Name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors"
              />
              <input
                type="email"
                value={signer.email}
                onChange={(e) => handleSignerChange(index, 'email', e.target.value)}
                placeholder="Email"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors"
              />
              {signers.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSigner(index)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="sendImmediately"
          checked={sendImmediately}
          onChange={(e) => setSendImmediately(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-[#1C1C1C] focus:ring-[#1C1C1C]"
        />
        <label htmlFor="sendImmediately" className="text-sm text-gray-700">
          Send immediately after creation
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-4 py-2 bg-[#1C1C1C] text-white rounded-lg hover:bg-[#2C2C2C] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Request
        </button>
      </div>
    </form>
  );
}

interface ESignatureCardProps {
  signature: {
    id: string;
    provider: ESignProvider;
    status: ESignStatus;
    subject: string;
    signers: Array<{ name: string; email: string; status: string }>;
    createdAt: string;
    sentAt?: string;
    completedAt?: string;
  };
  onRefresh: () => void;
}

function ESignatureCard({ signature, onRefresh }: ESignatureCardProps) {
  const { refresh, isRefreshing } = useESignatureRequest(signature.id);
  const { download, isDownloading } = useDownloadSignedDocument();
  const statusCfg = statusConfig[signature.status];

  const handleRefresh = async () => {
    await refresh();
    onRefresh();
  };

  return (
    <Card className="border border-gray-200 p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium text-gray-900">{signature.subject}</p>
          <p className="text-xs text-gray-500">
            {signature.provider} • Created {format(new Date(signature.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <Badge className={`${statusCfg.color} flex items-center gap-1`}>
          {statusCfg.icon}
          {statusCfg.label}
        </Badge>
      </div>

      <div className="space-y-1 mb-3">
        {signature.signers.map((signer, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{signer.name}</span>
            <span className="text-gray-400">{signer.email}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          title="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
        {signature.status === 'COMPLETED' && (
          <button
            onClick={() => download(signature.id)}
            disabled={isDownloading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            title="Download Signed Document"
          >
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>
    </Card>
  );
}

export default ESignatureButton;
