// Web Form Types for SalesOS CRM
// Embeddable lead capture forms with customization

export type FormFieldType =
  | 'TEXT'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'TEXTAREA'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'DATE'
  | 'HIDDEN';

export type FormTheme = 'light' | 'dark' | 'custom';

export type DuplicateHandling = 'CREATE_NEW' | 'UPDATE_EXISTING' | 'REJECT';

export interface WebFormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType | string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  isRequired?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };
  options?: { value: string; label: string }[];
  defaultValue?: string;
  mapToField?: string;
  sortOrder?: number;
  width?: 'full' | 'half';
}

export interface WebFormSettings {
  targetEntity: 'LEAD' | 'CONTACT';
  defaultOwnerId?: string;
  defaultCampaignId?: string;
  defaultLeadSource?: string;
  duplicateHandling: DuplicateHandling;
  duplicateCheckField: string;
  notifyOwner: boolean;
  notifyEmails?: string[];
  autoResponderEnabled: boolean;
  autoResponderTemplateId?: string;
  autoResponderDelay?: number;
  captchaEnabled: boolean;
  captchaType?: 'RECAPTCHA_V2' | 'RECAPTCHA_V3' | 'HCAPTCHA';
  captchaSiteKey?: string;
  honeypotEnabled: boolean;
  redirectUrl?: string;
  successMessage: string;
  submitButtonText?: string;
  showLabels?: boolean;
  showPlaceholders?: boolean;
  enableCaptcha?: boolean;
  triggerAssignmentRules: boolean;
  triggerWorkflows: boolean;
  doubleOptIn?: boolean;
  doubleOptInTemplateId?: string;
}

export interface WebFormStyling {
  theme: FormTheme;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: string;
  fontFamily: string;
  fontSize: string;
  buttonText: string;
  buttonColor: string;
  buttonTextColor: string;
  labelPosition: 'top' | 'left' | 'floating';
  showLabels: boolean;
  customCSS?: string;
}

export interface WebForm {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  fields: WebFormField[];
  settings: WebFormSettings;
  styling: WebFormStyling;
  submissions: number;
  conversions: number;
  conversionRate: number;
  lastSubmissionAt?: string;
  embedCode?: string;
  publicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebFormDto {
  name: string;
  description?: string;
  slug?: string;
  fields: Omit<WebFormField, 'id'>[];
  settings: Partial<WebFormSettings>;
  styling?: Partial<WebFormStyling>;
  thankYouMessage?: string;
  redirectUrl?: string;
}

export interface UpdateWebFormDto {
  name?: string;
  description?: string;
  slug?: string;
  isActive?: boolean;
  fields?: Omit<WebFormField, 'id'>[];
  settings?: Partial<WebFormSettings>;
  styling?: Partial<WebFormStyling>;
}

export interface WebFormSubmission {
  id: string;
  formId: string;
  formName: string;
  leadId?: string;
  contactId?: string;
  data: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  pageUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  status: 'PROCESSED' | 'FAILED' | 'DUPLICATE' | 'PENDING_VERIFICATION';
  errorMessage?: string;
  processingTime?: number;
  createdAt: string;
}

export interface WebFormStats {
  total: number;
  active: number;
  totalSubmissions: number;
  totalConversions?: number;
  averageConversionRate: number;
  submissionsToday?: number;
  submissionsThisWeek?: number;
  submissionsThisMonth?: number;
  topForms?: { id: string; name: string; submissions: number; conversions: number }[];
  submissionsByDay?: { date: string; count: number }[];
}

export interface WebFormEmbedCode {
  iframe: string;
  javascript: string;
  directLink: string;
}

export interface PublicWebForm {
  id: string;
  name: string;
  fields: WebFormField[];
  styling: WebFormStyling;
  settings: {
    captchaEnabled: boolean;
    captchaType?: string;
    captchaSiteKey?: string;
    successMessage: string;
    redirectUrl?: string;
  };
}

export interface SubmitWebFormDto {
  data: Record<string, unknown>;
  captchaToken?: string;
  honeypot?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  pageUrl?: string;
}

export interface SubmitWebFormResult {
  success: boolean;
  message: string;
  leadId?: string;
  contactId?: string;
  redirectUrl?: string;
  requiresVerification?: boolean;
}

// Default styling
export const DEFAULT_FORM_STYLING: WebFormStyling = {
  theme: 'light',
  primaryColor: '#EAD07D',
  backgroundColor: '#FFFFFF',
  textColor: '#1A1A1A',
  borderColor: '#E5E5E5',
  borderRadius: '12px',
  fontFamily: 'Inter, sans-serif',
  fontSize: '14px',
  buttonText: 'Submit',
  buttonColor: '#1A1A1A',
  buttonTextColor: '#FFFFFF',
  labelPosition: 'top',
  showLabels: true,
};

// Default form settings
export const DEFAULT_FORM_SETTINGS: WebFormSettings = {
  targetEntity: 'LEAD',
  duplicateHandling: 'CREATE_NEW',
  duplicateCheckField: 'email',
  notifyOwner: true,
  autoResponderEnabled: false,
  captchaEnabled: true,
  captchaType: 'RECAPTCHA_V3',
  honeypotEnabled: true,
  successMessage: 'Thank you for your submission!',
  triggerAssignmentRules: true,
  triggerWorkflows: true,
};

// Standard lead fields for mapping
export const LEAD_FIELD_MAPPINGS = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Job Title' },
  { value: 'website', label: 'Website' },
  { value: 'industry', label: 'Industry' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
  { value: 'postalCode', label: 'Postal Code' },
  { value: 'description', label: 'Comments/Notes' },
] as const;
