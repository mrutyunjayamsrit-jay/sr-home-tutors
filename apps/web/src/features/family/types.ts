export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Child {
  id: string;
  name: string;
  studentClass: string;
  board: "STATE" | "CBSE" | "ICSE" | "OTHER";
  status: string;
  classStartedAt: string | null;
  subjectsNeeded: string[];
  preferredTutorGender: Gender | null;
}

export interface ChildAssignment {
  id: string;
  branchId: string;
  tutorId: string;
  studentId: string;
  subjects: string[];
  perClassRate: string | number;
  fixedClassesPerMonth: number;
  classDurationMinutes: number;
  daysOfWeek: number[];
  timeSlotStart: string;
  timeSlotEnd: string;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  tutor: {
    id: string;
    name: string;
    gender: Gender | null;
    education: string | null;
    contactNumber: string;
    address: string;
    startedAt: string | null;
  };
}

export interface ChildDetail extends Child {
  parent: { name: string; contactNumber: string };
  assignments: ChildAssignment[];
}

export interface MyLocation {
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
}
