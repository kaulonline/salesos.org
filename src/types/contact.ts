export type ContactRole =
  | 'CHAMPION'
  | 'ECONOMIC_BUYER'
  | 'DECISION_MAKER'
  | 'INFLUENCER'
  | 'END_USER'
  | 'GATEKEEPER'
  | 'BLOCKER'
  | 'TECHNICAL_BUYER';

export type SeniorityLevel =
  | 'IC'
  | 'MANAGER'
  | 'SENIOR_MANAGER'
  | 'DIRECTOR'
  | 'SENIOR_DIRECTOR'
  | 'VP'
  | 'SVP'
  | 'C_LEVEL'
  | 'BOARD'
  | 'OWNER';

export type BuyingPower =
  | 'NONE'
  | 'INFLUENCER'
  | 'RECOMMENDER'
  | 'DECISION_MAKER'
  | 'BUDGET_HOLDER';

export type InfluenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ContactStatus = 'ACTIVE' | 'INACTIVE' | 'BOUNCED' | 'UNSUBSCRIBED';

export interface Contact {
  id: string;
  accountId?: string;
  ownerId: string;
  reportsToId?: string;
  salutation?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  role?: ContactRole;
  seniorityLevel?: SeniorityLevel;
  buyingPower?: BuyingPower;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingPostalCode?: string;
  mailingCountry?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  avatarUrl?: string;
  engagementScore?: number;
  responseRate?: number;
  communicationStyle?: string;
  interests?: string[];
  influenceLevel?: InfluenceLevel;
  contactStatus?: ContactStatus;
  doNotCall?: boolean;
  doNotEmail?: boolean;
  emailOptOut?: boolean;
  lastContactedAt?: string;
  lastEmailDate?: string;
  lastCallDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
  };
}

export interface CreateContactDto {
  accountId?: string;
  firstName: string;
  lastName: string;
  salutation?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  role?: ContactRole;
  seniorityLevel?: SeniorityLevel;
  reportsToId?: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingPostalCode?: string;
  mailingCountry?: string;
  linkedinUrl?: string;
  description?: string;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  buyingPower?: BuyingPower;
  influenceLevel?: InfluenceLevel;
  contactStatus?: ContactStatus;
  doNotCall?: boolean;
  doNotEmail?: boolean;
}

export interface ContactStats {
  total: number;
  byAccount: Array<{ accountId: string; accountName: string; count: number }>;
  withEmail: number;
  withPhone: number;
  topContacts: Array<{ id: string; firstName: string; lastName: string; email: string }>;
}
