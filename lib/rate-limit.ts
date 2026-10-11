const buckets = new Map<string, { count: number; reset: number }>();
const windowMs = 60_000;
export function allowSearch({ key, now = Date.now() }: { key: string; now?: number }): boolean {
  if (buckets.size > 1000) for (const [id, bucket] of buckets) if (bucket.reset <= now) buckets.delete(id);
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    if (buckets.size >= 2000 && !current) return false;
    buckets.set(key, { count: 1, reset: now + windowMs }); return true;
  }
  if (current.count >= 15) return false;
  current.count++; return true;
}
