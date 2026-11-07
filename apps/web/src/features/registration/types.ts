export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface RegisteredTutor {
  id: string;
  name: string;
  gender: Gender | null;
  education: string;
  contactNumber: string;
  address: string;
  subjects: string[];
  areas: string[];
  status: "REGISTERED" | "ASSIGNED" | "ACTIVE" | "INACTIVE";
  branch: { id: string; name: string };
  _count: { assignments: number };
  createdAt: string;
  /** Office's own 1-5 interview assessment, carried over from the Tutor Enquiry at registration. */
  interviewRating: number | null;
  /** Average of parents' per-assignment ratings (see features/ratings) — null if nobody's rated this tutor yet. */
  avgParentRating: number | null;
  parentRatingCount: number;
}

export interface RegisteredParent {
  id: string;
  name: string;
  contactNumber: string;
  address: string;
  status: "REGISTERED" | "ASSIGNED" | "ACTIVE" | "INACTIVE";
  branch: { id: string; name: string };
  students: { id: string; name: string; studentClass: string; board: string; status: string; preferredTutorGender: Gender | null }[];
  createdAt: string;
}
