import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import {
  importExportApi,
  ExportEntityType,
  ExportFormat,
  ExportFieldDefinition,
  ExportResult,
} from '../../api/importExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ExportEntityType;
  selectedIds?: string[];
  filters?: Record<string, any>;
}

export function ExportModal({
  isOpen,
  onClose,
  entityType,
  selectedIds,
  filters,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('CSV');
  const [fields, setFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<ExportFieldDefinition[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entityLabels: Record<ExportEntityType, string> = {
    LEAD: 'Leads',
    CONTACT: 'Contacts',
    ACCOUNT: 'Accounts',
    OPPORTUNITY: 'Opportunities',
    ACTIVITY: 'Activities',
    TASK: 'Tasks',
  };

  useEffect(() => {
    if (isOpen) {
      loadFields();
    }
  }, [isOpen, entityType]);

  const loadFields = async () => {
    try {
      const fieldDefs = await importExportApi.getExportFields(entityType);
      setAvailableFields(fieldDefs);
      setFields(fieldDefs.map((f) => f.name));
    } catch (err) {
      console.error('Failed to load fields:', err);
    }
  };

  const handleToggleField = (fieldName: string) => {
    if (fields.includes(fieldName)) {
      setFields(fields.filter((f) => f !== fieldName));
      setSelectAll(false);
    } else {
      const newFields = [...fields, fieldName];
      setFields(newFields);
      setSelectAll(newFields.length === availableFields.length);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setFields([]);
    } else {
      setFields(availableFields.map((f) => f.name));
    }
    setSelectAll(!selectAll);
  };

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const exportResult = await importExportApi.exportRecords({
        entityType,
        format,
        fields: selectAll ? undefined : fields,
        filters,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        ids: selectedIds,
      });

      setResult(exportResult);

      // Auto-download if completed
      if (exportResult.status === 'COMPLETED' && exportResult.downloadUrl) {
        await downloadFile(exportResult.fileName || 'export');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (fileName: string) => {
    try {
      const blob = await importExportApi.downloadExport(fileName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setStartDate('');
    setEndDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 id="export-modal-title" className="text-lg font-semibold text-gray-900">
                Export {entityLabels[entityType]}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedIds?.length
                  ? `Export ${selectedIds.length} selected records`
                  : 'Export all matching records'}
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

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {result?.status === 'COMPLETED' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Export Complete!</h3>
                <p className="text-gray-500 mb-4">{result.totalRecords} records exported</p>
                {result.fileName && (
                  <button
                    onClick={() => downloadFile(result.fileName!)}
                    className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    Download Again
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Format Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CSV', 'EXCEL', 'JSON'] as ExportFormat[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          format === f
                            ? 'border-[#1A1A1A] bg-[#1A1A1A]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FileSpreadsheet
                          className={`w-5 h-5 mx-auto mb-1 ${
                            format === f ? 'text-[#1A1A1A]' : 'text-gray-400'
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            format === f ? 'text-[#1A1A1A]' : 'text-gray-600'
                          }`}
                        >
                          {f}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                {!selectedIds?.length && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date Range (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                        placeholder="Start date"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                        placeholder="End date"
                      />
                    </div>
                  </div>
                )}

                {/* Field Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Fields to Export</label>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-[#1A1A1A] hover:underline"
                    >
                      {selectAll ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {availableFields.map((field) => (
                      <label
                        key={field.name}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={fields.includes(field.name)}
                          onChange={() => handleToggleField(field.name)}
                          className="w-4 h-4 rounded border-gray-300 text-[#1A1A1A] focus:ring-[#EAD07D]"
                        />
                        <span className="text-sm text-gray-700">{field.label}</span>
                        {field.required && (
                          <span className="text-xs text-red-500">*</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              {result?.status === 'COMPLETED' ? 'Close' : 'Cancel'}
            </button>
            {result?.status !== 'COMPLETED' && (
              <button
                onClick={handleExport}
                disabled={isLoading || fields.length === 0}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ExportModal;
