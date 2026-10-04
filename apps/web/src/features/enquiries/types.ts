export type EnquiryStatus = "NEW" | "IN_REVIEW" | "ACCEPTED" | "REJECTED";
export type TeachCategory = "PRIMARY" | "HIGHSCHOOL" | "COLLEGE" | "DEGREE";
export type AddressProofType = "AADHAR" | "VOTER_ID" | "DRIVING_LICENSE" | "PASSPORT" | "OTHER";
export type Board = "STATE" | "CBSE" | "ICSE" | "OTHER";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface TutorEnquiry {
  id: string;
  branchId: string;
  name: string;
  gender: Gender | null;
  education: string;
  contactNumber: string;
  presentAddress: string;
  permanentAddress: string | null;
  ownsVehicle: boolean;
  addressProofType: AddressProofType | null;
  categories: TeachCategory[];
  subjectsInterested: string[];
  areasInterested: string[];
  status: EnquiryStatus;
  notes: string | null;
  createdById: string;
  createdAt: string;
  tutor: { id: string } | null;
}

export interface ParentEnquiry {
  id: string;
  branchId: string;
  studentName: string;
  contactNumber: string;
  studentClass: string;
  board: Board;
  subjectsRequired: string[];
  presentAddress: string;
  area: string | null;
  preferredTutorGender: Gender | null;
  addressProofType: AddressProofType | null;
  feesPrescribed: number | null;
  /** What the branch office actually agreed with the parent — see reports.service.ts's parentEnquiryFees, where this is surfaced to Super Admin. */
  agreedFinalFees: number | null;
  parentQueries: string | null;
  status: EnquiryStatus;
  createdById: string;
  createdAt: string;
  parent: { id: string } | null;
}

export interface CreateTutorEnquiryInput {
  name: string;
  gender: Gender;
  education: string;
  contactNumber: string;
  presentAddress: string;
  permanentAddress?: string;
  ownsVehicle: boolean;
  addressProofType?: AddressProofType;
  categories: TeachCategory[];
  subjectsInterested: string[];
  areasInterested: string[];
  notes?: string;
}

export interface CreateParentEnquiryInput {
  studentName: string;
  contactNumber: string;
  studentClass: string;
  board: Board;
  subjectsRequired: string[];
  presentAddress: string;
  area?: string;
  preferredTutorGender?: Gender;
  addressProofType?: AddressProofType;
  feesPrescribed?: number;
  agreedFinalFees?: number;
  parentQueries?: string;
}

export interface ConvertCredentials {
  username: string;
  email: string | null;
  tempPassword: string | null;
  wasGenerated: boolean;
  passwordSkipped: boolean;
}
