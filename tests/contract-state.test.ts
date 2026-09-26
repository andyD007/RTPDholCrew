import { describe, expect, it } from "vitest";
import { canTransition, ContractStateError, nextStatus, validateSignature } from "@/lib/contracts/state";
import { buildContractVariables, CONTRACT_VARIABLES, renderTemplate, toBlocks, unknownTemplateVariables } from "@/lib/contracts/render";
import { defaultContractTemplate } from "@/lib/content/catalog";

describe("contract state machine", () => {
  it("follows draft → sent → viewed → signed", () => {
    expect(nextStatus("draft", "send")).toBe("sent");
    expect(nextStatus("sent", "view")).toBe("viewed");
    expect(nextStatus("viewed", "sign")).toBe("signed");
    expect(nextStatus("sent", "sign")).toBe("signed"); // signing without an explicit view is fine
  });

  it("rejects invalid transitions", () => {
    expect(() => nextStatus("draft", "sign")).toThrow(ContractStateError);
    expect(() => nextStatus("signed", "sign")).toThrow(/Cannot sign a signed contract/);
    expect(() => nextStatus("void", "sign")).toThrow();
    expect(() => nextStatus("signed", "edit")).toThrow();
    expect(() => nextStatus("void", "send")).toThrow();
    expect(canTransition("viewed", "view")).toBe(false);
  });

  it("allows voiding from any live state and edits keep status", () => {
    for (const s of ["draft", "sent", "viewed", "signed"] as const) expect(nextStatus(s, "void")).toBe("void");
    expect(nextStatus("sent", "edit")).toBe("sent");
  });

  it("validates signatures", () => {
    const base = { signerName: "Harpreet Singh", agreed: true, expectedHash: "a".repeat(64), presentedHash: "a".repeat(64) };
    expect(validateSignature(base)).toBeNull();
    expect(validateSignature({ ...base, signerName: "Harpreet" })).toMatch(/full name/);
    expect(validateSignature({ ...base, signerName: "  " })).toMatch(/full name/);
    expect(validateSignature({ ...base, agreed: false })).toMatch(/agree/);
    expect(validateSignature({ ...base, presentedHash: "b".repeat(64) })).toMatch(/updated/);
  });
});

describe("contract rendering", () => {
  const vars = buildContractVariables({
    businessName: "RTP Dhol Crew",
    customer: { firstName: "Example", lastName: "Client", email: "x@example.com" },
    eventTypeName: "Baraat",
    event: { date: "2026-10-10", startTime: "16:00", endTime: "17:00", durationMinutes: 60, specialInstructions: null },
    venue: { name: "Sample Estate", street: "100 Sample Dr", city: "Durham", state: "NC", postalCode: "27705" },
    serviceName: "Wedding Baraat",
    quote: { number: "RTP-Q-2026-0012", totalCents: 50000, depositCents: 15000, balanceCents: 35000 },
    policies: { cancellationPolicy: "Cancel policy.", overtimePolicy: "Overtime policy.", travelTerms: "Travel terms." },
    contractNumber: "RTP-C-2026-0012",
  });

  it("fills every variable in the default template", () => {
    const { body, missing } = renderTemplate(defaultContractTemplate.body, vars);
    expect(missing).toEqual([]);
    expect(body).toContain("Example Client");
    expect(body).toContain("Saturday, October 10, 2026");
    expect(body).toContain("4:00 PM – 5:00 PM");
    expect(body).toContain("$500.00");
    expect(body).toContain("$150.00");
    expect(body).toContain("$350.00");
    expect(body).toContain("Sample Estate, 100 Sample Dr, Durham, NC 27705");
    expect(body).toContain("RTP-C-2026-0012");
    expect(body).not.toMatch(/\{\{/);
  });

  it("marks missing variables and flags unknown ones", () => {
    const r = renderTemplate("Hi {{customer_name}} {{nope}}", { customer_name: "A" });
    expect(r.body).toBe("Hi A —");
    expect(r.missing).toEqual(["nope"]);
    expect(unknownTemplateVariables("{{customer_name}} {{hack}}")).toEqual(["hack"]);
    expect(unknownTemplateVariables(defaultContractTemplate.body, CONTRACT_VARIABLES)).toEqual([]);
  });

  it("never interprets markup — HTML stays literal text", () => {
    const r = renderTemplate("{{special_instructions}}", { special_instructions: "<script>alert(1)</script>" });
    const blocks = toBlocks(r.body);
    expect(blocks).toEqual([{ type: "paragraph", text: "<script>alert(1)</script>" }]);
  });

  it("splits headings and paragraphs", () => {
    expect(toBlocks("## Title\nLine one\nLine two\n\nNext para\n## Two")).toEqual([
      { type: "heading", text: "Title" },
      { type: "paragraph", text: "Line one\nLine two" },
      { type: "paragraph", text: "Next para" },
      { type: "heading", text: "Two" },
    ]);
  });
});
