export interface Assignment {
  id: string;
  subjects: string[];
  perClassRate: number;
  fixedClassesPerMonth: number;
  classDurationMinutes: number;
  daysOfWeek: number[];
  timeSlotStart: string;
  timeSlotEnd: string;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  tutor: { id: string; name: string };
  student: { id: string; name: string; studentClass: string };
}

export interface RunningClassRow {
  id: string;
  tutorName: string;
  studentName: string;
  startedAt: string;
  fixedClassesPerMonth: number;
  classDurationMinutes: number;
  attended: number;
  absent: number;
  remaining: number;
  attendancePercent: number;
  absentPercent: number;
}

export interface CreateAssignmentInput {
  tutorId: string;
  studentId: string;
  subjects: string[];
  perClassRate: number;
  fixedClassesPerMonth: number;
  fixedSalary?: number;
  classDurationMinutes: number;
  daysOfWeek: number[];
  timeSlotStart: string;
  timeSlotEnd: string;
  startDate: string;
}
