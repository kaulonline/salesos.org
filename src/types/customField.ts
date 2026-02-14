// Custom Field Types for SalesOS CRM
// Enables user-defined fields on Leads, Contacts, Accounts, Opportunities

export type CustomFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'CURRENCY'
  | 'DATE'
  | 'DATETIME'
  | 'CHECKBOX'
  | 'PICKLIST'
  | 'MULTI_PICKLIST'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'TEXTAREA'
  | 'LOOKUP';

export type CustomFieldEntity =
  | 'LEAD'
  | 'CONTACT'
  | 'ACCOUNT'
  | 'OPPORTUNITY'
  | 'PRODUCT'
  | 'QUOTE';

export interface PicklistValue {
  id: string;
  value: string;
  label: string;
  isDefault: boolean;
  isActive?: boolean;
  sortOrder: number;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  errorMessage?: string;
}

export interface CustomField {
  id: string;
  name: string;
  apiName: string;
  label: string;
  entity: CustomFieldEntity;
  type: CustomFieldType;
  description?: string;
  isRequired: boolean;
  isUnique: boolean;
  isActive: boolean;
  defaultValue?: string | number | boolean;
  picklistValues?: PicklistValue[];
  lookupEntity?: CustomFieldEntity;
  validation?: FieldValidation;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldDto {
  name: string;
  label: string;
  entity: CustomFieldEntity;
  type: CustomFieldType;
  description?: string;
  isRequired?: boolean;
  isUnique?: boolean;
  defaultValue?: string | number | boolean;
  picklistValues?: Omit<PicklistValue, 'id' | 'sortOrder'>[];
  lookupEntity?: CustomFieldEntity;
  validation?: FieldValidation;
}

export interface UpdateCustomFieldDto {
  label?: string;
  description?: string;
  isRequired?: boolean;
  isUnique?: boolean;
  isActive?: boolean;
  defaultValue?: string | number | boolean;
  validation?: FieldValidation;
}

export interface CustomFieldValue {
  fieldId: string;
  fieldApiName: string;
  value: string | number | boolean | string[] | null;
}

export interface CustomFieldStats {
  total: number;
  byEntity: Record<CustomFieldEntity, number>;
  byType: Record<CustomFieldType, number>;
  activeCount: number;
}

// Helper type for entities with custom fields
export interface WithCustomFields {
  customFields?: Record<string, CustomFieldValue>;
}

// Picklist value management DTOs
export interface CreatePicklistValueDto {
  value: string;
  label: string;
  isDefault?: boolean;
}

export interface UpdatePicklistValueDto {
  label?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface ReorderPicklistValuesDto {
  valueIds: string[];
}

export interface ReorderCustomFieldsDto {
  fieldIds: string[];
}
