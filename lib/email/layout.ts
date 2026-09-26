import { escapeHtml } from "@/lib/security/sanitize";

/**
 * Branded, email-client-safe HTML generated from plain text. Templates are
 * authored as plain text (editable by admins); this adds the layout, escapes
 * everything, turns URLs into links and optionally adds a CTA button.
 */
export function renderEmailHtml({
  subject,
  body,
  cta,
  footer = "RTP Dhol Crew · Raleigh, Durham, Cary & the Triangle",
}: {
  subject: string;
  body: string;
  cta?: { label: string; url: string };
  footer?: string;
}): string {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${linkify(escapeHtml(p)).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#D6A84B;color:#1a1305;text-decoration:none;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px;padding:14px 26px;border-radius:999px">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#050505;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#f5f5f5">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#111111;border:1px solid rgba(255,255,255,.08);border-radius:16px" cellspacing="0" cellpadding="0">
<tr><td style="padding:28px 28px 8px"><div style="font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:13px">RTP <span style="color:#D6A84B">Dhol</span> Crew</div></td></tr>
<tr><td style="padding:16px 28px 12px;font-size:15px;color:#e8e8e8">${paragraphs}${button}</td></tr>
<tr><td style="padding:16px 28px 28px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#8a8a8a">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

function linkify(escaped: string): string {
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:#D6A84B;word-break:break-all">${url}</a>`);
}
