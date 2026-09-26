import "server-only";
import { toBlocks } from "@/lib/contracts/render";
import { formatDateTime } from "@/lib/time";
import { PdfWriter } from "./document";

type ContractLike = { number: string; body: string; status: string; signed_at: string | null; template_version: number; content_hash: string };
type SignatureLike = { signer_name: string; signed_at: string; ip_address: string | null; content_hash: string } | null;

export async function renderContractPdf({ contract, signature }: { contract: ContractLike; signature: SignatureLike }): Promise<Uint8Array> {
  const pdf = await PdfWriter.create(`Contract ${contract.number}`, { subject: "Performance Agreement" });
  const blocks = toBlocks(contract.body);
  let first = true;
  for (const b of blocks) {
    if (b.type === "heading") {
      if (first) pdf.title1(b.text);
      else pdf.heading(b.text);
    } else pdf.paragraph(b.text);
    first = false;
  }
  pdf.rule();
  if (signature) {
    pdf.heading("Electronic signature");
    pdf.box([
      `Signed by: ${signature.signer_name}`,
      `Signed at: ${formatDateTime(signature.signed_at)} (America/New_York)`,
      ...(signature.ip_address ? [`IP address: ${signature.ip_address}`] : []),
      `Agreement version: ${contract.template_version}`,
      `Document fingerprint (SHA-256): ${signature.content_hash.slice(0, 32)}...`,
    ]);
    pdf.muted("The signer typed their full name and checked the agreement box. The fingerprint above identifies the exact text that was signed.");
  } else {
    pdf.muted(contract.status === "void" ? "This contract has been voided." : "Not yet signed. Sign online using the secure link sent to you.");
  }
  return pdf.save();
}
