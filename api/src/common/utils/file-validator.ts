/**
 * File validation utilities using magic bytes detection
 * Provides security-focused file type validation that doesn't rely on file extensions
 */

/**
 * Magic byte signatures for common file types
 * These are the first bytes that identify file formats
 */
const MAGIC_BYTES: Record<string, { signature: number[]; offset?: number }[]> = {
  // PDF - starts with %PDF
  'application/pdf': [{ signature: [0x25, 0x50, 0x44, 0x46] }],

  // JPEG - starts with FFD8FF
  'image/jpeg': [{ signature: [0xff, 0xd8, 0xff] }],

  // PNG - starts with 89504E47
  'image/png': [{ signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],

  // GIF - starts with GIF87a or GIF89a
  'image/gif': [
    { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],

  // WebP - starts with RIFF....WEBP
  'image/webp': [{ signature: [0x52, 0x49, 0x46, 0x46] }], // RIFF header, need to check WEBP at offset 8

  // BMP - starts with BM
  'image/bmp': [{ signature: [0x42, 0x4d] }],

  // XLSX/DOCX/PPTX (Office Open XML) - ZIP-based, starts with PK
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { signature: [0x50, 0x4b, 0x03, 0x04] },
  ],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { signature: [0x50, 0x4b, 0x03, 0x04] },
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    { signature: [0x50, 0x4b, 0x03, 0x04] },
  ],

  // XLS (Legacy Excel) - OLE Compound Document
  'application/vnd.ms-excel': [{ signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],

  // CSV - text file, no magic bytes but we check for printable ASCII
  'text/csv': [],

  // Plain text
  'text/plain': [],

  // HEIC/HEIF images
  'image/heic': [{ signature: [0x00, 0x00, 0x00], offset: 0 }], // ftyp box, need additional check
  'image/heif': [{ signature: [0x00, 0x00, 0x00], offset: 0 }],

  // TIFF
  'image/tiff': [
    { signature: [0x49, 0x49, 0x2a, 0x00] }, // Little endian
    { signature: [0x4d, 0x4d, 0x00, 0x2a] }, // Big endian
  ],

  // SVG (XML-based)
  'image/svg+xml': [{ signature: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] }], // <?xml or <svg
};

/**
 * Simplified mime type aliases for common extensions
 */
const MIME_TYPE_ALIASES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  bmp: ['image/bmp'],
  tiff: ['image/tiff'],
  tif: ['image/tiff'],
  svg: ['image/svg+xml'],
  heic: ['image/heic'],
  heif: ['image/heif'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  csv: ['text/csv', 'text/plain'],
  txt: ['text/plain'],
};

/**
 * Result of file type validation
 */
export interface FileValidationResult {
  valid: boolean;
  detectedType: string;
  detectedExtension: string;
  message?: string;
}

/**
 * Check if buffer matches a signature at the given offset
 */
function matchesSignature(buffer: Buffer, signature: number[], offset: number = 0): boolean {
  if (buffer.length < offset + signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Special check for WebP format (RIFF....WEBP)
 */
function isWebP(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // Check RIFF header
  if (!matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46], 0)) return false;
  // Check WEBP at offset 8
  return matchesSignature(buffer, [0x57, 0x45, 0x42, 0x50], 8);
}

/**
 * Check if buffer appears to be valid CSV/text (printable ASCII with common delimiters)
 */
function isTextOrCsv(buffer: Buffer): boolean {
  // Check first 1KB for printable characters
  const checkLength = Math.min(buffer.length, 1024);
  let printableCount = 0;
  let hasCommaOrTab = false;

  for (let i = 0; i < checkLength; i++) {
    const byte = buffer[i];
    // Allow printable ASCII (32-126), newlines, tabs, carriage returns
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      printableCount++;
      if (byte === 44 || byte === 9) {
        // comma or tab
        hasCommaOrTab = true;
      }
    }
  }

  // At least 90% should be printable
  const ratio = printableCount / checkLength;
  return ratio >= 0.9 && hasCommaOrTab;
}

/**
 * Check if buffer is valid SVG (starts with <?xml or <svg)
 */
function isSvg(buffer: Buffer): boolean {
  const header = buffer.slice(0, 256).toString('utf8').trim().toLowerCase();
  return header.startsWith('<?xml') || header.startsWith('<svg');
}

/**
 * Detect the MIME type from buffer magic bytes
 */
