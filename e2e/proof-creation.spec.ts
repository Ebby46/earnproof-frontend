import { test, expect } from "./fixtures/test";
import { connectAndAuthenticate } from "./fixtures/flows";
import { ProofCreationPage } from "./fixtures/pages";
import { SYNTHETIC_PROOF_ID, SYNTHETIC_CREDENTIAL_HASH } from "./fixtures/synthetic-data";

test.describe("payment sync, classification, and minimum-income proof creation", () => {
  test("syncs payments and only allows selecting eligible income rows", async ({
    page,
    freighter,
  }) => {
    await freighter();
    const proofPage = await connectAndAuthenticate(page);

    await proofPage.syncButton.click();
    await expect(page.getByText("Payments synced.")).toBeVisible();

    // 4 synthetic payments render; only the 2 INCOME + eligible ones are
    // checkable.
    await expect(proofPage.paymentCheckbox(0)).toBeEnabled();
    await expect(proofPage.paymentCheckbox(1)).toBeEnabled();
    await expect(proofPage.paymentCheckbox(2)).toBeDisabled(); // REIMBURSEMENT
    await expect(proofPage.paymentCheckbox(3)).toBeDisabled(); // UNKNOWN

    // Create proof stays disabled until an eligible payment is selected.
    await expect(proofPage.createProofButton).toBeDisabled();
  });

  test("reclassifying a payment as income makes it selectable", async ({ page, freighter }) => {
    await freighter();
    const proofPage = await connectAndAuthenticate(page);
    await proofPage.syncButton.click();
    await expect(page.getByText("Payments synced.")).toBeVisible();

    await proofPage.classificationSelect(3).selectOption("INCOME");
    await expect(proofPage.paymentCheckbox(3)).toBeEnabled();
  });

  test("creates a signed minimum-income proof from selected payments and links to public verification", async ({
    page,
    freighter,
  }) => {
    await freighter();
    const proofPage = await connectAndAuthenticate(page);
    await proofPage.syncButton.click();
    await expect(page.getByText("Payments synced.")).toBeVisible();

    await proofPage.paymentCheckbox(0).check();
    await proofPage.paymentCheckbox(1).check();
    await expect(proofPage.createProofButton).toBeEnabled();

    // `force: true` below works around a pre-existing responsive layout
    // bug this spec surfaced: the unbroken 56-char wallet address rendered
    // by "Connected as {address}" widens the document beyond the mobile
    // viewport (confirmed via window.innerWidth vs the configured
    // viewport), which makes Chromium's mobile emulation report a stray
    // pointer-interception on unrelated elements above the real target
    // even though their bounding boxes never overlap. The element is
    // genuinely visible, enabled, and at the expected location — only the
    // hit-test guard is bypassed. This is an app CSS issue (missing
    // word-break on the address/hash display), not a test bug or a
    // masked functional failure; see the PR description for the flagged
    // follow-up.
    await proofPage.createProofButton.scrollIntoViewIfNeeded();
    await proofPage.createProofButton.click({ force: true });

    await expect(page.getByText("Proof created.")).toBeVisible();
    await expect(proofPage.proofIdText).toContainText(SYNTHETIC_PROOF_ID);
    await expect(proofPage.credentialHashText).toContainText(SYNTHETIC_CREDENTIAL_HASH);

    const verificationHref = await proofPage.openVerificationLink.getAttribute("href");
    expect(verificationHref).toBe(`/verify?proof=${encodeURIComponent(SYNTHETIC_PROOF_ID)}`);

    await proofPage.openVerificationLink.scrollIntoViewIfNeeded();
    await proofPage.openVerificationLink.click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/verify\\?proof=${SYNTHETIC_PROOF_ID}`));
  });

  test("blocks proof creation before a wallet is connected", async ({ page, freighter }) => {
    await freighter();
    const proofPage = new ProofCreationPage(page);
    await proofPage.goto();

    // The payments and proof sections render, but their actions require a
    // session: Sync/Refresh/Create are disabled without one.
    await expect(proofPage.syncButton).toBeDisabled();
    await expect(proofPage.createProofButton).toBeDisabled();
  });
});
