import { PrismaClient, type SchoolPlan, type SchoolStatus, type SalesStage } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEFAULT_PASSWORD = "12345";

// ---------------------------------------------------------------------------
// Small deterministic PRNG (mulberry32) so re-running `npm run db:seed`
// produces the same synthetic dataset every time, instead of drifting.
// ---------------------------------------------------------------------------
function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
function daysAgo(n: number, from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fyLabel(d: Date): string {
  const fyStart = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${fyStart}–${String(fyStart + 1).slice(2)}`;
}

const FIRST_NAMES_ADULT = [
  "Anita", "Ravi", "Suresh", "Priya", "Arjun", "Kavya", "Radhika", "Vikram", "Deepa", "Manoj",
  "Sunita", "Rajesh", "Neha", "Amit", "Pooja", "Sanjay", "Lakshmi", "Vishal", "Meera", "Ashok",
  "Geeta", "Rahul", "Shalini", "Vikas", "Anjali", "Nikhil", "Divya", "Karthik", "Swati", "Rohit",
  "Nandini", "Farhan", "Ayesha", "Imran", "Kiran", "Latha", "Mohan", "Nisha", "Prakash", "Ritu",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Iyer", "Nair", "Menon", "Reddy", "Rao", "Patel", "Shah",
  "Mehta", "Kapoor", "Malhotra", "Chatterjee", "Bose", "Das", "Kulkarni", "Deshpande", "Joshi", "Pillai",
  "Nambiar", "Bhat", "Hegde", "Krishnan", "Subramaniam", "Chauhan", "Yadav", "Mishra", "Tiwari", "Pandey",
  "Singh", "Kaur", "Bisht", "Bora", "Dutta", "Sen", "Roy", "Khan", "Ansari", "Pillai",
];
const FIRST_NAMES_CHILD = [
  "Aarav", "Vihaan", "Aditya", "Vivaan", "Reyansh", "Arjun", "Sai", "Ayaan", "Krishna", "Ishaan",
  "Rohan", "Karan", "Aryan", "Dhruv", "Kabir", "Yash", "Rudra", "Om", "Advait", "Shaurya",
  "Ananya", "Diya", "Saanvi", "Aadhya", "Kavya", "Myra", "Anika", "Ira", "Riya", "Pari",
  "Sara", "Navya", "Aarohi", "Prisha", "Amaira", "Meera", "Nitya", "Tara", "Zara", "Rhea",
];
const DESIGNATIONS = [
  "Class Teacher", "Subject Teacher — Mathematics", "Subject Teacher — English", "Subject Teacher — Science",
  "Physical Education Teacher", "Librarian", "Accountant", "Front Office Executive", "Lab Assistant", "Counsellor",
];
const DEPARTMENTS = ["Academics", "Administration", "Accounts", "Sports", "Library"];
const PAYMENT_METHODS = ["Bank transfer", "UPI", "Cheque"];
const ACCOUNT_OWNERS = ["Radhika Menon", "Arjun Nair", "Priya Iyer"];
const RELATIONS: ("FATHER" | "MOTHER" | "GUARDIAN")[] = ["FATHER", "MOTHER", "GUARDIAN"];

function usernameFor(first: string, last: string, used: Set<string>): string {
  const base = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}${n}`;
    n++;
  }
  used.add(candidate);
  return candidate;
}

function planRate(plan: SchoolPlan): number {
  return plan === "PREMIUM" ? 150000 : 65000;
}

type SchoolSeed = {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  plan: SchoolPlan;
  status: SchoolStatus;
  onboardedDaysAgo: number;
  students: number;
  owner: string;
  health: "healthy" | "dormant";
};

