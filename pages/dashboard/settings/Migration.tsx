import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, AlertCircle, Download, FileText, Loader2 } from 'lucide-react';
import {
  useSuggestFieldMappings,
  useDetectCRM,
  useCreateMigration,
  useMigrationStatus,
} from '../../../src/hooks/useMigrations';
import type { EntityType, SupportedCRM, MigrationFieldMapping } from '../../../src/api/migrations';
import { downloadCRMTemplate } from '../../../src/api/migrations';

// CRM logos/icons
const CRM_OPTIONS: Array<{ id: SupportedCRM; name: string; description: string }> = [
  { id: 'salesforce', name: 'Salesforce', description: 'Migrate leads, contacts, accounts, and opportunities' },
  { id: 'hubspot', name: 'HubSpot', description: 'Import your HubSpot CRM data' },
  { id: 'pipedrive', name: 'Pipedrive', description: 'Move your sales pipeline data' },
  { id: 'zoho', name: 'Zoho CRM', description: 'Import from Zoho CRM' },
  { id: 'monday', name: 'Monday.com', description: 'Migrate your Monday.com boards' },
];

const ENTITY_TYPES: Array<{ id: EntityType; name: string; description: string }> = [
  { id: 'LEAD', name: 'Leads', description: 'Potential customers and prospects' },
  { id: 'CONTACT', name: 'Contacts', description: 'People at your customer accounts' },
  { id: 'ACCOUNT', name: 'Accounts', description: 'Companies and organizations' },
  { id: 'OPPORTUNITY', name: 'Opportunities', description: 'Sales deals and pipelines' },
];

