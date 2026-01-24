import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  FileText,
  User,
  Building2,
  Mail,
  Phone,
  Linkedin,
  Briefcase,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useSmartCapture, CapturedContact } from '../../hooks/useSmartCapture';

interface SmartCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CaptureMode = 'camera' | 'upload' | 'text';

export function SmartCaptureModal({ isOpen, onClose }: SmartCaptureModalProps) {
  const [mode, setMode] = useState<CaptureMode>('upload');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    processFile,
    processNotes,
    capturedData,
    updateCapturedData,
    previewImage,
    isProcessing,
    isSaving,
    error,
    saveAsContact,
    saveAsLead,
    reset,
  } = useSmartCapture();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      processNotes(textInput);
    }
  };

  const handleClose = () => {
    reset();
    setTextInput('');
    setMode('upload');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#EAD07D]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Smart Capture</h3>
                <p className="text-xs text-gray-400">AI-powered contact extraction</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {!capturedData ? (
              <>
                {/* Mode Tabs */}
                <div className="flex gap-2 mb-4">
                  <ModeButton
                    icon={Upload}
                    label="Upload"
                    active={mode === 'upload'}
                    onClick={() => setMode('upload')}
                  />
                  <ModeButton
                    icon={Camera}
                    label="Camera"
                    active={mode === 'camera'}
                    onClick={() => setMode('camera')}
                  />
                  <ModeButton
                    icon={FileText}
                    label="Text"
                    active={mode === 'text'}
                    onClick={() => setMode('text')}
                  />
                </div>

                {/* Capture Area */}
                {mode === 'upload' && (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {isProcessing ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-[#EAD07D] animate-spin mb-3" />
                        <p className="text-sm text-gray-600">Processing image...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 mb-1">
                          Drop a business card or click to upload
                        </p>
                        <p className="text-xs text-gray-400">
                          Supports JPG, PNG, HEIC
                        </p>
                      </>
                    )}
                  </div>
                )}

                {mode === 'camera' && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                    <Camera className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Camera capture coming soon
                    </p>
                    <p className="text-xs text-gray-400">
                      Use upload for now
                    </p>
                  </div>
                )}

                {mode === 'text' && (
                  <div>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste meeting notes, email signatures, or any text containing contact information..."
                      className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:border-transparent"
                    />
                    <button
                      onClick={handleTextSubmit}
                      disabled={!textInput.trim() || isProcessing}
                      className="mt-3 w-full py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Extract Contact
                        </>
                      )}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}
              </>
            ) : (
              /* Captured Data Preview */
              <CapturedDataForm
                data={capturedData}
                previewImage={previewImage}
                onUpdate={updateCapturedData}
                onSaveAsContact={saveAsContact}
                onSaveAsLead={saveAsLead}
                onReset={reset}
                isSaving={isSaving}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-[#1A1A1A] text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function CapturedDataForm({
  data,
  previewImage,
  onUpdate,
  onSaveAsContact,
  onSaveAsLead,
  onReset,
  isSaving,
}: {
  data: CapturedContact;
  previewImage: string | null;
  onUpdate: (updates: Partial<CapturedContact>) => void;
  onSaveAsContact: () => void;
  onSaveAsLead: () => void;
  onReset: () => void;
  isSaving: boolean;
}) {
  return (
    <div>
      {/* Preview Image */}
      {previewImage && (
        <div className="mb-4">
          <img
            src={previewImage}
            alt="Captured"
            className="w-full h-32 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Confidence Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">Extraction confidence</span>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${
            data.confidence >= 0.8
              ? 'bg-green-100 text-green-700'
              : data.confidence >= 0.5
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {Math.round(data.confidence * 100)}%
        </span>
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            icon={User}
            label="First Name"
            value={data.firstName || ''}
            onChange={(v) => onUpdate({ firstName: v })}
          />
          <FormField
            icon={User}
            label="Last Name"
            value={data.lastName || ''}
            onChange={(v) => onUpdate({ lastName: v })}
          />
        </div>
        <FormField
          icon={Mail}
          label="Email"
          value={data.email || ''}
          onChange={(v) => onUpdate({ email: v })}
          type="email"
        />
        <FormField
          icon={Phone}
          label="Phone"
          value={data.phone || ''}
          onChange={(v) => onUpdate({ phone: v })}
          type="tel"
        />
        <FormField
          icon={Building2}
          label="Company"
          value={data.company || ''}
          onChange={(v) => onUpdate({ company: v })}
        />
        <FormField
          icon={Briefcase}
          label="Title"
          value={data.title || ''}
          onChange={(v) => onUpdate({ title: v })}
        />
        <FormField
          icon={Linkedin}
          label="LinkedIn"
          value={data.linkedIn || ''}
          onChange={(v) => onUpdate({ linkedIn: v })}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={onReset}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Start Over
        </button>
        <button
          onClick={onSaveAsLead}
          disabled={isSaving}
          className="flex-1 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-lg text-sm font-medium hover:bg-[#D4BA6A] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save as Lead
        </button>
        <button
          onClick={onSaveAsContact}
          disabled={isSaving}
          className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save as Contact
        </button>
      </div>
    </div>
  );
}

function FormField({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:border-transparent"
      />
    </div>
  );
}

export default SmartCaptureModal;