const WON_SCHOOLS: SchoolSeed[] = [
  { id: "sch-sunrise", code: "SUN0001", name: "Sunrise Public School", city: "Bengaluru", state: "Karnataka", plan: "STANDARD", status: "ACTIVE", onboardedDaysAgo: 335, students: 640, owner: "Radhika Menon", health: "healthy" },
  { id: "sch-littlesparrows", code: "LSK0002", name: "Little Sparrows Kindergarten", city: "Pune", state: "Maharashtra", plan: "STANDARD", status: "ACTIVE", onboardedDaysAgo: 305, students: 95, owner: "Radhika Menon", health: "healthy" },
  { id: "sch-greenvalley", code: "GVI0003", name: "Green Valley International", city: "Chennai", state: "Tamil Nadu", plan: "PREMIUM", status: "ACTIVE", onboardedDaysAgo: 275, students: 1150, owner: "Arjun Nair", health: "healthy" },
  { id: "sch-mapleleaf", code: "MLP0004", name: "Maple Leaf Public School", city: "Indore", state: "Madhya Pradesh", plan: "STANDARD", status: "ACTIVE", onboardedDaysAgo: 245, students: 340, owner: "Arjun Nair", health: "healthy" },
  { id: "sch-lotusvalley", code: "LVS0005", name: "Lotus Valley School", city: "Lucknow", state: "Uttar Pradesh", plan: "PREMIUM", status: "ACTIVE", onboardedDaysAgo: 215, students: 880, owner: "Priya Iyer", health: "healthy" },
  { id: "sch-sapphire", code: "SIS0006", name: "Sapphire International School", city: "Surat", state: "Gujarat", plan: "STANDARD", status: "ACTIVE", onboardedDaysAgo: 185, students: 260, owner: "Priya Iyer", health: "healthy" },
  { id: "sch-xaviers", code: "SXA0007", name: "St. Xavier's Academy", city: "Kochi", state: "Kerala", plan: "PREMIUM", status: "ACTIVE", onboardedDaysAgo: 155, students: 720, owner: "Radhika Menon", health: "healthy" },
  { id: "sch-holycross", code: "HCC0008", name: "Holy Cross Convent School", city: "Nashik", state: "Maharashtra", plan: "STANDARD", status: "ACTIVE", onboardedDaysAgo: 150, students: 300, owner: "Arjun Nair", health: "dormant" },
  { id: "sch-vidyasagar", code: "VPS0009", name: "Vidyasagar Public School", city: "Bhubaneswar", state: "Odisha", plan: "STANDARD", status: "ACTIVE", onboardedDaysAgo: 120, students: 410, owner: "Priya Iyer", health: "healthy" },
  { id: "sch-bluebells", code: "BBM0010", name: "Blue Bells Model School", city: "Chandigarh", state: "Chandigarh", plan: "STANDARD", status: "ACTIVE", onboardedDaysAgo: 90, students: 120, owner: "Radhika Menon", health: "dormant" },
  { id: "sch-brightminds", code: "BMA0011", name: "Bright Minds Academy", city: "Hyderabad", state: "Telangana", plan: "STANDARD", status: "EXPIRING", onboardedDaysAgo: 355, students: 380, owner: "Arjun Nair", health: "healthy" },
  { id: "sch-silveroak", code: "SOC0012", name: "Silver Oak Convent School", city: "Coimbatore", state: "Tamil Nadu", plan: "STANDARD", status: "EXPIRING", onboardedDaysAgo: 350, students: 270, owner: "Priya Iyer", health: "healthy" },
  { id: "sch-northstar", code: "NPS0013", name: "Northstar Public School", city: "Jaipur", state: "Rajasthan", plan: "STANDARD", status: "OVERDUE", onboardedDaysAgo: 380, students: 165, owner: "Radhika Menon", health: "dormant" },
  { id: "sch-goldengate", code: "GGS0014", name: "Golden Gate School", city: "Amritsar", state: "Punjab", plan: "STANDARD", status: "OVERDUE", onboardedDaysAgo: 370, students: 140, owner: "Arjun Nair", health: "healthy" },
  { id: "sch-riverside", code: "RES0015", name: "Riverside English School", city: "Guwahati", state: "Assam", plan: "STANDARD", status: "CANCELLED", onboardedDaysAgo: 410, students: 85, owner: "Priya Iyer", health: "dormant" },
  { id: "sch-rosewood", code: "RPS0016", name: "Rosewood Public School", city: "Dehradun", state: "Uttarakhand", plan: "STANDARD", status: "TRIAL", onboardedDaysAgo: 20, students: 94, owner: "Radhika Menon", health: "healthy" },
  { id: "sch-everest", code: "EIS0017", name: "Everest International School", city: "Ranchi", state: "Jharkhand", plan: "STANDARD", status: "TRIAL", onboardedDaysAgo: 10, students: 60, owner: "Arjun Nair", health: "healthy" },
  { id: "sch-sunflower", code: "SKA0018", name: "Sunflower Kids Academy", city: "Mysuru", state: "Karnataka", plan: "STANDARD", status: "TRIAL", onboardedDaysAgo: 25, students: 70, owner: "Priya Iyer", health: "dormant" },
];

