import { describe, expect, it } from "vitest";
import { pageQuestionSchema, verifiedPageAnswer } from "./page-assistant";
import { captureCurrentPage } from "@/lib/page-context";

describe("current-page assistant", () => {
  it("rejects numbers invented by AI or taken from a different page", () => {
    expect(verifiedPageAnswer("You have ₹25,000 left.", "Money left ₹25,000")).toBe(true);
    expect(verifiedPageAnswer("You have ₹30,000 left.", "Money left ₹25,000")).toBe(false);
  });
  it("rejects complicated financial terms", () => {
    expect(verifiedPageAnswer("Your covariance shows volatility.", "Past changes")).toBe(false);
    expect(verifiedPageAnswer("Your money may drop together.", "Past changes")).toBe(true);
  });
  it("accepts fetched quote facts but not invented finance numbers", () => {
    expect(
      verifiedPageAnswer(
        "The latest available price is INR 4537.9.",
        "Page empty\nBRITANNIA price 4537.9",
      ),
    ).toBe(true);
    expect(
      verifiedPageAnswer(
        "The latest available price is INR 5000.",
        "Page empty\nBRITANNIA price 4537.9",
      ),
    ).toBe(false);
    expect(
      verifiedPageAnswer("[Official source](https://example.org/2026/report)", "No figures"),
    ).toBe(true);
  });
  it("takes a fresh page snapshot instead of Overview calculations", () => {
    document.body.innerHTML =
      '<main><h1>Plan a sale</h1><p>Money left ₹4,500</p><input type="number" aria-label="Shares to sell" value="3"><label>Growth to test<input type="number" value="7"></label><div role="dialog">Old Overview ₹99,000</div></main>';
    const first = captureCurrentPage(document, "/analyze/scenario-lab");
    expect(first.content).toContain("₹4,500");
    expect(first.content).toContain("Shares to sell: 3");
    expect(first.content).toContain("Growth to test: 7");
    expect(first.content).not.toContain("99,000");
    document.body.innerHTML = "<main><h1>Risk Map</h1><p>Not enough history</p></main>";
    const second = captureCurrentPage(document, "/analyze/risk-map");
    expect(second.content).toContain("Not enough history");
    expect(second.content).not.toContain("4,500");
  });
  it("never captures account identities, passwords or entered form values", () => {
    document.body.innerHTML =
      '<main><h1>My account</h1><h2>My portfolios</h2><p>Private Person private@example.org</p><label>Buy price<input type="number" value="123456"></label><input type="password" value="secret-password"><textarea>private note</textarea></main>';
    const page = captureCurrentPage(document, "/account");
    expect(page.content).toContain("My portfolios");
    for (const secret of [
      "Private Person",
      "private@example.org",
      "123456",
      "secret-password",
      "private note",
    ])
      expect(page.content).not.toContain(secret);
  });
  it("excludes embedded feeds and credentials from current-page facts", () => {
    document.body.innerHTML =
      '<main><p>Available history only</p><p data-ai-private>private balance</p><iframe src="https://example.org"></iframe><script>secret script</script><p>a@example.org Bearer private-token</p></main>';
    const page = captureCurrentPage(document, "/");
    for (const secret of [
      "private balance",
      "secret script",
      "a@example.org",
      "private-token",
      "example.org",
    ])
      expect(page.content).not.toContain(secret);
  });
  it("limits requests and prevents query strings with personal details", () => {
    expect(
      pageQuestionSchema.safeParse({
        page: { path: "/account?email=private", title: "Account", content: "Account" },
        question: "Explain",
        history: [],
      }).success,
    ).toBe(false);
    expect(
      pageQuestionSchema.safeParse({
        page: { path: "/", title: "Allocara", content: "Home" },
        question: "a".repeat(1201),
        history: [],
      }).success,
    ).toBe(false);
  });
});
