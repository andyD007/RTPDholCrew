import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Minimal typesetting on top of pdf-lib: US Letter pages, a branded header,
 * word-wrapped paragraphs, headings, key/value rows and automatic page breaks.
 * Standard fonts only support WinAnsi, so text is normalised first.
 */
const PAGE = { width: 612, height: 792, margin: 56 };
const GOLD = rgb(0.84, 0.66, 0.29);
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.42, 0.42);

export function toWinAnsi(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ–—•€]/g, "?");
}

export class PdfWriter {
  private constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
    private title: string,
  ) {
    this.page = this.addPage();
  }
  page: PDFPage;
  y = 0;

  static async create(title: string, meta: { subject?: string } = {}) {
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    doc.setAuthor("RTP Dhol Crew");
    doc.setCreator("RTP Dhol Crew booking platform");
    if (meta.subject) doc.setSubject(meta.subject);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return new PdfWriter(doc, regular, bold, title);
  }

  private addPage(): PDFPage {
    const page = this.doc.addPage([PAGE.width, PAGE.height]);
    page.drawText("RTP DHOL CREW", { x: PAGE.margin, y: PAGE.height - 40, size: 10, font: this.bold, color: GOLD });
    page.drawText(toWinAnsi(this.title), { x: PAGE.width - PAGE.margin - this.regular.widthOfTextAtSize(toWinAnsi(this.title), 9), y: PAGE.height - 40, size: 9, font: this.regular, color: MUTED });
    page.drawLine({ start: { x: PAGE.margin, y: PAGE.height - 48 }, end: { x: PAGE.width - PAGE.margin, y: PAGE.height - 48 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    this.y = PAGE.height - 80;
    return page;
  }

  private ensure(height: number) {
    if (this.y - height < PAGE.margin) this.page = this.addPage();
  }

  private wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const raw of toWinAnsi(text).split("\n")) {
      const words = raw.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const w of words) {
        const candidate = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
        else {
          if (line) lines.push(line);
          line = w;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  heading(text: string, size = 13) {
    this.ensure(size + 18);
    this.y -= 8;
    this.page.drawText(toWinAnsi(text), { x: PAGE.margin, y: this.y, size, font: this.bold, color: INK });
    this.y -= size + 8;
  }

  title1(text: string) {
    this.ensure(40);
    this.page.drawText(toWinAnsi(text), { x: PAGE.margin, y: this.y, size: 22, font: this.bold, color: INK });
    this.y -= 32;
  }

  paragraph(text: string, opts: { size?: number; color?: ReturnType<typeof rgb>; bold?: boolean } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.bold ? this.bold : this.regular;
    const lines = this.wrap(text, font, size, PAGE.width - PAGE.margin * 2);
    for (const line of lines) {
      this.ensure(size + 5);
      this.page.drawText(line, { x: PAGE.margin, y: this.y, size, font, color: opts.color ?? INK });
      this.y -= size + 5;
    }
    this.y -= 6;
  }

  muted(text: string) {
    this.paragraph(text, { size: 9, color: MUTED });
  }

  row(label: string, value: string, opts: { bold?: boolean } = {}) {
    this.ensure(18);
    const size = 10.5;
    this.page.drawText(toWinAnsi(label), { x: PAGE.margin, y: this.y, size, font: this.regular, color: MUTED });
    const v = toWinAnsi(value);
    const font = opts.bold ? this.bold : this.regular;
    this.page.drawText(v, { x: PAGE.width - PAGE.margin - font.widthOfTextAtSize(v, size), y: this.y, size, font, color: INK });
    this.y -= 18;
  }

  rule() {
    this.ensure(12);
    this.page.drawLine({ start: { x: PAGE.margin, y: this.y + 4 }, end: { x: PAGE.width - PAGE.margin, y: this.y + 4 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    this.y -= 10;
  }

  box(lines: string[]) {
    const height = lines.length * 15 + 20;
    this.ensure(height + 10);
    this.page.drawRectangle({ x: PAGE.margin, y: this.y - height + 10, width: PAGE.width - PAGE.margin * 2, height, borderColor: GOLD, borderWidth: 1, color: rgb(0.99, 0.97, 0.92) });
    let y = this.y - 6;
    for (const l of lines) {
      this.page.drawText(toWinAnsi(l), { x: PAGE.margin + 12, y, size: 10, font: this.regular, color: INK });
      y -= 15;
    }
    this.y -= height + 6;
  }

  async save(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      const t = `Page ${i + 1} of ${pages.length}`;
      p.drawText(t, { x: PAGE.width - PAGE.margin - this.regular.widthOfTextAtSize(t, 8), y: 28, size: 8, font: this.regular, color: MUTED });
    });
    return this.doc.save();
  }
}
