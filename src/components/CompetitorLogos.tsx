import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const SalesforceLogo: React.FC<LogoProps> = ({ className = '', size = 120 }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg width={size} height={size * 0.3} viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="36" rx="6" fill="#00A1E0"/>
      <text x="60" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">
        Salesforce
      </text>
    </svg>
  </div>
);

export const HubSpotLogo: React.FC<LogoProps> = ({ className = '', size = 120 }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg width={size} height={size * 0.3} viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="36" rx="6" fill="#FF7A59"/>
      <text x="60" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">
        HubSpot
      </text>
    </svg>
  </div>
);

export const PipedriveLogo: React.FC<LogoProps> = ({ className = '', size = 120 }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg width={size} height={size * 0.3} viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="36" rx="6" fill="#1A1A1A"/>
      <circle cx="18" cy="18" r="6" fill="#00D4FF"/>
      <text x="70" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">
        Pipedrive
      </text>
    </svg>
  </div>
);

export const ZohoLogo: React.FC<LogoProps> = ({ className = '', size = 120 }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg width={size} height={size * 0.3} viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="36" rx="6" fill="#C8423F"/>
      <text x="60" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">
        Zoho CRM
      </text>
    </svg>
  </div>
);

export const MondayLogo: React.FC<LogoProps> = ({ className = '', size = 120 }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg width={size} height={size * 0.3} viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="36" rx="6" fill="#FF3D57"/>
      <circle cx="15" cy="18" r="3" fill="#FFCB00"/>
      <circle cx="23" cy="18" r="3" fill="#00D647"/>
      <circle cx="31" cy="18" r="3" fill="#00C5FF"/>
      <text x="75" y="24" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="bold" fill="white" textAnchor="middle">
        monday.com
      </text>
    </svg>
  </div>
);

export const SalesOSLogo: React.FC<LogoProps> = ({ className = '', size = 120 }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg width={size} height={size * 0.3} viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="36" rx="6" fill="#EAD07D"/>
      <text x="60" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#1A1A1A" textAnchor="middle">
        SalesOS
      </text>
    </svg>
  </div>
);

// Compact badge versions for tables
export const SalesforceBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00A1E0] rounded-lg">
    <span className="text-white text-sm font-semibold">Salesforce</span>
  </div>
);

export const HubSpotBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF7A59] rounded-lg">
    <span className="text-white text-sm font-semibold">HubSpot</span>
  </div>
);

export const PipedriveBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] rounded-lg">
    <div className="w-2 h-2 rounded-full bg-[#00D4FF]"></div>
    <span className="text-white text-sm font-semibold">Pipedrive</span>
  </div>
);

export const ZohoBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C8423F] rounded-lg">
    <span className="text-white text-sm font-semibold">Zoho CRM</span>
  </div>
);

export const MondayBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3D57] rounded-lg">
    <div className="flex gap-0.5">
      <div className="w-1.5 h-1.5 rounded-full bg-[#FFCB00]"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-[#00D647]"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-[#00C5FF]"></div>
    </div>
    <span className="text-white text-sm font-semibold">monday.com</span>
  </div>
);

export const SalesOSBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EAD07D] rounded-lg">
    <span className="text-[#1A1A1A] text-sm font-semibold">SalesOS</span>
  </div>
);
