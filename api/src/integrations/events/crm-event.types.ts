export enum CrmEventType {
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_CONVERTED = 'LEAD_CONVERTED',
  DEAL_CREATED = 'DEAL_CREATED',
  DEAL_STAGE_CHANGED = 'DEAL_STAGE_CHANGED',
  DEAL_WON = 'DEAL_WON',
  DEAL_LOST = 'DEAL_LOST',
  CONTACT_CREATED = 'CONTACT_CREATED',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  QUOTE_SENT = 'QUOTE_SENT',
  ORDER_CREATED = 'ORDER_CREATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
}

export interface CrmEvent {
  type: CrmEventType;
  entityId: string;
  entityType: string;
  organizationId: string;
  userId?: string;
  timestamp: string;
  data: Record<string, any>;
}
