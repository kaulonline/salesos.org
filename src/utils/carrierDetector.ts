/**
 * Carrier Detection Utility
 * Detects shipping carrier from tracking number patterns
 */

export interface CarrierInfo {
  name: string;
  code: string;
  trackingUrl: string;
  color: string;
  bgColor: string;
}

interface CarrierPattern {
  carrier: CarrierInfo;
  patterns: RegExp[];
}

const CARRIERS: CarrierPattern[] = [
  {
    carrier: {
      name: 'UPS',
      code: 'ups',
      trackingUrl: 'https://www.ups.com/track?tracknum=',
      color: '#412000',
      bgColor: '#FFD100',
    },
    patterns: [
      /^1Z[A-Z0-9]{16}$/i, // Standard UPS tracking
      /^T[A-Z0-9]{10}$/i, // UPS Mail Innovations
      /^9[0-9]{21}$/i, // UPS SurePost
    ],
  },
  {
    carrier: {
      name: 'FedEx',
      code: 'fedex',
      trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=',
      color: '#4D148C',
      bgColor: '#FF6600',
    },
    patterns: [
      /^[0-9]{12}$/, // FedEx Express (12 digits)
      /^[0-9]{15}$/, // FedEx Ground (15 digits)
      /^[0-9]{20}$/, // FedEx SmartPost (20 digits)
      /^[0-9]{22}$/, // FedEx Ground 96 (22 digits)
      /^96[0-9]{20}$/, // FedEx Ground 96 format
      /^DT[0-9]{12}$/i, // FedEx DoorTag
    ],
  },
  {
    carrier: {
      name: 'USPS',
      code: 'usps',
      trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
      color: '#333366',
      bgColor: '#FFFFFF',
    },
    patterns: [
      /^94[0-9]{20}$/, // USPS Priority Mail (22 digits starting with 94)
      /^92[0-9]{20}$/, // USPS First-Class Package (22 digits starting with 92)
      /^93[0-9]{20}$/, // USPS Certified Mail (22 digits starting with 93)
      /^[0-9]{20}$/, // Generic 20-digit USPS
      /^[0-9]{22}$/, // Generic 22-digit USPS
      /^[A-Z]{2}[0-9]{9}US$/i, // International format
      /^420[0-9]{5}[0-9]{22}$/, // USPS with destination ZIP
    ],
  },
  {
    carrier: {
      name: 'DHL',
      code: 'dhl',
      trackingUrl: 'https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=',
      color: '#FFCC00',
      bgColor: '#D40511',
    },
    patterns: [
      /^[0-9]{10}$/, // DHL Express (10 digits)
      /^[0-9]{11}$/, // DHL Express (11 digits)
      /^[A-Z]{3}[0-9]{7}$/i, // DHL eCommerce
      /^JJD[0-9]{18}$/i, // DHL eCommerce format
      /^JVGL[0-9]{14}$/i, // DHL Global Mail
    ],
  },
  {
    carrier: {
      name: 'Amazon',
      code: 'amazon',
      trackingUrl: 'https://www.amazon.com/progress-tracker/package/ref=track?itemId=&orderId=',
      color: '#232F3E',
      bgColor: '#FF9900',
    },
    patterns: [
      /^TBA[0-9]{12,}$/i, // Amazon Logistics
    ],
  },
  {
    carrier: {
      name: 'OnTrac',
      code: 'ontrac',
      trackingUrl: 'https://www.ontrac.com/tracking/?number=',
      color: '#FFFFFF',
      bgColor: '#00529B',
    },
    patterns: [
      /^C[0-9]{14}$/i, // OnTrac standard
      /^D[0-9]{14}$/i, // OnTrac format
    ],
  },
  {
    carrier: {
      name: 'LaserShip',
      code: 'lasership',
      trackingUrl: 'https://www.lasership.com/track/',
      color: '#FFFFFF',
      bgColor: '#005DA4',
    },
    patterns: [
      /^L[A-Z][0-9]{8,}$/i, // LaserShip format
      /^1LS[0-9]{12}$/i, // LaserShip alternate
    ],
  },
];

/**
 * Detect carrier from tracking number
 * @param trackingNumber The tracking number to analyze
 * @returns CarrierInfo if detected, null otherwise
 */
export function detectCarrier(trackingNumber: string): CarrierInfo | null {
  if (!trackingNumber) return null;

  const cleaned = trackingNumber.replace(/[\s-]/g, '').toUpperCase();

  for (const { carrier, patterns } of CARRIERS) {
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        return carrier;
      }
    }
  }

  return null;
}

/**
 * Get tracking URL for a tracking number
 * @param trackingNumber The tracking number
 * @param customUrl Optional custom URL (takes precedence)
 * @returns Full tracking URL or null
 */
export function getTrackingUrl(trackingNumber: string, customUrl?: string): string | null {
  if (customUrl) return customUrl;

  const carrier = detectCarrier(trackingNumber);
  if (!carrier) return null;

  return carrier.trackingUrl + encodeURIComponent(trackingNumber);
}

/**
 * Get all supported carriers
 */
export function getSupportedCarriers(): CarrierInfo[] {
  return CARRIERS.map((c) => c.carrier);
}

/**
 * Get carrier by code
 */
export function getCarrierByCode(code: string): CarrierInfo | null {
  const found = CARRIERS.find((c) => c.carrier.code === code.toLowerCase());
  return found?.carrier || null;
}
