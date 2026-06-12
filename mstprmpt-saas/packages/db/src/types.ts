import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { organizations, users, orgMembers, apiKeys, usageRecords, enhancementLogs, billingEvents, webhookEndpoints } from './schema';

export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type OrgMember = InferSelectModel<typeof orgMembers>;
export type NewOrgMember = InferInsertModel<typeof orgMembers>;

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;

export type UsageRecord = InferSelectModel<typeof usageRecords>;
export type NewUsageRecord = InferInsertModel<typeof usageRecords>;

export type EnhancementLog = InferSelectModel<typeof enhancementLogs>;
export type NewEnhancementLog = InferInsertModel<typeof enhancementLogs>;

export type BillingEvent = InferSelectModel<typeof billingEvents>;
export type NewBillingEvent = InferInsertModel<typeof billingEvents>;

export type WebhookEndpoint = InferSelectModel<typeof webhookEndpoints>;
export type NewWebhookEndpoint = InferInsertModel<typeof webhookEndpoints>;

export interface PlanLimits {
  monthlyEnhancements: number;
  ratePerMinute: number;
  burstLimit: number;
}
