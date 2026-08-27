import { ArtifactExport } from "@/components/proofs/artifact-export";
import { appConfig } from "@/config/app";
import { buildCredentialExport, buildVerificationLinkExport } from "@/lib/credentials/export";

export type VerificationResult =
  | "VALID"
  | "EXPIRED"
  | "REVOKED"
  | "INVALID_SIGNATURE"
  | "UNKNOWN_PROOF"
  | "UNVERIFIED_ISSUER";

export type VerifyProofResponse = {
  result: VerificationResult;
  status: "valid" | "expired" | "revoked" | "unknown" | "invalid";
  credential?: {
    id: string;
    schemaVersion: string;
    subject: {
      walletHash: string;
    };
    claim: {
      operator: "gte";
      thresholdAmount: string;
      assetCode: string;
      assetIssuer: string | null;
      periodStart: string;
      periodEnd: string;
      qualifyingPaymentCount: number;
    };
    privacy: {
      exactIncomeHidden: boolean;
      sourceTransactionsHidden: boolean;
    };
    issuedAt: string;
    expiresAt: string;
    proof: {
      type: string;
      credentialHash: string;
      signature: string;
    };
  };
  proof?: {
    id: string;
    type: string;
    schemaVersion: string;
    network: string;
    issuedAt: string;
    expiresAt: string;
    revokedAt: string | null;
  };
};

export const statusStyles: Record<VerifyProofResponse["status"], string> = {
  valid: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  expired: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  revoked: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  unknown: "border-slate-300/20 bg-slate-300/10 text-slate-100",
  invalid: "border-rose-300/30 bg-rose-300/10 text-rose-100",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-slate-100">{value}</dd>
    </div>
  );
}

export function VerificationPanel({ result }: { result: VerifyProofResponse | null }) {
  if (!result) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div
        className={`inline-flex rounded-md border px-3 py-1 text-sm font-semibold uppercase ${statusStyles[result.status]}`}
      >
        {result.status}
      </div>

      {result.credential && result.proof ? (
        <>
          <dl className="mt-5 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
          <ResultItem label="Proof ID" value={result.proof.id} />
          <ResultItem label="Network" value={result.proof.network} />
          <ResultItem
            label="Claim"
            value={`Income ${result.credential.claim.operator} ${result.credential.claim.thresholdAmount} ${result.credential.claim.assetCode}`}
          />
          <ResultItem
            label="Qualifying payments"
            value={String(result.credential.claim.qualifyingPaymentCount)}
          />
          <ResultItem
            label="Period"
            value={`${formatDate(result.credential.claim.periodStart)} to ${formatDate(
              result.credential.claim.periodEnd,
            )}`}
          />
          <ResultItem label="Expires" value={formatDate(result.proof.expiresAt)} />
          <ResultItem
            label="Wallet hash"
            value={result.credential.subject.walletHash}
          />
          <ResultItem
            label="Credential hash"
            value={result.credential.proof.credentialHash}
          />
        </dl>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ArtifactExport
              plan={buildCredentialExport({
                credential: result.credential,
                proof: result.proof,
              })}
              title="Export credential JSON"
            />
            <ArtifactExport
              plan={buildVerificationLinkExport(
                `${appConfig.appUrl}/verify?proof=${encodeURIComponent(result.proof.id)}`,
              )}
              title="Export verification link"
            />
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm leading-6 text-slate-300">
          No matching EarnProof credential was found for this identifier.
        </p>
      )}
    </div>
  );
}