export default function Migration() {
  const [step, setStep] = useState(1);
  const [selectedCRM, setSelectedCRM] = useState<SupportedCRM | null>(null);
  const [entityType, setEntityType] = useState<EntityType>('LEAD');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<MigrationFieldMapping[]>([]);
  const [migrationId, setMigrationId] = useState<string | null>(null);

  const suggestMappingsMutation = useSuggestFieldMappings();
  const detectCRMMutation = useDetectCRM();
  const createMigrationMutation = useCreateMigration();
  const { data: migrationStatus } = useMigrationStatus(migrationId, 2000);

  // Parse CSV file
  const parseCSV = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Parse preview rows (first 5 data rows)
    const preview = lines.slice(1, 6).map(line => {
      return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });

    return { headers, preview, totalRows: lines.length - 1 };
  }, []);

  // Step 1: Choose CRM
  const handleCRMSelect = (crm: SupportedCRM) => {
    setSelectedCRM(crm);
  };

  const handleEntitySelect = (entity: EntityType) => {
    setEntityType(entity);
    setStep(2);
  };

  // Step 2: Upload File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadedFile(file);
      const { headers, preview, totalRows } = await parseCSV(file);
      setCsvHeaders(headers);
      setCsvPreview(preview);

      // Auto-detect CRM if not selected
      if (!selectedCRM) {
        const detection = await detectCRMMutation.mutateAsync(headers);
        if (detection.crm !== 'unknown' && detection.confidence > 70) {
          setSelectedCRM(detection.crm as SupportedCRM);
        }
      }

      setStep(3);
    } catch (error) {
      alert('Failed to parse CSV file. Please check the file format.');
    }
  };

  // Step 3: AI Field Mapping
  const handleGenerateMappings = async () => {
    if (!csvHeaders.length) return;

    try {
      const suggestions = await suggestMappingsMutation.mutateAsync({
        headers: csvHeaders,
        entityType,
        crmType: selectedCRM || undefined,
      });

      // Convert suggestions to field mappings
      const mappings: MigrationFieldMapping[] = suggestions.map(s => ({
        csvColumn: s.csvColumn,
        salesosField: s.suggestedField,
        transform: s.transform,
      }));

      setFieldMappings(mappings);
    } catch (error) {
      alert('Failed to generate field mappings. Please try manual mapping.');
    }
  };

  const handleMappingChange = (csvColumn: string, salesosField: string) => {
    setFieldMappings(prev => {
      const existing = prev.find(m => m.csvColumn === csvColumn);
      if (existing) {
        return prev.map(m => m.csvColumn === csvColumn ? { ...m, salesosField } : m);
      } else {
        return [...prev, { csvColumn, salesosField }];
      }
    });
  };

  const handleRemoveMapping = (csvColumn: string) => {
    setFieldMappings(prev => prev.filter(m => m.csvColumn !== csvColumn));
  };

  // Step 4: Review & Start Import
  const handleStartImport = async () => {
    if (!uploadedFile || !fieldMappings.length) return;

    try {
      const migration = await createMigrationMutation.mutateAsync({
        sourceCRM: selectedCRM || 'unknown',
        entityType,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        totalRows: csvPreview.length + 1, // Approximate, will be updated during actual import
        fieldMappings,
      });

      setMigrationId(migration.id);
      setStep(5);

      // TODO: Actually trigger the import via a background job or stream
      // For now, the migration is created and we'd poll for status
    } catch (error) {
      alert('Failed to start migration. Please try again.');
    }
  };

  const handleDownloadTemplate = () => {
    if (selectedCRM && entityType) {
      downloadCRMTemplate(selectedCRM, entityType);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">CRM Migration</h1>
          <p className="text-[#666] mt-1">Import your data from another CRM in minutes</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-black/5">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Choose CRM' },
              { num: 2, label: 'Upload File' },
              { num: 3, label: 'Map Fields' },
              { num: 4, label: 'Review' },
              { num: 5, label: 'Complete' },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step > s.num
                        ? 'bg-[#93C01F] text-white'
                        : step === s.num
                        ? 'bg-[#EAD07D] text-[#1A1A1A]'
                        : 'bg-[#F0EBD8] text-[#999]'
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 size={20} /> : s.num}
                  </div>
                  <span className="text-xs text-[#666] mt-2 hidden sm:block">{s.label}</span>
                </div>
                {i < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                      step > s.num ? 'bg-[#93C01F]' : 'bg-[#F0EBD8]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
          {/* Step 1: Choose CRM */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Choose Your Source CRM</h2>
              <p className="text-[#666] mb-6">Select the CRM you're migrating from</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {CRM_OPTIONS.map(crm => (
                  <button
                    key={crm.id}
                    onClick={() => handleCRMSelect(crm.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      selectedCRM === crm.id
                        ? 'border-[#EAD07D] bg-[#EAD07D]/10'
                        : 'border-black/10 hover:border-[#EAD07D]/50'
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">{crm.name}</h3>
                    <p className="text-sm text-[#666]">{crm.description}</p>
                  </button>
                ))}
              </div>

              {selectedCRM && (
                <div>
                  <h3 className="text-xl font-medium text-[#1A1A1A] mb-4">What do you want to import?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ENTITY_TYPES.map(entity => (
                      <button
                        key={entity.id}
                        onClick={() => handleEntitySelect(entity.id)}
                        className="p-5 rounded-2xl border border-black/10 hover:border-[#EAD07D] text-left transition-all hover:bg-[#F8F8F6]"
                      >
                        <h4 className="text-lg font-semibold text-[#1A1A1A] mb-1">{entity.name}</h4>
                        <p className="text-sm text-[#666]">{entity.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Upload CSV File</h2>
              <p className="text-[#666] mb-6">
                Upload your {selectedCRM ? CRM_OPTIONS.find(c => c.id === selectedCRM)?.name : 'CRM'} export file
              </p>

              <div className="mb-6">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-black/20 rounded-2xl cursor-pointer hover:border-[#EAD07D] transition-colors bg-[#F8F8F6]"
                >
                  <Upload size={48} className="text-[#666] mb-4" />
                  <p className="text-lg font-medium text-[#1A1A1A] mb-1">
                    {uploadedFile ? uploadedFile.name : 'Drop your CSV file here'}
                  </p>
                  <p className="text-sm text-[#666]">or click to browse</p>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedCRM && (
                <div className="bg-[#F0EBD8] rounded-2xl p-4 flex items-start gap-3">
                  <FileText size={20} className="text-[#666] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1A1A1A] mb-1">Need a template?</p>
                    <p className="text-sm text-[#666] mb-3">
                      Download our {CRM_OPTIONS.find(c => c.id === selectedCRM)?.name} import template to ensure your file is formatted correctly.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors inline-flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download Template
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Map Fields */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Map Your Fields</h2>
              <p className="text-[#666] mb-6">
                Review and adjust how your CSV columns map to SalesOS fields
              </p>

              {!fieldMappings.length && (
                <div className="text-center py-8">
                  <button
                    onClick={handleGenerateMappings}
                    disabled={suggestMappingsMutation.isPending}
                    className="px-6 py-3 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] hover:bg-[#EAD07D]/80 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {suggestMappingsMutation.isPending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating AI Mappings...
                      </>
                    ) : (
                      'Generate AI Mappings'
                    )}
                  </button>
                </div>
              )}

              {fieldMappings.length > 0 && (
                <div>
                  <div className="space-y-3 mb-6">
                    {csvHeaders.map(header => {
                      const mapping = fieldMappings.find(m => m.csvColumn === header);
                      return (
                        <div key={header} className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F8F6]">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#1A1A1A]">{header}</p>
                            <p className="text-xs text-[#666]">
                              Sample: {csvPreview[0]?.[csvHeaders.indexOf(header)] || 'N/A'}
                            </p>
                          </div>
                          <ArrowRight size={20} className="text-[#999]" />
                          <div className="flex-1">
                            <select
                              value={mapping?.salesosField || ''}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
                            >
                              <option value="">Skip this field</option>
                              <option value="firstName">First Name</option>
                              <option value="lastName">Last Name</option>
                              <option value="email">Email</option>
                              <option value="phone">Phone</option>
                              <option value="mobile">Mobile</option>
                              <option value="company">Company</option>
                              <option value="title">Title</option>
                              <option value="status">Status</option>
                              <option value="leadSource">Lead Source</option>
                              <option value="street">Street</option>
                              <option value="city">City</option>
                              <option value="state">State</option>
                              <option value="postalCode">Postal Code</option>
                              <option value="country">Country</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm inline-flex items-center gap-2"
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm inline-flex items-center gap-2"
                    >
                      Review Import
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Import */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Review & Start Import</h2>
              <p className="text-[#666] mb-6">Confirm your import settings before starting</p>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between p-4 rounded-xl bg-[#F8F8F6]">
                  <span className="text-sm text-[#666]">Source CRM</span>
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    {CRM_OPTIONS.find(c => c.id === selectedCRM)?.name}
                  </span>
                </div>
                <div className="flex justify-between p-4 rounded-xl bg-[#F8F8F6]">
                  <span className="text-sm text-[#666]">Entity Type</span>
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    {ENTITY_TYPES.find(e => e.id === entityType)?.name}
                  </span>
                </div>
                <div className="flex justify-between p-4 rounded-xl bg-[#F8F8F6]">
                  <span className="text-sm text-[#666]">File Name</span>
                  <span className="text-sm font-medium text-[#1A1A1A]">{uploadedFile?.name}</span>
                </div>
                <div className="flex justify-between p-4 rounded-xl bg-[#F8F8F6]">
                  <span className="text-sm text-[#666]">Total Rows</span>
                  <span className="text-sm font-medium text-[#1A1A1A]">~{csvPreview.length}</span>
                </div>
                <div className="flex justify-between p-4 rounded-xl bg-[#F8F8F6]">
                  <span className="text-sm text-[#666]">Fields Mapped</span>
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    {fieldMappings.length} of {csvHeaders.length}
                  </span>
                </div>
              </div>

              <div className="bg-[#EAD07D]/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="text-[#1A1A1A] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A] mb-1">Important</p>
                  <p className="text-sm text-[#666]">
                    This import will create new {ENTITY_TYPES.find(e => e.id === entityType)?.name.toLowerCase()} in your SalesOS account.
                    Duplicate detection is enabled by default.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  onClick={handleStartImport}
                  disabled={createMigrationMutation.isPending}
                  className="px-5 py-2.5 rounded-full bg-[#93C01F] text-white hover:bg-[#93C01F]/80 transition-colors font-medium text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {createMigrationMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Starting Import...
                    </>
                  ) : (
                    <>
                      Start Import
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 5 && migrationStatus && (
            <div className="text-center py-8">
              {migrationStatus.status === 'COMPLETED' ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} className="text-[#93C01F]" />
                  </div>
                  <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Import Complete!</h2>
                  <p className="text-[#666] mb-6">
                    Successfully imported {migrationStatus.successCount} of {migrationStatus.totalRows} records
                  </p>

                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                    <div className="p-4 rounded-xl bg-[#93C01F]/20">
                      <p className="text-2xl font-light text-[#93C01F]">{migrationStatus.successCount}</p>
                      <p className="text-xs text-[#666]">Success</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-100">
                      <p className="text-2xl font-light text-red-600">{migrationStatus.failedCount}</p>
                      <p className="text-xs text-[#666]">Failed</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F0EBD8]">
                      <p className="text-2xl font-light text-[#666]">{migrationStatus.skippedCount}</p>
                      <p className="text-xs text-[#666]">Skipped</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
                    >
                      Go to Dashboard
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm"
                    >
                      Import Another
                    </button>
                  </div>
                </>
              ) : migrationStatus.status === 'FAILED' ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={40} className="text-red-600" />
                  </div>
                  <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Import Failed</h2>
                  <p className="text-[#666] mb-6">There was an error processing your import</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
                  >
                    Try Again
                  </button>
                </>
              ) : (
                <>
                  <Loader2 size={48} className="text-[#EAD07D] animate-spin mx-auto mb-4" />
                  <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Importing Your Data...</h2>
                  <p className="text-[#666] mb-6">
                    Processing {migrationStatus.successCount} of {migrationStatus.totalRows} records
                  </p>
                  <div className="max-w-md mx-auto">
                    <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EAD07D] rounded-full transition-all duration-500"
                        style={{
                          width: `${((migrationStatus.successCount + migrationStatus.failedCount) / migrationStatus.totalRows) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
