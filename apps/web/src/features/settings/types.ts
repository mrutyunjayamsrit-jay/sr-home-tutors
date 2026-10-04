export interface OrgSettings {
  id: string;
  organizationName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  tutorRulesText: string;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  organizationName?: string;
  supportEmail?: string;
  supportPhone?: string;
  tutorRulesText?: string;
}
