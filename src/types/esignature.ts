// E-Signature Types for CPQ Phase 4

export type ESignProvider = 'DOCUSIGN' | 'ADOBE_SIGN' | 'HELLOSIGN' | 'PANDADOC';

export type ESignStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SENT'
  | 'VIEWED'
  | 'SIGNED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'VOIDED'
  | 'EXPIRED';

export type SignerStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'SIGNED' | 'DECLINED';

export interface ESignatureSigner {
  id: string;
  name: string;
  email: string;
  role: string;
  order: number;
  status: SignerStatus;
  signedAt?: string;
  declinedAt?: string;
  declineReason?: string;
}

export interface ESignatureRequest {
  id: string;
  ownerId: string;
  quoteId: string;
  quote?: {
    id: string;
    name: string;
    quoteNumber?: string;
  };
  provider: ESignProvider;
  externalId?: string;
  envelopeId?: string;
  status: ESignStatus;
  subject: string;
  message?: string;
  signers: ESignatureSigner[];
  documentUrl?: string;
  signedDocumentUrl?: string;
  expiresAt?: string;
  sentAt?: string;
  completedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
  };
}

export interface CreateESignatureRequestDto {
  quoteId: string;
  provider: ESignProvider;
  subject: string;
  message?: string;
  signers: CreateSignerDto[];
  expiresInDays?: number;
  sendImmediately?: boolean;
}

export interface CreateSignerDto {
  name: string;
  email: string;
  role: string;
  order?: number;
}

export interface UpdateESignatureRequestDto {
  subject?: string;
  message?: string;
  signers?: CreateSignerDto[];
  expiresAt?: string;
}

export interface SendESignatureDto {
  requestId: string;
  customMessage?: string;
}

export interface VoidESignatureDto {
  requestId: string;
  reason: string;
}

export interface ResendESignatureDto {
  requestId: string;
  signerId?: string;
  customMessage?: string;
}

export interface ESignatureWebhookPayload {
  provider: ESignProvider;
  eventType: string;
  envelopeId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ESignatureStats {
  total: number;
  pending: number;
  sent: number;
  completed: number;
  declined: number;
  expired: number;
  avgCompletionTime?: number;
  completionRate: number;
}

export interface ESignatureFilters {
  status?: ESignStatus;
  provider?: ESignProvider;
  quoteId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Provider configuration types
export interface ESignProviderConfig {
  provider: ESignProvider;
  isConfigured: boolean;
  clientId?: string;
  accountId?: string;
  environment: 'sandbox' | 'production';
}

export interface ConfigureProviderDto {
  provider: ESignProvider;
  clientId: string;
  clientSecret: string;
  accountId?: string;
  environment: 'sandbox' | 'production';
  redirectUri?: string;
}