const LEADS: { id: string; code: string; name: string; city: string; state: string; stage: SalesStage; source: string; owner: string }[] = [
  { id: "sch-kidzee", code: "KLC0019", name: "Kidzee Learning Center", city: "Vadodara", state: "Gujarat", stage: "LEAD", source: "Website", owner: "Radhika Menon" },
  { id: "sch-bloomvalley", code: "BVS0020", name: "Bloom Valley School", city: "Raipur", state: "Chhattisgarh", stage: "LEAD", source: "Referral", owner: "Arjun Nair" },
  { id: "sch-crescent", code: "CPS0021", name: "Crescent Public School", city: "Patna", state: "Bihar", stage: "DEMO_SCHEDULED", source: "Conference", owner: "Priya Iyer" },
  { id: "sch-oakridge", code: "OKI0022", name: "Oakridge International", city: "Visakhapatnam", state: "Andhra Pradesh", stage: "DEMO_SCHEDULED", source: "Cold outreach", owner: "Radhika Menon" },
  { id: "sch-radiantminds", code: "RMS0023", name: "Radiant Minds School", city: "Ludhiana", state: "Punjab", stage: "PROPOSAL_SENT", source: "Referral", owner: "Arjun Nair" },
  { id: "sch-wisdomtree", code: "WTA0024", name: "Wisdom Tree Academy", city: "Agra", state: "Uttar Pradesh", stage: "PROPOSAL_SENT", source: "Website", owner: "Priya Iyer" },
  { id: "sch-emeraldheights", code: "EHS0025", name: "Emerald Heights School", city: "Shimla", state: "Himachal Pradesh", stage: "NEGOTIATION", source: "Referral", owner: "Radhika Menon" },
  { id: "sch-pinnacle", code: "PPS0026", name: "Pinnacle Public School", city: "Siliguri", state: "West Bengal", stage: "NEGOTIATION", source: "Conference", owner: "Arjun Nair" },
];

