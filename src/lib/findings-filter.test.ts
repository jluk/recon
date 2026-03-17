import { describe, it, expect } from "vitest";
import { filterFindings, type FindingFilters } from "./findings-filter";
import type { Database } from "./database.types";

type Finding = Database["public"]["Tables"]["findings"]["Row"];

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "f1",
    run_id: "run1",
    competitor_id: "comp1",
    claim: "Competitor claims fast rendering",
    reality: "Users report slow performance on large files",
    confidence: "High",
    threat_level: "Medium",
    sources: ["HN", "Reddit"],
    why_it_matters: "Affects our video editing workflow",
    user_segment_overlap: "Professional editors",
    compensating_advantages: "Our batch processing is faster",
    recommended_action: "Flag to team",
    testing_criteria: null,
    user_id: "temp-local-user",
    created_at: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

const findings: Finding[] = [
  makeFinding({
    id: "f1",
    competitor_id: "comp1",
    claim: "Competitor claims fast rendering",
    reality: "Users report slow performance",
    threat_level: "High",
    confidence: "High",
    why_it_matters: "Affects video editing",
    recommended_action: "Manual test recommended",
  }),
  makeFinding({
    id: "f2",
    competitor_id: "comp2",
    claim: "New AI feature announced",
    reality: "Feature is beta only, crashes frequently",
    threat_level: "Medium",
    confidence: "Medium",
    why_it_matters: "Could attract our enterprise users",
    recommended_action: "Flag to team",
  }),
  makeFinding({
    id: "f3",
    competitor_id: "comp1",
    claim: "Pricing reduced by 50%",
    reality: "Only for annual plans, monthly unchanged",
    threat_level: "Low",
    confidence: "High",
    why_it_matters: "Pricing pressure on our free tier",
    recommended_action: "No action needed",
  }),
  makeFinding({
    id: "f4",
    competitor_id: "comp3",
    claim: "Partnership with Adobe",
    reality: "Just an integration, not deep partnership",
    threat_level: "Monitor",
    confidence: "Low",
    why_it_matters: "Distribution channel expansion",
    recommended_action: "Escalate",
  }),
];

describe("filterFindings", () => {
  // --- No filters ---
  it("returns all findings when no filters applied", () => {
    const result = filterFindings(findings, {});
    expect(result).toHaveLength(4);
  });

  it("returns all findings when all filters set to 'all'", () => {
    const result = filterFindings(findings, {
      competitorId: "all",
      threatLevel: "all",
      confidence: "all",
    });
    expect(result).toHaveLength(4);
  });

  // --- Competitor filter ---
  it("filters by competitor ID", () => {
    const result = filterFindings(findings, { competitorId: "comp1" });
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.competitor_id === "comp1")).toBe(true);
  });

  it("returns empty for non-existent competitor", () => {
    const result = filterFindings(findings, { competitorId: "nonexistent" });
    expect(result).toHaveLength(0);
  });

  // --- Threat level filter ---
  it("filters by threat level", () => {
    const result = filterFindings(findings, { threatLevel: "High" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f1");
  });

  it("filters by Monitor threat level", () => {
    const result = filterFindings(findings, { threatLevel: "Monitor" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f4");
  });

  // --- Confidence filter ---
  it("filters by confidence", () => {
    const result = filterFindings(findings, { confidence: "Medium" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f2");
  });

  // --- Text search ---
  it("searches across claim field", () => {
    const result = filterFindings(findings, { search: "rendering" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f1");
  });

  it("searches across reality field", () => {
    const result = filterFindings(findings, { search: "crashes" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f2");
  });

  it("searches across why_it_matters field", () => {
    const result = filterFindings(findings, { search: "enterprise" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f2");
  });

  it("searches across recommended_action field", () => {
    const result = filterFindings(findings, { search: "escalate" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f4");
  });

  it("search is case-insensitive", () => {
    const result = filterFindings(findings, { search: "PRICING" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f3");
  });

  it("search returns multiple matches", () => {
    const result = filterFindings(findings, { search: "competitor" });
    // "Competitor claims fast rendering" and potentially others
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("search returns empty for no match", () => {
    const result = filterFindings(findings, { search: "xyznonexistent" });
    expect(result).toHaveLength(0);
  });

  it("empty search string returns all findings", () => {
    const result = filterFindings(findings, { search: "" });
    expect(result).toHaveLength(4);
  });

  // --- Combined filters ---
  it("combines competitor filter with search", () => {
    const result = filterFindings(findings, {
      competitorId: "comp1",
      search: "pricing",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f3");
  });

  it("combines threat level with confidence filter", () => {
    const result = filterFindings(findings, {
      threatLevel: "High",
      confidence: "High",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f1");
  });

  it("combines all filters with search", () => {
    const result = filterFindings(findings, {
      competitorId: "comp1",
      threatLevel: "High",
      confidence: "High",
      search: "rendering",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f1");
  });

  it("combined filters can produce empty results", () => {
    const result = filterFindings(findings, {
      competitorId: "comp1",
      threatLevel: "Monitor", // comp1 has no Monitor findings
    });
    expect(result).toHaveLength(0);
  });

  // --- Edge cases ---
  it("handles empty findings array", () => {
    const result = filterFindings([], { search: "anything" });
    expect(result).toHaveLength(0);
  });
});
