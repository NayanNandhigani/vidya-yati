import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  // --- Super Admin (no schoolId — platform-level account) -----------------
  await db.user.upsert({
    where: { email: "superadmin@vidyayati.com" },
    update: {},
    create: {
      email: "superadmin@vidyayati.com",
      name: "Vidya Yati Platform Admin",
      role: "SUPER_ADMIN",
      passwordHash: await hash("SuperAdmin@123"),
    },
  });

  // --- Demo school ----------------------------------------------------------
  const school = await db.school.upsert({
    where: { id: "demo-school" },
    update: {},
    create: {
      id: "demo-school",
      name: "Sunrise Public School",
      city: "Bengaluru",
      state: "Karnataka",
      plan: "STANDARD",
      status: "ACTIVE",
    },
  });

  const year = await db.academicYear.upsert({
    where: { id: "demo-year" },
    update: {},
    create: {
      id: "demo-year",
      schoolId: school.id,
      label: "2026–27",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-04-30"),
      isCurrent: true,
    },
  });

  const cls = await db.class.upsert({
    where: { id: "demo-class" },
    update: {},
    create: {
      id: "demo-class",
      schoolId: school.id,
      yearId: year.id,
      grade: "6",
      section: "B",
    },
  });

  await Promise.all(
    ["Mathematics", "English", "Science", "Social Studies"].map((name) =>
      db.subject.upsert({
        where: { id: `subject-${name.toLowerCase().replace(/\s+/g, "-")}` },
        update: {},
        create: {
          id: `subject-${name.toLowerCase().replace(/\s+/g, "-")}`,
          schoolId: school.id,
          name,
        },
      })
    )
  );

  // --- School Admin -----------------------------------------------------
  await db.user.upsert({
    where: { email: "principal@sunrise.edu" },
    update: {},
    create: {
      email: "principal@sunrise.edu",
      name: "Anita Rao",
      phone: "9876500001",
      role: "SCHOOL_ADMIN",
      schoolId: school.id,
      passwordHash: await hash("Admin@123"),
    },
  });

  // --- Staff (teacher, with per-module permissions) ----------------------
  const teacherUser = await db.user.upsert({
    where: { email: "teacher@sunrise.edu" },
    update: {},
    create: {
      email: "teacher@sunrise.edu",
      name: "Ravi Kumar",
      phone: "9876500002",
      role: "STAFF",
      schoolId: school.id,
      passwordHash: await hash("Staff@123"),
    },
  });

  const teacherProfile = await db.staffProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      schoolId: school.id,
      userId: teacherUser.id,
      designation: "Class Teacher — 6B",
      department: "Academics",
      dateJoined: new Date("2022-06-01"),
      employmentStatus: "ACTIVE",
    },
  });

  await db.class.update({
    where: { id: cls.id },
    data: { classTeacherStaffId: teacherProfile.id },
  });

  await Promise.all(
    [
      ["Attendance", "FULL"],
      ["Homework", "FULL"],
      ["Exams", "EDIT"],
      ["Timetable", "VIEW"],
      ["Fees", "NONE"],
    ].map(([moduleName, accessLevel]) =>
      db.staffPermission.upsert({
        where: { staffId_moduleName: { staffId: teacherProfile.id, moduleName } },
        update: { accessLevel: accessLevel as never },
        create: {
          schoolId: school.id,
          staffId: teacherProfile.id,
          moduleName,
          accessLevel: accessLevel as never,
        },
      })
    )
  );

  // --- Parent + student ----------------------------------------------------
  const parentUser = await db.user.upsert({
    where: { email: "parent@sunrise.edu" },
    update: {},
    create: {
      email: "parent@sunrise.edu",
      name: "Suresh Nair",
      phone: "9876500003",
      role: "PARENT",
      schoolId: school.id,
      passwordHash: await hash("Parent@123"),
    },
  });

  const parent = await db.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      schoolId: school.id,
      userId: parentUser.id,
      name: "Suresh Nair",
      phone: "9876500003",
      email: "parent@sunrise.edu",
    },
  });

  const student = await db.student.upsert({
    where: { admissionNo_classId: { admissionNo: "SPS-2026-001", classId: cls.id } },
    update: {},
    create: {
      schoolId: school.id,
      admissionNo: "SPS-2026-001",
      name: "Aarav Nair",
      dob: new Date("2015-04-12"),
      gender: "MALE",
      classId: cls.id,
      status: "ACTIVE",
    },
  });

  await db.studentParentLink.upsert({
    where: { studentId_parentId: { studentId: student.id, parentId: parent.id } },
    update: {},
    create: {
      schoolId: school.id,
      studentId: student.id,
      parentId: parent.id,
      relation: "FATHER",
    },
  });

  console.log("Seed complete.");
  console.log("  Super Admin:  superadmin@vidyayati.com / SuperAdmin@123");
  console.log("  School Admin: principal@sunrise.edu / Admin@123");
  console.log("  Staff:        teacher@sunrise.edu / Staff@123");
  console.log("  Parent:       parent@sunrise.edu / Parent@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
