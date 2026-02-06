/**
 * Report PDF Generator
 * Creates downloadable PDF reports with charts and data tables
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportData {
  title: string;
  subtitle?: string;
  dateRange?: { start: string; end: string };
  generatedAt?: string;
  summary?: {
    label: string;
    value: string | number;
    change?: string;
  }[];
  sections?: ReportSection[];
}

export interface ReportSection {
  title: string;
  type: 'table' | 'chart' | 'text' | 'metrics';
  data?: unknown;
  chartElementId?: string;
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

// Brand colors
const COLORS = {
  primary: '#1A1A1A',
  secondary: '#666666',
  accent: '#EAD07D',
  success: '#93C01F',
  background: '#F2F1EA',
  white: '#FFFFFF',
};

/**
 * Generate a PDF report from structured data
 */
export async function generateReportPdf(report: ReportData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper to add new page if needed
  const checkPageBreak = (height: number) => {
    if (yPosition + height > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header with logo placeholder and title
  pdf.setFillColor(COLORS.primary);
  pdf.rect(0, 0, pageWidth, 35, 'F');

  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SalesOS', margin, 18);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sales Intelligence Report', margin, 26);

  yPosition = 45;

  // Report title
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.title, margin, yPosition);
  yPosition += 8;

  if (report.subtitle) {
    pdf.setFontSize(12);
    pdf.setTextColor(COLORS.secondary);
    pdf.setFont('helvetica', 'normal');
    pdf.text(report.subtitle, margin, yPosition);
    yPosition += 6;
  }

  // Date range and generated timestamp
  pdf.setFontSize(9);
  pdf.setTextColor(COLORS.secondary);

  if (report.dateRange) {
    pdf.text(`Period: ${report.dateRange.start} - ${report.dateRange.end}`, margin, yPosition);
    yPosition += 5;
  }

  const timestamp = report.generatedAt || new Date().toLocaleString();
  pdf.text(`Generated: ${timestamp}`, margin, yPosition);
  yPosition += 10;

  // Summary metrics
  if (report.summary && report.summary.length > 0) {
    checkPageBreak(30);

    const metricWidth = (pageWidth - 2 * margin) / Math.min(report.summary.length, 4);

    report.summary.forEach((metric, index) => {
      const x = margin + (index % 4) * metricWidth;

      // Metric box
      pdf.setFillColor(COLORS.background);
      pdf.roundedRect(x, yPosition, metricWidth - 4, 25, 3, 3, 'F');

      // Value
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(COLORS.primary);
      pdf.text(String(metric.value), x + 5, yPosition + 12);

      // Label
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(COLORS.secondary);
      pdf.text(metric.label, x + 5, yPosition + 19);

      // Change indicator
      if (metric.change) {
        const changeColor = metric.change.startsWith('+') ? COLORS.success : '#EF4444';
        pdf.setTextColor(changeColor);
        pdf.setFontSize(8);
        pdf.text(metric.change, x + metricWidth - 20, yPosition + 12);
      }
    });

    yPosition += 32;
  }

  // Sections
  if (report.sections) {
    for (const section of report.sections) {
      checkPageBreak(20);

      // Section title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(COLORS.primary);
      pdf.text(section.title, margin, yPosition);
      yPosition += 8;

      switch (section.type) {
        case 'table':
          yPosition = renderTable(pdf, section.data as TableData, margin, yPosition, pageWidth);
          break;

        case 'chart':
          if (section.chartElementId) {
            yPosition = await renderChartFromElement(pdf, section.chartElementId, margin, yPosition, pageWidth);
          }
          break;

        case 'text':
          yPosition = renderText(pdf, section.data as string, margin, yPosition, pageWidth);
          break;

        case 'metrics':
          yPosition = renderMetrics(pdf, section.data as ReportData['summary'], margin, yPosition, pageWidth);
          break;
      }

      yPosition += 10;
    }
  }

  // Footer on each page
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // Footer line
    pdf.setDrawColor(COLORS.secondary);
    pdf.setLineWidth(0.1);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Footer text
    pdf.setFontSize(8);
    pdf.setTextColor(COLORS.secondary);
    pdf.setFont('helvetica', 'normal');
    pdf.text('SalesOS - Sales Intelligence Report', margin, pageHeight - 10);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
  }

  return pdf.output('blob');
}

