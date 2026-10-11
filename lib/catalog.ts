import { grantSchema, type Grant } from "./domain";

// These program leads do not assert that an application cycle is open.
const defaults = { source: "directory", status: "unverified", deadline: null, amountMin: null, amountMax: null,
  applicantTypes: [], locations: ["US"], grades: [], costSharing: null, retrievedAt: "2026-10-11T02:00:00Z" };

export const catalog: Grant[] = [
  { id: "toshiba-k5", title: "STEM classroom grants · Grades K–5", funder: "Toshiba America Foundation",
    description: "Supports teacher-led science and math projects in elementary classrooms. Review the current application cycle and project restrictions.",
    url: "https://toshiba.com/taf/k5/", priorities: ["STEM & technology"], grades: ["elementary"],
    eligibilityText: "K–5 teachers can apply. Check school eligibility, the current funding limit, and the application date with the foundation." },
  { id: "toshiba-612", title: "STEM classroom grants · Grades 6–12", funder: "Toshiba America Foundation",
    description: "Supports project-based science and math learning in middle and high school. Funding cycles depend on the requested amount.",
    url: "https://toshiba.com/taf/612-2/", priorities: ["STEM & technology"], grades: ["middle", "high"],
    eligibilityText: "Teachers in grades 6–12 can apply. Read the current school, project, and award requirements." },
  { id: "dg-literacy", title: "Youth Literacy Grants", funder: "Dollar General Literacy Foundation",
    description: "Supports reading programs for students who need literacy support. The 2026 youth application cycle has closed. Watch the source for the next cycle.",
    url: "https://www.dgliteracy.org/grant-programs", priorities: ["Literacy & libraries"],
    eligibilityText: "Schools must provide direct literacy services and meet the foundation's location rules, including proximity to a Dollar General store." },
  { id: "youth-garden", title: "Youth Garden Grant", funder: "KidsGardening",
    description: "Supports school and youth educational gardens. Review the next cycle, award contents, and restrictions for previous recipients.",
    url: "https://kidsgardening.org/grants/grant-opportunities/youth-garden-grant/", priorities: ["Facilities & outdoors", "Food & nutrition", "STEM & technology"],
    eligibilityText: "School and youth garden programs can apply under the current program rules. Check service area and previous-recipient restrictions." },
  { id: "nea-student", title: "Student Success Grants", funder: "The NEA Foundation",
    description: "Supports educator-led projects that improve student learning. Review the current award cycle and membership requirements.",
    url: "https://www.neafoundation.org/educator-grants-and-fellowships/student-success-grants/", priorities: ["Teacher development", "STEM & technology", "Arts & music", "Special education"],
    eligibilityText: "Public school educators and education support professionals can apply under the foundation's current rules. Confirm NEA membership requirements." },
  { id: "walmart-local", title: "Spark Good Local Grants", funder: "Walmart & Sam's Club",
    description: "Supports local community needs through nearby facilities. The applicant needs a verified Spark Good account and must meet local program rules.",
    url: "https://www.walmart.org/what-we-do/strengthening-community/spark-good/spark-good-facility-giving", priorities: ["Food & nutrition", "Facilities & outdoors", "Literacy & libraries", "Student wellbeing"],
    eligibilityText: "Eligible schools and other organizations must complete third-party verification. Confirm facility service areas and the current application cycle." },
].map(item => grantSchema.parse({ ...defaults, ...item }));
