import type { Company } from "@/lib/domain";

export type CompanyGroup<T extends { companyId: string }> = {
  companyId: string;
  company: Company | undefined;
  items: T[];
};

export function groupByCompany<T extends { companyId: string }>(
  items: T[],
  companyById: Record<string, Company>,
): CompanyGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const list = buckets.get(item.companyId) ?? [];
    list.push(item);
    buckets.set(item.companyId, list);
  }

  const seen = new Set<string>();
  const groups: CompanyGroup<T>[] = [];
  for (const item of items) {
    if (seen.has(item.companyId)) continue;
    seen.add(item.companyId);
    groups.push({
      companyId: item.companyId,
      company: companyById[item.companyId],
      items: buckets.get(item.companyId) ?? [],
    });
  }
  return groups;
}

export function countCompanyDuplicates<T extends { companyId: string }>(items: T[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.companyId, (counts.get(item.companyId) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}