/**
 * Render a data table
 */
function renderTable(
  pdf: jsPDF,
  data: TableData,
  margin: number,
  startY: number,
  pageWidth: number
): number {
  if (!data || !data.headers || !data.rows) return startY;

  const colWidth = (pageWidth - 2 * margin) / data.headers.length;
  let y = startY;

  // Header row
  pdf.setFillColor(COLORS.primary);
  pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'F');

  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');

  data.headers.forEach((header, i) => {
    pdf.text(header, margin + i * colWidth + 2, y + 5.5);
  });

  y += 8;

  // Data rows
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLORS.primary);

  data.rows.forEach((row, rowIndex) => {
    // Alternating row colors
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(COLORS.background);
      pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
    }

    row.forEach((cell, cellIndex) => {
      const cellText = String(cell);
      const truncated = cellText.length > 25 ? cellText.substring(0, 22) + '...' : cellText;
      pdf.text(truncated, margin + cellIndex * colWidth + 2, y + 5);
    });

    y += 7;

    // Check for page break
    if (y > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      y = 15;
    }
  });

  return y + 5;
}

/**
 * Render a chart from a DOM element
 */
async function renderChartFromElement(
  pdf: jsPDF,
  elementId: string,
  margin: number,
  startY: number,
  pageWidth: number
): Promise<number> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Chart element not found: ${elementId}`);
    return startY;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: COLORS.white,
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check for page break
    if (startY + imgHeight > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      startY = 15;
    }

    pdf.addImage(imgData, 'PNG', margin, startY, imgWidth, imgHeight);
    return startY + imgHeight + 5;
  } catch (error) {
    console.error('Error rendering chart:', error);
    return startY;
  }
}

/**
 * Render text content
 */
function renderText(
  pdf: jsPDF,
  text: string,
  margin: number,
  startY: number,
  pageWidth: number
): number {
  if (!text) return startY;

  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.secondary);
  pdf.setFont('helvetica', 'normal');

  const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
  pdf.text(lines, margin, startY);

  return startY + lines.length * 5;
}

/**
 * Render metrics grid
 */
function renderMetrics(
  pdf: jsPDF,
  metrics: ReportData['summary'],
  margin: number,
  startY: number,
  pageWidth: number
): number {
  if (!metrics || metrics.length === 0) return startY;

  const metricWidth = (pageWidth - 2 * margin) / Math.min(metrics.length, 3);

  metrics.forEach((metric, index) => {
    const x = margin + (index % 3) * metricWidth;
    const row = Math.floor(index / 3);
    const y = startY + row * 20;

    pdf.setFillColor(COLORS.background);
    pdf.roundedRect(x, y, metricWidth - 4, 18, 2, 2, 'F');

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(COLORS.primary);
    pdf.text(String(metric.value), x + 4, y + 9);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(COLORS.secondary);
    pdf.text(metric.label, x + 4, y + 14);
  });

  const rows = Math.ceil(metrics.length / 3);
  return startY + rows * 20 + 5;
}

/**
 * Capture and export a page section as PDF
 */
export async function exportElementToPdf(
  elementId: string,
  filename: string = 'report.pdf'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element not found: ${elementId}`);
  }

  const canvas = await html2canvas(element, {
    backgroundColor: COLORS.white,
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}

/**
 * Generate and download a report PDF
 */
export async function downloadReportPdf(
  report: ReportData,
  filename?: string
): Promise<void> {
  const blob = await generateReportPdf(report);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${report.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
