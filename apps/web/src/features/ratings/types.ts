export interface TutorRating {
  id: string;
  assignmentId: string;
  tutorId: string;
  rating: number;
  comment: string | null;
  ratedById: string;
  ratedAt: string;
  updatedAt: string;
}
