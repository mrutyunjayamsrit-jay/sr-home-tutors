export interface PublicBranch {
  id: string;
  name: string;
  address: string | null;
  contactPhone: string | null;
}

export interface PublicContact {
  organizationName: string;
  supportEmail: string | null;
  supportPhone: string | null;
}

export type TeachCategory = "PRIMARY" | "HIGHSCHOOL" | "COLLEGE" | "DEGREE";
export type Board = "STATE" | "CBSE" | "ICSE" | "OTHER";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface PublicTutorEnquiryInput {
  branchId: string;
  name: string;
  gender: Gender;
  education: string;
  contactNumber: string;
  presentAddress: string;
  ownsVehicle: boolean;
  categories: TeachCategory[];
  subjectsInterested: string[];
  areasInterested: string[];
  notes?: string;
  companyWebsite?: string;
}

export interface PublicOption {
  id: string;
  name: string;
}

export interface PublicParentEnquiryInput {
  branchId: string;
  studentName: string;
  contactNumber: string;
  studentClass: string;
  board: Board;
  subjectsRequired: string[];
  presentAddress: string;
  area?: string;
  preferredTutorGender?: Gender;
  // Best-effort GPS, captured from the parent's own device if they grant
  // permission — powers location-verified tutor attendance later. Entirely
  // optional; the enquiry submits fine without it.
  latitude?: number;
  longitude?: number;
  parentQueries?: string;
  companyWebsite?: string;
}
