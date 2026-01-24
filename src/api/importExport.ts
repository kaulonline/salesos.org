import client from './client';

export type ImportEntityType = 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY';
export type ExportEntityType = 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY' | 'ACTIVITY' | 'TASK';
export type ExportFormat = 'CSV' | 'EXCEL' | 'JSON';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  defaultValue?: string;
  transformation?: string;
}

export interface ImportOptions {
  entityType: ImportEntityType;
  fieldMappings?: FieldMapping[];
  skipDuplicates?: boolean;
  duplicateCheckField?: string;
  updateExisting?: boolean;
  skipFirstRow?: boolean;
  dateFormat?: string;
}

export interface ImportPreviewResult {
  headers: string[];
  sampleRows: Record<string, any>[];
  totalRows: number;
  suggestedMappings: FieldMapping[];
  detectedFormat: string;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, any>;
}

export interface ImportResult {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  entityType: ImportEntityType;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ImportError[];
  startedAt: string;
  completedAt?: string;
}

export interface ExportRequest {
  entityType: ExportEntityType;
  format?: ExportFormat;
  fields?: string[];
  filters?: Record<string, any>;
  startDate?: string;
  endDate?: string;
  ids?: string[];
}

export interface ExportResult {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  entityType: ExportEntityType;
  format: ExportFormat;
  totalRecords: number;
  downloadUrl?: string;
  fileName?: string;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
  error?: string;
}

export interface ExportFieldDefinition {
  name: string;
  label: string;
  type: string;
  required?: boolean;
}

export const importExportApi = {
  /**
   * Preview import file
   */
  previewImport: async (file: File, entityType: ImportEntityType): Promise<ImportPreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await client.post<ImportPreviewResult>(
      `/import-export/preview?entityType=${entityType}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Import records from file
   */
  importRecords: async (file: File, options: ImportOptions): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', options.entityType);

    if (options.fieldMappings) {
      formData.append('fieldMappings', JSON.stringify(options.fieldMappings));
    }
    if (options.skipDuplicates !== undefined) {
      formData.append('skipDuplicates', String(options.skipDuplicates));
    }
    if (options.duplicateCheckField) {
      formData.append('duplicateCheckField', options.duplicateCheckField);
    }
    if (options.updateExisting !== undefined) {
      formData.append('updateExisting', String(options.updateExisting));
    }

    const response = await client.post<ImportResult>('/import-export/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Export records
   */
  exportRecords: async (request: ExportRequest): Promise<ExportResult> => {
    const response = await client.post<ExportResult>('/import-export/export', request);
    return response.data;
  },

  /**
   * Download exported file
   */
  downloadExport: async (fileName: string): Promise<Blob> => {
    const response = await client.get(`/import-export/download/${fileName}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get export fields for an entity type
   */
  getExportFields: async (entityType: ExportEntityType): Promise<ExportFieldDefinition[]> => {
    const response = await client.get<ExportFieldDefinition[]>(`/import-export/fields/${entityType}`);
    return response.data;
  },

  /**
   * Download import template
   */
  getImportTemplate: async (entityType: ImportEntityType, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> => {
    const response = await client.get(`/import-export/template/${entityType}?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default importExportApi;
