import { Resend } from "resend";
import { prisma } from "../lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@grantradar.app";

function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function sendReminderEmail(
  toEmail: string,
  orgName: string,
  grantTitle: string,
  funder: string,
  deadline: Date,
  daysLeft: number,
  grantId: string
) {
  const urgency = daysLeft <= 7 ? "URGENT: " : "";
  const subject = `${urgency}Grant deadline in ${daysLeft} days — ${grantTitle}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .content { background: #f8f9ff; padding: 24px; border-radius: 0 0 12px 12px; }
    .badge { display: inline-block; background: ${daysLeft <= 7 ? "#ef4444" : "#f59e0b"}; color: white; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 14px; }
    .cta { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0; font-size: 24px;">GrantRadar Deadline Reminder</h1>
    <p style="margin: 8px 0 0; opacity: 0.85;">For ${orgName}</p>
  </div>
  <div class="content">
    <span class="badge">${daysLeft} days left</span>
    <h2 style="margin: 16px 0 8px;">${grantTitle}</h2>
    <p style="color: #6b7280; margin: 0 0 16px;"><strong>Funder:</strong> ${funder}</p>
    <p style="font-size: 18px; color: ${daysLeft <= 7 ? "#ef4444" : "#d97706"}; font-weight: bold;">
      Deadline: ${formatDate(deadline)}
    </p>
    <p>Don't let this opportunity slip away. Log in to GrantRadar to review requirements and start your application.</p>
    <a href="${process.env.FRONTEND_URL ?? "http://localhost:5173"}/grants/${grantId}" class="cta">
      View Grant Details →
    </a>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="font-size: 12px; color: #9ca3af;">
      You're receiving this because you saved this grant in GrantRadar.
      <a href="${process.env.FRONTEND_URL ?? "http://localhost:5173"}/settings">Manage notifications</a>
    </p>
  </div>
</body>
</html>
    `.trim(),
  });
}

export async function checkAndSendDeadlineReminders(): Promise<void> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in31Days = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

  // Find saved grants with upcoming deadlines that haven't been reminded yet
  const saved7 = await prisma.savedGrant.findMany({
    where: {
      reminder7: false,
      grant: {
        deadline: { gte: now, lte: in7Days },
        isActive: true,
      },
    },
    include: {
      grant: true,
      org: true,
    },
  });

  const saved30 = await prisma.savedGrant.findMany({
    where: {
      reminder30: false,
      grant: {
        deadline: { gte: in7Days, lte: in31Days },
        isActive: true,
      },
    },
    include: {
      grant: true,
      org: true,
    },
  });

  console.log(
    `Sending reminders: ${saved7.length} 7-day, ${saved30.length} 30-day`
  );

  for (const saved of saved7) {
    if (!saved.grant.deadline) continue;
    const days = daysUntil(saved.grant.deadline);
    try {
      // In a real app, fetch the user's email from Clerk here
      // For now we log; wire in auth email when Clerk is added
      console.log(
        `[7-day reminder] ${saved.org.name} → ${saved.grant.title} (${days} days)`
      );
      // await sendReminderEmail(userEmail, saved.org.name, saved.grant.title, ...);
      await prisma.savedGrant.update({
        where: { id: saved.id },
        data: { reminder7: true },
      });
    } catch (err) {
      console.error(`Failed to send 7-day reminder for ${saved.id}:`, err);
    }
  }

  for (const saved of saved30) {
    if (!saved.grant.deadline) continue;
    const days = daysUntil(saved.grant.deadline);
    try {
      console.log(
        `[30-day reminder] ${saved.org.name} → ${saved.grant.title} (${days} days)`
      );
      // await sendReminderEmail(userEmail, saved.org.name, saved.grant.title, ...);
      await prisma.savedGrant.update({
        where: { id: saved.id },
        data: { reminder30: true },
      });
    } catch (err) {
      console.error(`Failed to send 30-day reminder for ${saved.id}:`, err);
    }
  }
}

// Direct send helper — used when auth/email wiring is complete
export { sendReminderEmail };
