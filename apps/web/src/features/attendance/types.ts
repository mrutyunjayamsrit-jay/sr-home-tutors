export type SessionStatus = "SCHEDULED" | "COMPLETED" | "ABSENT_STUDENT" | "ABSENT_TUTOR" | "CANCELLED";

export interface ClassSessionRow {
  id: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  tutorCheckIn: string | null;
  tutorCheckOut: string | null;
  actualDurationMinutes: number | null;
  status: SessionStatus;
  chaptersCovered: string | null;
  topicsCovered: string | null;
  assignment: {
    id: string;
    subjects: string[];
    classDurationMinutes: number;
    tutor: { id: string; name: string };
    student: { id: string; name: string; studentClass: string };
  };
}

export interface MarkSessionInput {
  status: "COMPLETED" | "ABSENT_STUDENT" | "ABSENT_TUTOR" | "CANCELLED";
  tutorCheckIn?: string;
  tutorCheckOut?: string;
  chaptersCovered?: string;
  topicsCovered?: string;
}
