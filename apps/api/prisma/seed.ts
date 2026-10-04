/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { hashPassword, generateTempPassword } from "../src/modules/auth/password.util";
import { env } from "../src/config/env";
import { generateSessionDates, buildSessionRows, defaultHorizonEnd } from "../src/modules/assignments/session-generator";

const prisma = new PrismaClient();

// Dev-only fallback, same pattern as env.ts's JWT/cookie secret fallbacks —
// clearly labeled, never used unless TEST_USER_PASSWORD is left unset.
const TEST_PASSWORD_FALLBACK = "DevTest@12345";

async function seedSuperAdmin() {
  const email = env.SUPER_ADMIN_EMAIL ?? "admin@srhometutors.example";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists for ${email} — skipping.`);
    return;
  }

  const password = env.SUPER_ADMIN_PASSWORD ?? generateTempPassword();
  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      role: "SUPER_ADMIN",
      name: "Super Admin",
      email,
      username: "superadmin",
      passwordHash,
      status: "ACTIVE",
      mustResetPassword: !env.SUPER_ADMIN_PASSWORD, // force reset if we generated it
    },
  });

  console.log("─".repeat(60));
  console.log("Super Admin account created:");
  console.log(`  email:    ${admin.email}`);
  console.log(`  username: ${admin.username}`);
  if (!env.SUPER_ADMIN_PASSWORD) {
    console.log(`  password: ${password}  (change immediately after first login)`);
  } else {
    console.log("  password: (as set in SUPER_ADMIN_PASSWORD)");
  }
  console.log("─".repeat(60));
}

/**
 * Demo/test accounts covering every role, so the full UI can be reviewed
 * without hand-creating data. Idempotent (safe to re-run). Refused in
 * production unless ALLOW_TEST_SEED=true, since these are well-known
 * credentials by design.
 */
async function seedTestAccounts() {
  if (env.NODE_ENV === "production" && !env.ALLOW_TEST_SEED) {
    console.log("NODE_ENV=production and ALLOW_TEST_SEED is not set — skipping demo/test accounts.");
    return;
  }

  const password = env.TEST_USER_PASSWORD ?? TEST_PASSWORD_FALLBACK;
  const passwordHash = await hashPassword(password);

  const branch = await prisma.branch.upsert({
    where: { code: "TEST01" },
    update: {},
    create: {
      name: "Test Branch — Koramangala",
      code: "TEST01",
      address: "123 MG Road, Bengaluru",
      contactEmail: "branch@test.com",
      contactPhone: "9800000000",
    },
  });

  await upsertTestUser({
    email: "branch@test.com",
    username: "branchadmin",
    name: "Branch Office (Test)",
    role: "BRANCH_ADMIN",
    branchId: branch.id,
    passwordHash,
  });

  const tutorUser = await upsertTestUser({
    email: "tutor@test.com",
    username: "tutortest",
    name: "Tara Tutor (Test)",
    role: "TUTOR",
    branchId: branch.id,
    passwordHash,
  });
  await prisma.tutor.upsert({
    where: { userId: tutorUser.id },
    update: {},
    create: {
      branchId: branch.id,
      userId: tutorUser.id,
      name: "Tara Tutor",
      education: "M.Sc. Mathematics",
      contactNumber: "9800000001",
      address: "45 Residency Road, Bengaluru",
      ownsVehicle: true,
      categories: ["HIGHSCHOOL"],
      subjects: ["Mathematics", "Physics"],
      areas: ["Koramangala", "BTM Layout"],
      status: "ACTIVE",
      startedAt: new Date(),
    },
  });

  const parentUser = await upsertTestUser({
    email: "parent@test.com",
    username: "parenttest",
    name: "Priya Parent (Test)",
    role: "PARENT",
    branchId: branch.id,
    passwordHash,
  });
  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      branchId: branch.id,
      userId: parentUser.id,
      name: "Priya Parent",
      contactNumber: "9800000002",
      address: "78 Indiranagar, Bengaluru",
      status: "ACTIVE",
    },
  });

  const studentUser = await upsertTestUser({
    email: "student@test.com",
    username: "studenttest",
    name: "Sam Student (Test)",
    role: "STUDENT",
    branchId: branch.id,
    passwordHash,
  });
  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      parentId: parent.id,
      userId: studentUser.id,
      name: "Sam Student",
      studentClass: "10",
      board: "CBSE",
      subjectsNeeded: ["Mathematics", "Physics"],
      classStartedAt: new Date(),
      status: "ACTIVE",
    },
  });

  console.log("─".repeat(60));
  console.log("Demo/test accounts ready (all share one password):");
  console.log(`  password: ${password}`);
  console.log("  admin@test.com    — use the Super Admin account created above");
  console.log(`  branch@test.com   — Branch Office (${branch.name})`);
  console.log("  tutor@test.com    — Tutor");
  console.log("  parent@test.com   — Parent");
  console.log("  student@test.com  — Student");
  console.log("─".repeat(60));
}

/**
 * Gives the demo Parent/Student/Tutor trio an actual running-classes story
 * — a live assignment with a month of history (mixed attendance), test
 * marks, a tutor review, and a fee invoice — so the Parent-facing pages
 * (attendance chart, performance, fees) have real data to render instead
 * of empty states on first login. Idempotent: skipped if the assignment
 * already exists.
 */
async function seedDemoStory() {
  if (env.NODE_ENV === "production" && !env.ALLOW_TEST_SEED) return;

  const tutorUser = await prisma.user.findUnique({ where: { email: "tutor@test.com" }, include: { tutorProfile: true } });
  const studentUser = await prisma.user.findUnique({ where: { email: "student@test.com" }, include: { studentProfile: true } });
  const branchUser = await prisma.user.findUnique({ where: { email: "branch@test.com" } });
  if (!tutorUser?.tutorProfile || !studentUser?.studentProfile || !branchUser) {
    console.log("Demo tutor/student/branch users not found — skipping demo story seed.");
    return;
  }
  const tutor = tutorUser.tutorProfile;
  const student = studentUser.studentProfile;

  const existing = await prisma.assignment.findFirst({ where: { tutorId: tutor.id, studentId: student.id } });
  if (existing) {
    console.log("Demo assignment already exists — skipping demo story seed.");
    return;
  }

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // a month of history
  const daysOfWeek = [1, 3, 5]; // Mon / Wed / Fri

  const assignment = await prisma.assignment.create({
    data: {
      branchId: tutor.branchId,
      tutorId: tutor.id,
      studentId: student.id,
      subjects: ["Mathematics", "Physics"],
      perClassRate: 500,
      fixedClassesPerMonth: 12,
      classDurationMinutes: 60,
      daysOfWeek,
      timeSlotStart: "16:00",
      timeSlotEnd: "17:00",
      startDate,
      status: "ACTIVE",
      createdById: tutorUser.id,
    },
  });

  // Past sessions: mostly completed, a couple of absences, so the
  // attendance chart has a realistic mix instead of a flat 100%.
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const pastDates = generateSessionDates(daysOfWeek, startDate, yesterday);
  const pastRows = pastDates.map((date, i) => {
    const isAbsence = i % 7 === 4; // occasional miss
    const scheduledStart = new Date(date);
    scheduledStart.setHours(16, 0, 0, 0);
    const scheduledEnd = new Date(date);
    scheduledEnd.setHours(17, 0, 0, 0);
    return {
      assignmentId: assignment.id,
      scheduledDate: date,
      scheduledStart,
      scheduledEnd,
      status: isAbsence ? ("ABSENT_STUDENT" as const) : ("COMPLETED" as const),
      tutorCheckIn: isAbsence ? null : scheduledStart,
      tutorCheckOut: isAbsence ? null : scheduledEnd,
      actualDurationMinutes: isAbsence ? null : 60,
      chaptersCovered: isAbsence ? null : i % 2 === 0 ? "Algebra — Quadratic Equations" : "Physics — Laws of Motion",
      topicsCovered: isAbsence ? null : "Practice problems + doubt clearing",
    };
  });
  if (pastRows.length > 0) await prisma.classSession.createMany({ data: pastRows });

  // Future sessions through the rolling horizon, same as a real assignment creation.
  const futureRows = buildSessionRows(assignment, defaultHorizonEnd());
  if (futureRows.length > 0) await prisma.classSession.createMany({ data: futureRows });

  await prisma.testResult.createMany({
    data: [
      {
        assignmentId: assignment.id,
        subject: "Mathematics",
        topic: "Quadratic Equations — Unit Test",
        totalMarks: 50,
        obtainedMarks: 42,
        testDate: new Date(today.getFullYear(), today.getMonth() - 1, 20),
        createdById: tutorUser.id,
      },
      {
        assignmentId: assignment.id,
        subject: "Physics",
        topic: "Laws of Motion — Unit Test",
        totalMarks: 50,
        obtainedMarks: 38,
        testDate: new Date(today.getFullYear(), today.getMonth() - 1, 27),
        createdById: tutorUser.id,
      },
      {
        assignmentId: assignment.id,
        subject: "Mathematics",
        topic: "Polynomials — Class Test",
        totalMarks: 25,
        obtainedMarks: 23,
        testDate: new Date(today.getFullYear(), today.getMonth(), 3),
        createdById: tutorUser.id,
      },
    ],
  });

  await prisma.tutorStudentReview.create({
    data: {
      assignmentId: assignment.id,
      strengths: "Grasps new concepts quickly, especially in Algebra. Consistent with homework.",
      weaknesses: "Needs more practice with word problems in Physics; tends to rush numericals.",
      overallReview: "Steady, encouraging progress this month. On track for the term exams with continued practice.",
    },
  });

  const rateCard = await prisma.feeRateCard.upsert({
    where: { id: "seed-demo-ratecard" },
    update: {},
    create: {
      id: "seed-demo-ratecard",
      branchId: tutor.branchId,
      board: "CBSE",
      classCategory: "6-10",
      ratePerClass: 500,
      billingCycle: "MONTHLY",
      createdById: tutorUser.id,
    },
  });

  const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const fixedFees = 12 * Number(rateCard.ratePerClass);
  // classesTaken is scoped to THIS invoice's month only — pastRows spans the
  // full seeded history (since last month), so counting all of it would let
  // classesTaken exceed fixedClasses and read as a bug.
  const classesTakenThisMonth = Math.min(
    12,
    pastRows.filter((r) => r.status === "COMPLETED" && r.scheduledDate.getFullYear() === today.getFullYear() && r.scheduledDate.getMonth() === today.getMonth()).length,
  );
  await prisma.studentFeeInvoice.upsert({
    where: { studentId_period: { studentId: student.id, period } },
    update: {},
    create: {
      studentId: student.id,
      period,
      fixedClasses: 12,
      classesTaken: classesTakenThisMonth,
      fixedFees,
      payableFees: fixedFees,
      paidAmount: fixedFees / 2,
      balance: fixedFees / 2,
      dueDate: new Date(today.getFullYear(), today.getMonth(), 10),
      status: "PARTIAL",
    },
  });

  await prisma.announcement.createMany({
    data: [
      {
        branchId: null,
        title: "Welcome to SR Home Tutors' new Parent Portal",
        body: "You can now track your child's attendance, test performance, and fees right here — no more waiting for a call from the office.",
        audience: "PARENTS",
        publishedById: branchUser.id,
      },
      {
        branchId: tutor.branchId,
        title: "Term exams begin next month",
        body: "Please encourage regular revision at home. Tutors will share a revision schedule two weeks before exams begin.",
        audience: "PARENTS",
        publishedById: branchUser.id,
      },
    ],
  });

  console.log("Demo story seeded: 1 assignment, class sessions, test results, a review, a fee invoice, and announcements.");
}

async function upsertTestUser(params: {
  email: string;
  username: string;
  name: string;
  role: "BRANCH_ADMIN" | "TUTOR" | "PARENT" | "STUDENT";
  branchId: string;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email: params.email },
    update: { passwordHash: params.passwordHash, status: "ACTIVE", mustResetPassword: false },
    create: {
      email: params.email,
      username: params.username,
      name: params.name,
      role: params.role,
      branchId: params.branchId,
      passwordHash: params.passwordHash,
      status: "ACTIVE",
      // Test accounts skip the forced first-login reset so they're
      // immediately usable for reviewing the UI.
      mustResetPassword: false,
    },
  });
}

/**
 * Seeds a dedicated Super Admin account with test.com credentials too, so
 * "admin@test.com" works out of the box exactly like the other four roles
 * without overloading the real bootstrap SUPER_ADMIN_EMAIL/PASSWORD flow.
 */
async function seedTestSuperAdmin() {
  if (env.NODE_ENV === "production" && !env.ALLOW_TEST_SEED) return;
  const password = env.TEST_USER_PASSWORD ?? TEST_PASSWORD_FALLBACK;
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { passwordHash, status: "ACTIVE", mustResetPassword: false },
    create: {
      email: "admin@test.com",
      username: "admintest",
      name: "Ada Admin (Test)",
      role: "SUPER_ADMIN",
      passwordHash,
      status: "ACTIVE",
      mustResetPassword: false,
    },
  });
}

async function main() {
  await seedSuperAdmin();
  await seedTestSuperAdmin();
  await seedTestAccounts();
  await seedDemoStory();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
