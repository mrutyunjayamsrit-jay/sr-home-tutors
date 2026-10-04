export type AnnouncementAudience = "ALL" | "TUTORS" | "PARENTS" | "STUDENTS" | "BRANCH_STAFF";
export type AnnouncementCategory = "REFERRAL_BONUS";

export interface Announcement {
  id: string;
  branchId: string | null;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  category: AnnouncementCategory | null;
  publishedById: string;
  publishedAt: string;
}
