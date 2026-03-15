import type { Database } from "@/lib/database.types";

type Finding = Database["public"]["Tables"]["findings"]["Row"];

export interface FindingFilters {
  competitorId?: string;
  threatLevel?: string;
  confidence?: string;
  search?: string;
}

/**
 * Filters findings by competitor, threat level, confidence, and free-text search.
 * Search matches against claim, reality, why_it_matters, and recommended_action.
 */
export function filterFindings(
  findings: Finding[],
  filters: FindingFilters
): Finding[] {
  return findings.filter((f) => {
    if (filters.competitorId && filters.competitorId !== "all" && f.competitor_id !== filters.competitorId)
      return false;
    if (filters.threatLevel && filters.threatLevel !== "all" && f.threat_level !== filters.threatLevel)
      return false;
    if (filters.confidence && filters.confidence !== "all" && f.confidence !== filters.confidence)
      return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesSearch =
        f.claim?.toLowerCase().includes(q) ||
        f.reality?.toLowerCase().includes(q) ||
        f.why_it_matters?.toLowerCase().includes(q) ||
        f.recommended_action?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  });
}