export function detectMimeType(buffer: Buffer): { mimeType: string; extension: string } {
  if (!buffer || buffer.length === 0) {
    return { mimeType: 'application/octet-stream', extension: 'bin' };
  }

  // PDF
  if (matchesSignature(buffer, MAGIC_BYTES['application/pdf'][0].signature)) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }

  // JPEG
  if (matchesSignature(buffer, MAGIC_BYTES['image/jpeg'][0].signature)) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  // PNG
  if (matchesSignature(buffer, MAGIC_BYTES['image/png'][0].signature)) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  // GIF
  for (const sig of MAGIC_BYTES['image/gif']) {
    if (matchesSignature(buffer, sig.signature)) {
      return { mimeType: 'image/gif', extension: 'gif' };
    }
  }

  // WebP (special check)
  if (isWebP(buffer)) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  // BMP
  if (matchesSignature(buffer, MAGIC_BYTES['image/bmp'][0].signature)) {
    return { mimeType: 'image/bmp', extension: 'bmp' };
  }

  // TIFF
  for (const sig of MAGIC_BYTES['image/tiff']) {
    if (matchesSignature(buffer, sig.signature)) {
      return { mimeType: 'image/tiff', extension: 'tiff' };
    }
  }

  // Office formats (ZIP-based) - need additional content checking for exact type
  if (matchesSignature(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    // This could be XLSX, DOCX, PPTX, or any ZIP file
    // For security, we return the generic ZIP-based type
    // The actual type would require extracting and checking [Content_Types].xml
    return {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  // Legacy Office (OLE)
  if (
    matchesSignature(buffer, MAGIC_BYTES['application/vnd.ms-excel'][0].signature)
  ) {
    return { mimeType: 'application/vnd.ms-excel', extension: 'xls' };
  }

  // SVG (XML-based)
  if (isSvg(buffer)) {
    return { mimeType: 'image/svg+xml', extension: 'svg' };
  }

  // CSV/Text check
  if (isTextOrCsv(buffer)) {
    return { mimeType: 'text/csv', extension: 'csv' };
  }

  return { mimeType: 'application/octet-stream', extension: 'bin' };
}

/**
 * Validate that a file buffer matches one of the allowed MIME types
 *
 * @param buffer - The file buffer to validate
 * @param allowedTypes - Array of allowed MIME types or file extensions (e.g., ['application/pdf', 'image/jpeg'] or ['pdf', 'jpg'])
 * @returns FileValidationResult with validation status and detected type
 */
export function validateFileType(
  buffer: Buffer,
  allowedTypes: string[],
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      detectedType: 'unknown',
      detectedExtension: 'unknown',
      message: 'Empty or invalid file buffer',
    };
  }

  const detected = detectMimeType(buffer);

  // Normalize allowed types to MIME types
  const normalizedAllowed: string[] = [];
  for (const type of allowedTypes) {
    const lowerType = type.toLowerCase();
    // Check if it's an extension
    if (MIME_TYPE_ALIASES[lowerType]) {
      normalizedAllowed.push(...MIME_TYPE_ALIASES[lowerType]);
    } else {
      // Assume it's already a MIME type
      normalizedAllowed.push(lowerType);
    }
  }

  // Check if detected type is in allowed list
  const isAllowed = normalizedAllowed.includes(detected.mimeType.toLowerCase());

  return {
    valid: isAllowed,
    detectedType: detected.mimeType,
    detectedExtension: detected.extension,
    message: isAllowed
      ? undefined
      : `File type '${detected.mimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
  };
}

/**
 * Validate file size
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns Object with valid status and message
 */
export function validateFileSize(
  size: number,
  maxSize: number,
): { valid: boolean; message?: string } {
  if (size <= 0) {
    return { valid: false, message: 'File is empty' };
  }

  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      message: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Common file size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  PDF: 50 * 1024 * 1024, // 50MB
  IMAGE: 20 * 1024 * 1024, // 20MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
  SPREADSHEET: 50 * 1024 * 1024, // 50MB
  DEFAULT: 10 * 1024 * 1024, // 10MB
};

/**
 * Pre-defined allowed type sets for common use cases
 */
export const ALLOWED_FILE_TYPES = {
  PDF_ONLY: ['application/pdf'],
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'],
  DOCUMENTS: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEETS: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ],
  SMART_CAPTURE: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ],
};

/**
 * Create a multer file filter function for use with FileInterceptor
 *
 * @param allowedTypes - Array of allowed MIME types or extensions
 * @param maxSize - Optional maximum file size in bytes
 * @returns Multer file filter function
 */
export function createFileFilter(
  allowedTypes: string[],
  maxSize?: number,
): (req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void) => void {
  return (req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void) => {
    // Note: At this point we don't have the buffer yet, so we check mimetype from client
    // The actual magic byte validation should happen after file is uploaded
    // This is a first-pass filter based on declared mimetype

    const normalizedAllowed: string[] = [];
    for (const type of allowedTypes) {
      const lowerType = type.toLowerCase();
      if (MIME_TYPE_ALIASES[lowerType]) {
        normalizedAllowed.push(...MIME_TYPE_ALIASES[lowerType]);
      } else {
        normalizedAllowed.push(lowerType);
      }
    }

    const declaredMime = file.mimetype?.toLowerCase() || '';
    if (!normalizedAllowed.includes(declaredMime)) {
      callback(
        new Error(`File type '${file.mimetype}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`),
        false,
      );
      return;
    }

    callback(null, true);
  };
}
