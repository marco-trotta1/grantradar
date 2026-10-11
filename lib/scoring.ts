import { daysUntil, type Grant, type SchoolProfile, type MatchScore } from "./domain";

export interface MatchFactor { label: string; points: number; max: number; detail: string }
export interface GrantMatch { score: MatchScore; factors: MatchFactor[]; warnings: string[]; label: string }

export function scoreGrant({ grant, school, now = new Date() }: { grant: Grant; school: SchoolProfile; now?: Date }): GrantMatch {
  const warnings: string[] = [];
  const matches = grant.priorities.filter(priority => school.priorities.includes(priority));
  const gradeMismatch = grant.grades.length > 0 && !grant.grades.some(grade => school.grades.includes(grade));
  const focusPoints = gradeMismatch ? 0 : matches.length > 0 ? 35 : 0;
  const factors: MatchFactor[] = [{ label: "Funding priorities", points: focusPoints, max: 35,
    detail: gradeMismatch ? "The listed grade bands do not match your school." : matches.length ? `Matches ${matches.join(" and ")}.` : "No clear match to your selected priorities." }];
  if (gradeMismatch) warnings.push("The program lists different grade bands.");

  const applicantCodes: Record<SchoolProfile["schoolType"], string[]> = {
    "public-district": ["05"], "public-school": ["05"], "public-charter": ["05"], "private-nonprofit": ["12"], tribal: ["07", "11", "05"],
  };
  const unrestricted = grant.applicantTypes.includes("99");
  const applicantMatch = grant.applicantTypes.some(type => applicantCodes[school.schoolType].includes(type));
  const needsDistrict = school.schoolType === "public-school" && applicantMatch && !unrestricted;
  const unknownApplicant = grant.applicantTypes.length === 0 || grant.applicantTypes.includes("25");
  const applicantMismatch = !unrestricted && !applicantMatch && !unknownApplicant;
  factors.push({ label: "Applicant type", points: unrestricted ? 25 : needsDistrict ? 12 : applicantMatch ? 25 : unknownApplicant ? 8 : 0, max: 25,
    detail: needsDistrict ? "Your district may need to submit the application." : unrestricted ? "The source lists unrestricted applicant types. Read its conditions." : applicantMatch ? "Your applicant type appears in the source. Other conditions may apply." : unknownApplicant ? "The source needs an eligibility review." : "Your applicant type does not appear in the source." });
  if (needsDistrict) warnings.push("Confirm that your district can apply for your school.");
  if (applicantMismatch) warnings.push("Your school type does not match the listed applicants.");
  if (unknownApplicant && !applicantMatch) warnings.push("Confirm the eligible applicant before you apply.");

  const locationMismatch = grant.locations.length > 0 && !grant.locations.includes("US") && !grant.locations.includes(school.state);
  factors.push({ label: "Location", points: locationMismatch ? 0 : grant.locations.length ? 15 : 5, max: 15,
    detail: locationMismatch ? "The listed service area does not include your state." : grant.locations.length ? "Your state falls within the listed service area. Check local conditions." : "Confirm the location requirements in the full notice." });
  if (locationMismatch) warnings.push("This program lists a different service area.");

  const budgetPoints = grant.amountMax === null ? 4 : grant.amountMin !== null && grant.amountMin > school.fundingGoal ? 5 : grant.amountMax >= school.fundingGoal ? 15 : 10;
  factors.push({ label: "Funding goal", points: budgetPoints, max: 15,
    detail: grant.amountMax === null ? "The award amount is not listed." : grant.amountMin !== null && grant.amountMin > school.fundingGoal ? "The minimum award exceeds your project goal." : grant.amountMax >= school.fundingGoal ? "The award ceiling covers your funding goal." : "The grant may fund part of your project." });

  const remaining = daysUntil({ deadline: grant.deadline, now });
  const closed = grant.status === "closed" || (remaining !== null && remaining < 0);
  factors.push({ label: "Application timing", points: closed ? 0 : grant.status === "forecasted" ? 3 : remaining === null ? 2 : remaining >= 30 ? 10 : remaining >= 7 ? 7 : 3, max: 10,
    detail: closed ? "The listed application window has closed." : grant.status === "forecasted" ? "This opportunity is forecasted. Applications may not be open." : remaining === null ? "The deadline is unknown. Check the source." : `${remaining} days remain. Confirm the exact cutoff time with the funder.` });
  if (grant.source === "federal" && school.capacity === "limited") warnings.push("Federal applications can need a district partner, registrations, and a detailed budget.");
  if (grant.costSharing) warnings.push("This grant requires matching funds. Check the required contribution.");
  if (school.titleI) warnings.push("Title I status does not confirm eligibility. Check the program requirements.");
  if (school.locale === "rural") warnings.push("Confirm the program's rural definition if it limits eligibility by location.");
  if (grant.status === "unverified") warnings.push("This is a program lead. Confirm the current cycle, award, and eligibility on the source website.");

  let total = factors.reduce((sum, factor) => sum + factor.points, 0);
  const cap = closed ? 0 : locationMismatch ? 20 : applicantMismatch || gradeMismatch ? 30 : grant.status === "unverified" || (!unrestricted && !applicantMatch && unknownApplicant) ? 59 : grant.status === "forecasted" ? 69 : 100;
  if (total > cap) {
    factors.push({ label: "Evidence adjustment", points: cap - total, max: 0, detail: closed ? "A closed opportunity has a score of zero." : "The score is capped because evidence is limited or eligibility does not match." });
    total = cap;
  }
  return { score: total as MatchScore, factors, warnings, label: closed ? "Closed" : total >= 80 ? "Strong match" : total >= 60 ? "Worth a look" : total >= 40 ? "Review the details" : "Limited match" };
}
