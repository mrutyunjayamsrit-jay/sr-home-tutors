export interface TestResult {
  id: string;
  assignmentId: string;
  subject: string;
  topic: string;
  totalMarks: number;
  obtainedMarks: number;
  testDate: string;
  assignment?: {
    id: string;
    subjects: string[];
    tutor: { id: string; name: string };
    student: { id: string; name: string; studentClass: string };
  };
}