async function seedSchool(school: SchoolSeed, now: Date, passwordHash: string, usedUsernames: Set<string>) {
  const rng = makeRng(seedFromString(school.id));
  const onboardedOn = daysAgo(school.onboardedDaysAgo, now);

  const sizeTier = school.students >= 500 ? "large" : school.students >= 200 ? "medium" : "small";
  const sections = sizeTier === "large" ? ["A", "B", "C"] : sizeTier === "medium" ? ["A", "B"] : ["A"];
  const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  await db.school.upsert({
    where: { id: school.id },
    update: {},
    create: {
      id: school.id,
      code: school.code,
      name: school.name,
      city: school.city,
      state: school.state,
      plan: school.plan,
      status: school.status,
      relationshipManager: school.owner,
      salesStage: "WON",
      onboardedOn,
    },
  });

  // Skip the (expensive) bulk generation on a re-run — the school already has this data.
  const alreadySeeded = (await db.student.count({ where: { schoolId: school.id } })) > 0;
  if (alreadySeeded) return;

  const [firstAdmin, lastAdmin] = [pick(FIRST_NAMES_ADULT, rng), pick(LAST_NAMES, rng)];
  const adminUsername = usernameFor(firstAdmin, lastAdmin, usedUsernames);
  const adminUser = await db.user.create({
    data: {
      schoolId: school.id,
      name: `${firstAdmin} ${lastAdmin}`,
      username: adminUsername,
      phone: `9${randInt(100000000, 999999999, rng)}`,
      role: "SCHOOL_ADMIN",
      passwordHash,
    },
  });

  const fyStartYear = onboardedOn.getMonth() >= 5 ? onboardedOn.getFullYear() : onboardedOn.getFullYear() - 1;
  const year = await db.academicYear.create({
    data: {
      schoolId: school.id,
      label: `${fyStartYear}–${String(fyStartYear + 1).slice(2)}`,
      startDate: new Date(fyStartYear, 5, 1),
      endDate: new Date(fyStartYear + 1, 3, 30),
      isCurrent: true,
    },
  });

  await db.subject.createMany({
    data: ["Mathematics", "English", "Science", "Social Studies"].map((name) => ({ schoolId: school.id, name })),
  });

  const classRows = grades.flatMap((grade) => sections.map((section) => ({ schoolId: school.id, yearId: year.id, grade, section })));
  const classes = await db.class.createManyAndReturn({ data: classRows });

  // --- Students, distributed round-robin across classes ---------------
  const studentRows = Array.from({ length: school.students }, (_, i) => {
    const cls = classes[i % classes.length];
    const gradeNum = Number(cls.grade);
    const age = 5 + gradeNum;
    const dob = new Date(now.getFullYear() - age, randInt(0, 11, rng), randInt(1, 28, rng));
    const gender = rng() < 0.5 ? ("MALE" as const) : ("FEMALE" as const);
    return {
      schoolId: school.id,
      admissionNo: `${school.code}-${String(i + 1).padStart(4, "0")}`,
      name: `${pick(FIRST_NAMES_CHILD, rng)} ${pick(LAST_NAMES, rng)}`,
      dob,
      gender,
      classId: cls.id,
      status: "ACTIVE" as const,
    };
  });
  const students = await db.student.createManyAndReturn({ data: studentRows });

  // --- Staff ------------------------------------------------------------
  const staffCount = Math.max(4, Math.round(school.students / 27));
  const staffUserRows = Array.from({ length: staffCount }, () => {
    const first = pick(FIRST_NAMES_ADULT, rng);
    const last = pick(LAST_NAMES, rng);
    return {
      schoolId: school.id,
      name: `${first} ${last}`,
      username: usernameFor(first, last, usedUsernames),
      phone: `9${randInt(100000000, 999999999, rng)}`,
      role: "STAFF" as const,
      passwordHash,
    };
  });
  const staffUsers = await db.user.createManyAndReturn({ data: staffUserRows });

  const staffProfileRows = staffUsers.map((u) => ({
    schoolId: school.id,
    userId: u.id,
    designation: pick(DESIGNATIONS, rng),
    department: pick(DEPARTMENTS, rng),
    dateJoined: daysAgo(randInt(30, 900, rng), now),
    employmentStatus: "ACTIVE" as const,
  }));
  const staffProfiles = await db.staffProfile.createManyAndReturn({ data: staffProfileRows });

  await db.staffPermission.createMany({
    data: staffProfiles.flatMap((sp) => [
      { schoolId: school.id, staffId: sp.id, moduleName: "Attendance", accessLevel: "FULL" as const },
      { schoolId: school.id, staffId: sp.id, moduleName: "Homework", accessLevel: "FULL" as const },
      { schoolId: school.id, staffId: sp.id, moduleName: "Exams", accessLevel: "EDIT" as const },
      { schoolId: school.id, staffId: sp.id, moduleName: "Timetable", accessLevel: "VIEW" as const },
      { schoolId: school.id, staffId: sp.id, moduleName: "Fees", accessLevel: "NONE" as const },
    ]),
  });

  // --- Parents (one per student) + links ---------------------------------
  const parentUserRows = students.map(() => {
    const first = pick(FIRST_NAMES_ADULT, rng);
    const last = pick(LAST_NAMES, rng);
    return {
      schoolId: school.id,
      name: `${first} ${last}`,
      username: usernameFor(first, last, usedUsernames),
      phone: `9${randInt(100000000, 999999999, rng)}`,
      role: "PARENT" as const,
      passwordHash,
    };
  });
  const parentUsers = await db.user.createManyAndReturn({ data: parentUserRows });

  const parentRows = parentUsers.map((u) => ({ schoolId: school.id, userId: u.id, name: u.name, phone: u.phone }));
  const parents = await db.parent.createManyAndReturn({ data: parentRows });

  await db.studentParentLink.createMany({
    data: students.map((s, i) => ({
      schoolId: school.id,
      studentId: s.id,
      parentId: parents[i].id,
      relation: pick(RELATIONS, rng),
    })),
  });

  // --- Activity: logins + module page views, shaped by health tier -------
  const isHealthy = school.health === "healthy";
  const activationRate = isHealthy ? 0.65 + rng() * 0.25 : 0.05 + rng() * 0.15;
  const recencyRange: [number, number] = isHealthy ? [0, 9] : [20, 90];

  type LoginTarget = { userId: string };
  const activateAndLog = async (targets: LoginTarget[], rate: number, recency: [number, number]) => {
    const updates: { id: string; lastLoginAt: Date }[] = [];
    const logRows: { schoolId: string; userId: string; type: "LOGIN"; occurredAt: Date }[] = [];
    for (const t of targets) {
      if (rng() >= rate) continue;
      const occurredAt = daysAgo(randInt(recency[0], recency[1], rng), now);
      updates.push({ id: t.userId, lastLoginAt: occurredAt });
      logRows.push({ schoolId: school.id, userId: t.userId, type: "LOGIN", occurredAt });
    }
    await Promise.all(updates.map((u) => db.user.update({ where: { id: u.id }, data: { lastLoginAt: u.lastLoginAt } })));
    if (logRows.length > 0) await db.activityLog.createMany({ data: logRows });
    return logRows.map((r) => r.userId);
  };

  const adminActivated = await activateAndLog([{ userId: adminUser.id }], isHealthy ? 0.95 : 0.4, isHealthy ? [0, 5] : [25, 60]);
  await activateAndLog(staffUsers.map((u) => ({ userId: u.id })), activationRate, recencyRange);
  const activeParentIds = await activateAndLog(parentUsers.map((u) => ({ userId: u.id })), activationRate, recencyRange);

  const moduleNames = ["Dashboard", "Students", "Attendance", "Homework", "Exams", "Timetable", "Fees", "Communication"];
  const pageViewCount = isHealthy ? randInt(20, 45, rng) : randInt(0, 3, rng);
  const activeStaffPlusAdmin = [...adminActivated, ...staffUsers.map((u) => u.id)];
  if (activeStaffPlusAdmin.length > 0 && pageViewCount > 0) {
    await db.activityLog.createMany({
      data: Array.from({ length: pageViewCount }, () => ({
        schoolId: school.id,
        userId: pick([...activeStaffPlusAdmin, ...activeParentIds.slice(0, 20)], rng),
        type: "PAGE_VIEW" as const,
        module: pick(moduleNames, rng),
        occurredAt: daysAgo(randInt(0, 30, rng), now),
      })),
    });
  }

  // --- Subscription invoice/payment history -------------------------------
  const rate = planRate(school.plan);
  type InvoicePlan = { dueDate: Date; status: "PAID" | "PENDING"; paidOn?: Date };
  const invoicePlans: InvoicePlan[] = [];
  if (school.status === "ACTIVE") {
    invoicePlans.push({ dueDate: onboardedOn, status: "PAID", paidOn: addDays(onboardedOn, randInt(0, 5, rng)) });
  } else if (school.status === "EXPIRING") {
    invoicePlans.push({ dueDate: onboardedOn, status: "PAID", paidOn: addDays(onboardedOn, randInt(0, 5, rng)) });
    invoicePlans.push({ dueDate: addDays(now, randInt(10, 25, rng)), status: "PENDING" });
  } else if (school.status === "OVERDUE") {
    invoicePlans.push({ dueDate: onboardedOn, status: "PAID", paidOn: addDays(onboardedOn, randInt(0, 5, rng)) });
    invoicePlans.push({ dueDate: daysAgo(randInt(5, 20, rng), now), status: "PENDING" });
  } else if (school.status === "CANCELLED") {
    invoicePlans.push({ dueDate: onboardedOn, status: "PAID", paidOn: addDays(onboardedOn, randInt(0, 5, rng)) });
  } else if (school.status === "TRIAL") {
    invoicePlans.push({ dueDate: addDays(onboardedOn, 30), status: "PENDING" });
  }

  for (const plan of invoicePlans) {
    const invoice = await db.subscriptionInvoice.create({
      data: { schoolId: school.id, amount: rate, billingPeriod: fyLabel(plan.dueDate), dueDate: plan.dueDate, status: plan.status },
    });
    if (plan.status === "PAID" && plan.paidOn) {
      const payment = await db.subscriptionPayment.create({
        data: { invoiceId: invoice.id, amount: rate, method: pick(PAYMENT_METHODS, rng), paidOn: plan.paidOn },
      });
      await db.ledgerEntry.create({
        data: {
          entryType: "INCOME",
          ledgerAccountId: "la-subscription-revenue",
          amount: rate,
          date: plan.paidOn,
          description: `Subscription payment — ${school.name} (${invoice.billingPeriod})`,
          method: payment.method,
          source: "AUTO_SUBSCRIPTION",
          subscriptionPaymentId: payment.id,
        },
      });
    }
  }

  return { adminUsername };
}

