/** RFC 4180 field escaping, plus protection against spreadsheet formula injection. */
export function csvField(value: unknown): string {
  let s = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  // A leading = + - @ makes Excel/Sheets evaluate the cell as a formula; neutralise it.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(fields: unknown[]): string {
  return fields.map(csvField).join(",") + "\r\n";
}

/**
 * Stream a CSV response from an async batch source so large exports never sit
 * in memory (spec §6: "CSV export streams from the server").
 */
export function streamCsv(header: string[], batches: AsyncIterable<unknown[][]>, filename: string): Response {
  const encoder = new TextEncoder();
  const iterator = batches[Symbol.asyncIterator]();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("\uFEFF" + csvLine(header))); // BOM so Excel reads UTF-8
    },
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) return controller.close();
      controller.enqueue(encoder.encode(value.map(csvLine).join("")));
    },
    async cancel() {
      await iterator.return?.();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
