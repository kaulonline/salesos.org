import { useState, useCallback } from 'react';
import {
  generateReportPdf,
  downloadReportPdf,
  exportElementToPdf,
  type ReportData,
} from '../utils/reportPdfGenerator';
import { logger } from '../lib/logger';

interface UseReportExportReturn {
  isExporting: boolean;
  error: string | null;
  exportReport: (report: ReportData, filename?: string) => Promise<void>;
  exportElement: (elementId: string, filename?: string) => Promise<void>;
  getReportBlob: (report: ReportData) => Promise<Blob | null>;
}

export function useReportExport(): UseReportExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportReport = useCallback(async (report: ReportData, filename?: string) => {
    setIsExporting(true);
    setError(null);

    try {
      await downloadReportPdf(report, filename);
      logger.info('Report exported successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export report';
      setError(message);
      logger.error('Report export failed:', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportElement = useCallback(async (elementId: string, filename?: string) => {
    setIsExporting(true);
    setError(null);

    try {
      await exportElementToPdf(elementId, filename);
      logger.info('Element exported to PDF successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export element';
      setError(message);
      logger.error('Element export failed:', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const getReportBlob = useCallback(async (report: ReportData): Promise<Blob | null> => {
    setIsExporting(true);
    setError(null);

    try {
      const blob = await generateReportPdf(report);
      return blob;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate report';
      setError(message);
      logger.error('Report generation failed:', err);
      return null;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    error,
    exportReport,
    exportElement,
    getReportBlob,
  };
}

export default useReportExport;
