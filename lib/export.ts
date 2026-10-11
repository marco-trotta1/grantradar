import type { Grant, SavedGrant, Workspace } from "./domain";

const escapeCalendar = (text: string) => text.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
export function calendarFile(grant: Grant): string | null {
  if (!grant.deadline) return null;
  const end = new Date(`${grant.deadline}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const compact = (value: string) => value.replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GrantRadar//Grant deadlines//EN", "BEGIN:VEVENT",
    `UID:${escapeCalendar(grant.id)}@grantradar`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${compact(grant.deadline)}`, `DTEND;VALUE=DATE:${compact(end.toISOString().slice(0, 10))}`,
    `SUMMARY:${escapeCalendar(`Grant deadline: ${grant.title}`)}`, `DESCRIPTION:${escapeCalendar(`Confirm the exact cutoff time and application requirements with the funder.\n${grant.url}`)}`,
    `URL:${grant.url}`, "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", "DESCRIPTION:Grant deadline in 7 days", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  return lines.map(line => {
    const parts: string[] = [];
    let part = "";
    for (const character of line) {
      if (new TextEncoder().encode(part + character).length > 73) { parts.push(part); part = " "; }
      part += character;
    }
    parts.push(part);
    return parts.join("\r\n");
  }).join("\r\n") + "\r\n";
}

export function csvFile(saved: SavedGrant[]): string {
  const cell = (value: string) => `"${(/^[\s]*[=+\-@]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
  return [["Grant", "Funder", "Stage", "Deadline", "Maximum award USD", "Source", "Notes"],
    ...saved.map(item => [item.grant.title, item.grant.funder, item.stage, item.grant.deadline ?? "Unknown", item.grant.amountMax?.toString() ?? "Unknown", item.grant.url, item.notes])]
    .map(row => row.map(cell).join(",")).join("\r\n");
}

export function download({ content, name, type }: { content: string; name: string; type: string }): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportWorkspace(workspace: Workspace): void {
  download({ content: JSON.stringify(workspace, null, 2), name: "grantradar-backup.json", type: "application/json" });
}
