import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  Download,
  ChevronDown,
} from 'lucide-react';
import {
  importExportApi,
  ImportEntityType,
  ImportPreviewResult,
  ImportResult,
  FieldMapping,
} from '../../api/importExport';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ImportEntityType;
  onSuccess?: (result: ImportResult) => void;
}

type ImportStep = 'upload' | 'mapping' | 'options' | 'importing' | 'complete';

export function ImportModal({ isOpen, onClose, entityType, onSuccess }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [options, setOptions] = useState({
    skipDuplicates: true,
    duplicateCheckField: 'email',
    updateExisting: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entityLabels: Record<ImportEntityType, string> = {
    LEAD: 'Leads',
    CONTACT: 'Contacts',
    ACCOUNT: 'Accounts',
    OPPORTUNITY: 'Opportunities',
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    try {
      const previewResult = await importExportApi.previewImport(selectedFile, entityType);
      setPreview(previewResult);
      setMappings(previewResult.suggestedMappings);
      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to preview file');
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!file) return;

    setStep('importing');
    setError(null);

    try {
      const importResult = await importExportApi.importRecords(file, {
        entityType,
        fieldMappings: mappings,
        ...options,
      });
      setResult(importResult);
      setStep('complete');
      onSuccess?.(importResult);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Import failed');
      setStep('options');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await importExportApi.getImportTemplate(entityType, 'csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType.toLowerCase()}_template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download template:', err);
    }
  };

  const updateMapping = (index: number, targetField: string) => {
    const newMappings = [...mappings];
    if (newMappings[index]) {
      newMappings[index] = { ...newMappings[index], targetField };
    }
    setMappings(newMappings);
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMappings([]);
    setResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 id="import-modal-title" className="text-lg font-semibold text-gray-900">
                Import {entityLabels[entityType]}
              </h2>
              <p className="text-sm text-gray-500">
                Upload a CSV or Excel file to import records
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {['upload', 'mapping', 'options', 'complete'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === s || (step === 'importing' && s === 'options')
                          ? 'bg-[#1A1A1A] text-white'
                          : ['upload', 'mapping', 'options'].indexOf(step) > i || step === 'complete'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {['upload', 'mapping', 'options'].indexOf(step) > i || step === 'complete' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700 capitalize hidden sm:inline">
                      {s === 'complete' ? 'Done' : s}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                      <div
                        className={`h-full bg-green-500 transition-all ${
                          ['upload', 'mapping', 'options'].indexOf(step) > i || step === 'complete'
                            ? 'w-full'
                            : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Upload Step */}
            {step === 'upload' && (
              <div>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="sr-only"
                  />
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-12 h-12 text-[#EAD07D] animate-spin mb-3" />
                      <p className="text-gray-600">Analyzing file...</p>
                    </div>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-1">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-sm text-gray-400">
                        Supports CSV, Excel (.xlsx, .xls)
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={handleDownloadTemplate}
                    className="text-sm text-[#1A1A1A] hover:underline flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download template
                  </button>
                </div>
              </div>
            )}

            {/* Mapping Step */}
            {step === 'mapping' && preview && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Found {preview.totalRows} rows. Map your columns to the correct fields:
                </p>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {preview.headers.map((header, index) => {
                    const mapping = mappings.find((m) => m.sourceField === header);
                    return (
                      <div
                        key={header}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{header}</p>
                          <p className="text-xs text-gray-500 truncate">
                            Sample: {preview.sampleRows[0]?.[header] || 'N/A'}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="relative">
                          <select
                            value={mapping?.targetField || ''}
                            onChange={(e) => {
                              const mappingIndex = mappings.findIndex(
                                (m) => m.sourceField === header
                              );
                              if (mappingIndex >= 0) {
                                updateMapping(mappingIndex, e.target.value);
                              } else if (e.target.value) {
                                setMappings([
                                  ...mappings,
                                  { sourceField: header, targetField: e.target.value },
                                ]);
                              }
                            }}
                            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                          >
                            <option value="">Skip this column</option>
                            {getTargetFields(entityType).map((field) => (
                              <option key={field.name} value={field.name}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Options Step */}
            {step === 'options' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={options.skipDuplicates}
                      onChange={(e) =>
                        setOptions({ ...options, skipDuplicates: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1A1A1A] focus:ring-[#EAD07D]"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Skip duplicates</p>
                      <p className="text-sm text-gray-500">
                        Records with matching values will be skipped
                      </p>
                    </div>
                  </label>
                </div>

                {options.skipDuplicates && (
                  <div className="pl-7">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check duplicates by field
                    </label>
                    <select
                      value={options.duplicateCheckField}
                      onChange={(e) =>
                        setOptions({ ...options, duplicateCheckField: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                    >
                      {getTargetFields(entityType).map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={options.updateExisting}
                      onChange={(e) =>
                        setOptions({ ...options, updateExisting: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1A1A1A] focus:ring-[#EAD07D]"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Update existing records</p>
                      <p className="text-sm text-gray-500">
                        Matching records will be updated with new data
                      </p>
                    </div>
                  </label>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Ready to import:</strong> {preview?.totalRows} records with{' '}
                    {mappings.filter((m) => m.targetField).length} mapped fields
                  </p>
                </div>
              </div>
            )}

            {/* Importing Step */}
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-[#EAD07D] animate-spin mb-4" />
                <p className="text-lg font-medium text-gray-900">Importing records...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
            )}

            {/* Complete Step */}
            {step === 'complete' && result && (
              <div className="text-center py-8">
                <div
                  className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    result.status === 'COMPLETED' ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {result.status === 'COMPLETED' ? (
                    <Check className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {result.status === 'COMPLETED' ? 'Import Complete!' : 'Import Failed'}
                </h3>

                <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
                    <p className="text-sm text-green-700">Imported</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{result.skippedCount}</p>
                    <p className="text-sm text-yellow-700">Skipped</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{result.failedCount}</p>
                    <p className="text-sm text-red-700">Failed</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="text-left mt-4 max-h-40 overflow-y-auto">
                    <p className="text-sm font-medium text-gray-700 mb-2">Errors:</p>
                    {result.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-sm text-red-600">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-sm text-gray-500">
                        ...and {result.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            {step !== 'upload' && step !== 'complete' && step !== 'importing' && (
              <button
                onClick={() => {
                  if (step === 'mapping') setStep('upload');
                  if (step === 'options') setStep('mapping');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Back
              </button>
            )}
            <div className="ml-auto flex gap-2">
              {step === 'complete' ? (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors"
                >
                  Done
                </button>
              ) : step === 'mapping' ? (
                <button
                  onClick={() => setStep('options')}
                  disabled={mappings.filter((m) => m.targetField).length === 0}
                  className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              ) : step === 'options' ? (
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Start Import
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function getTargetFields(entityType: ImportEntityType) {
  switch (entityType) {
    case 'LEAD':
      return [
        { name: 'firstName', label: 'First Name' },
        { name: 'lastName', label: 'Last Name' },
        { name: 'email', label: 'Email' },
        { name: 'phone', label: 'Phone' },
        { name: 'company', label: 'Company' },
        { name: 'title', label: 'Title' },
        { name: 'status', label: 'Status' },
        { name: 'rating', label: 'Rating' },
        { name: 'leadSource', label: 'Lead Source' },
        { name: 'industry', label: 'Industry' },
        { name: 'website', label: 'Website' },
        { name: 'address', label: 'Address' },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State' },
        { name: 'country', label: 'Country' },
        { name: 'postalCode', label: 'Postal Code' },
      ];
    case 'CONTACT':
      return [
        { name: 'firstName', label: 'First Name' },
        { name: 'lastName', label: 'Last Name' },
        { name: 'email', label: 'Email' },
        { name: 'phone', label: 'Phone' },
        { name: 'mobilePhone', label: 'Mobile Phone' },
        { name: 'title', label: 'Title' },
        { name: 'department', label: 'Department' },
        { name: 'mailingAddress', label: 'Mailing Address' },
      ];
    case 'ACCOUNT':
      return [
        { name: 'name', label: 'Account Name' },
        { name: 'type', label: 'Type' },
        { name: 'industry', label: 'Industry' },
        { name: 'phone', label: 'Phone' },
        { name: 'website', label: 'Website' },
        { name: 'annualRevenue', label: 'Annual Revenue' },
        { name: 'numberOfEmployees', label: 'Number of Employees' },
        { name: 'billingAddress', label: 'Billing Address' },
        { name: 'billingCity', label: 'Billing City' },
        { name: 'billingState', label: 'Billing State' },
        { name: 'billingCountry', label: 'Billing Country' },
      ];
    case 'OPPORTUNITY':
      return [
        { name: 'name', label: 'Opportunity Name' },
        { name: 'stage', label: 'Stage' },
        { name: 'amount', label: 'Amount' },
        { name: 'probability', label: 'Probability' },
        { name: 'closeDate', label: 'Close Date' },
        { name: 'type', label: 'Type' },
        { name: 'opportunitySource', label: 'Source' },
        { name: 'nextStep', label: 'Next Step' },
      ];
    default:
      return [];
  }
}

export default ImportModal;