async function seedLead(lead: (typeof LEADS)[number], now: Date) {
  const rng = makeRng(seedFromString(lead.id));
  await db.school.upsert({
    where: { id: lead.id },
    update: {},
    create: {
      id: lead.id,
      code: lead.code,
      name: lead.name,
      city: lead.city,
      state: lead.state,
      plan: "STANDARD",
      status: "TRIAL",
      salesStage: lead.stage,
      leadSource: lead.source,
      relationshipManager: lead.owner,
      lastContactedAt: daysAgo(randInt(1, 20, rng), now),
      nextFollowUpAt: addDays(now, randInt(1, 14, rng)),
      onboardedOn: now,
    },
  });
}

async function seedPlatformExpenses(now: Date) {
  const rng = makeRng(seedFromString("platform-expenses"));
  const existingVendors = await db.vendor.count();
  if (existingVendors > 0) return;

  const vendorDefs = [
    { name: "Amazon Web Services", category: "Hosting", account: "la-hosting" },
    { name: "Google Workspace", category: "Software", account: "la-software" },
    { name: "Zoho Corporation", category: "Software", account: "la-software" },
    { name: "WeWork India", category: "Office", account: "la-office" },
    { name: "Sharma & Associates (CA)", category: "Professional Fees", account: "la-professional-fees" },
    { name: "Bright Ads Co", category: "Marketing", account: "la-marketing" },
  ];
  const vendors = await db.vendor.createManyAndReturn({
    data: vendorDefs.map((v) => ({ name: v.name, category: v.category })),
  });

  for (let i = 0; i < 4; i++) {
    const monthDate = daysAgo(30 * i, now);
    for (const v of vendorDefs.slice(0, 2)) {
      const vendor = vendors.find((x) => x.name === v.name)!;
      const isCurrentMonth = i === 0;
      const dueDate = isCurrentMonth ? addDays(now, 4) : monthDate;
      const status = isCurrentMonth ? "PENDING" : "PAID";
      const bill = await db.bill.create({
        data: {
          vendorId: vendor.id,
          ledgerAccountId: v.account,
          billNumber: `${v.account.toUpperCase()}-${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
          amount: randInt(15000, 60000, rng),
          issueDate: monthDate,
          dueDate,
          status: status as "PENDING" | "PAID",
          recurrence: "MONTHLY",
        },
      });
      if (status === "PAID") {
        await db.ledgerEntry.create({
          data: {
            entryType: "EXPENSE",
            ledgerAccountId: v.account,
            amount: bill.amount,
            date: addDays(dueDate, randInt(0, 3, rng)),
            description: `Bill payment — ${bill.billNumber}`,
            method: pick(PAYMENT_METHODS, rng),
            source: "MANUAL",
            vendorId: vendor.id,
            billId: bill.id,
          },
        });
      }
    }
  }

  // An overdue bill from ~10 days ago, so the attention panel has something real to show.
  const officeVendor = vendors.find((v) => v.name === "WeWork India")!;
  await db.bill.create({
    data: {
      vendorId: officeVendor.id,
      ledgerAccountId: "la-office",
      billNumber: `OFFICE-OVERDUE-${now.getFullYear()}`,
      amount: 42000,
      issueDate: daysAgo(20, now),
      dueDate: daysAgo(10, now),
      status: "PENDING",
    },
  });

  // Monthly payroll for the last 6 months.
  for (let i = 0; i < 6; i++) {
    await db.ledgerEntry.create({
      data: {
        entryType: "EXPENSE",
        ledgerAccountId: "la-salaries",
        amount: 260000 + randInt(-15000, 15000, rng),
        date: daysAgo(30 * i + randInt(0, 3, rng), now),
        description: `Payroll — Vidya Yati team`,
        method: "Bank transfer",
        source: "MANUAL",
      },
    });
  }
}

async function main() {
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const usedUsernames = new Set<string>(["vidyayati"]);

  // --- Super Admin (no schoolId — platform-level account) -----------------
  await db.user.upsert({
    where: { username: "vidyayati" },
    update: {},
    create: {
      username: "vidyayati",
      name: "Vidya Yati Platform Admin",
      role: "SUPER_ADMIN",
      passwordHash,
    },
  });

  // --- Platform chart of accounts (Vidya Yati's own bookkeeping) ----------
  const CHART_OF_ACCOUNTS: { id: string; name: string; type: "INCOME" | "EXPENSE"; code: string }[] = [
    { id: "la-subscription-revenue", name: "Subscription Revenue", type: "INCOME", code: "4000" },
    { id: "la-other-income", name: "Other Income", type: "INCOME", code: "4900" },
    { id: "la-hosting", name: "Hosting & Infrastructure", type: "EXPENSE", code: "5000" },
    { id: "la-salaries", name: "Salaries & Payroll", type: "EXPENSE", code: "5100" },
    { id: "la-software", name: "Software & Tools", type: "EXPENSE", code: "5200" },
    { id: "la-marketing", name: "Marketing & Sales", type: "EXPENSE", code: "5300" },
    { id: "la-office", name: "Office & Admin", type: "EXPENSE", code: "5400" },
    { id: "la-professional-fees", name: "Professional Fees", type: "EXPENSE", code: "5500" },
    { id: "la-taxes", name: "Taxes & Compliance", type: "EXPENSE", code: "5600" },
    { id: "la-misc", name: "Miscellaneous", type: "EXPENSE", code: "5900" },
  ];
  await Promise.all(CHART_OF_ACCOUNTS.map((a) => db.ledgerAccount.upsert({ where: { id: a.id }, update: {}, create: a })));

  // --- Schools (won + pipeline leads) --------------------------------------
  console.log(`Seeding ${WON_SCHOOLS.length} onboarded schools (this can take a minute)...`);
  const sampleLogins: { school: string; username: string }[] = [];
  for (const school of WON_SCHOOLS) {
    const result = await seedSchool(school, now, passwordHash, usedUsernames);
    if (result) sampleLogins.push({ school: school.name, username: result.adminUsername });
    console.log(`  ✓ ${school.name} (${school.status})`);
  }

  console.log(`Seeding ${LEADS.length} sales pipeline leads...`);
  for (const lead of LEADS) {
    await seedLead(lead, now);
  }

  console.log("Seeding Vidya Yati's own platform expenses...");
  await seedPlatformExpenses(now);

  console.log("\nSeed complete.");
  console.log(`  Super Admin: vidyayati / ${DEFAULT_PASSWORD}`);
  console.log("  Sample school admin logins (all schools use the same default password):");
  for (const s of sampleLogins.slice(0, 5)) {
    console.log(`    ${s.school}: ${s.username} / ${DEFAULT_PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
