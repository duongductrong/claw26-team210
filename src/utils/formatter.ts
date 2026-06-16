/**
 * Converts Markdown text into clean, structured plain text suitable for
 * messaging channels like Zalo that do not support native Markdown rendering.
 */
function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;

  // Check if it's a separator line like |---|---|
  // A separator line contains only |, -, :, and whitespace
  if (/^[|:\-\s]+$/.test(trimmed)) {
    return []; // empty array indicates separator
  }

  // Split by |
  const parts = trimmed.split("|");

  // If it starts with | (first part empty) and ends with | (last part empty), remove them
  if (trimmed.startsWith("|")) {
    parts.shift();
  }
  if (trimmed.endsWith("|")) {
    parts.pop();
  }

  return parts.map(p => p.trim());
}

function formatParsedTable(rows: string[][]): string {
  if (rows.length === 0) return "";

  const headers = rows[0];
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    // Only headers or empty table, just return columns joined
    return "• " + headers.join(" - ");
  }

  const formattedRows: string[] = [];
  const colCount = headers.length;

  for (const row of dataRows) {
    // Pad or trim row to match colCount
    const cleanRow = [...row];
    while (cleanRow.length < colCount) {
      cleanRow.push("");
    }
    const finalRow = cleanRow.slice(0, colCount);

    if (colCount === 1) {
      formattedRows.push(`• ${finalRow[0]}`);
    } else if (colCount === 2) {
      const header0Lower = headers[0].toLowerCase();
      const isIdCol = ["stt", "no", "no.", "number", "id", "mã"].some(keyword => header0Lower.includes(keyword));

      if (isIdCol) {
        formattedRows.push(`• ${finalRow[0]}. ${finalRow[1]}`);
      } else {
        formattedRows.push(`• ${finalRow[0]}: ${finalRow[1]}`);
      }
    } else {
      // 3 or more columns
      const header0Lower = headers[0].toLowerCase();
      const isIdCol = ["stt", "no", "no.", "number", "id", "mã"].some(keyword => header0Lower.includes(keyword));

      if (isIdCol && colCount >= 3) {
        const bulletHeader = `• ${finalRow[0]}. ${finalRow[1]}`;
        const subItems: string[] = [];
        for (let c = 2; c < colCount; c++) {
          if (finalRow[c]) {
            subItems.push(`  - ${headers[c]}: ${finalRow[c]}`);
          }
        }
        if (subItems.length > 0) {
          formattedRows.push(`${bulletHeader}:\n${subItems.join("\n")}`);
        } else {
          formattedRows.push(`${bulletHeader}`);
        }
      } else {
        // First column is the bullet header
        const bulletHeader = `• ${finalRow[0]}`;
        const subItems: string[] = [];
        for (let c = 1; c < colCount; c++) {
          if (finalRow[c]) {
            subItems.push(`  - ${headers[c]}: ${finalRow[c]}`);
          }
        }
        if (subItems.length > 0) {
          formattedRows.push(`${bulletHeader}:\n${subItems.join("\n")}`);
        } else {
          formattedRows.push(`${bulletHeader}`);
        }
      }
    }
  }

  const hasNewlines = formattedRows.some(row => row.includes("\n"));
  return formattedRows.join(hasNewlines ? "\n\n" : "\n");
}

export function convertMarkdownTables(text: string): string {
  const lines = text.split("\n");
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const parsed = parseTableRow(line);

    if (parsed !== null) {
      // We found a potential table row. Let's see how many consecutive potential table rows follow.
      const potentialTableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const nextParsed = parseTableRow(lines[j]);
        if (nextParsed !== null) {
          potentialTableLines.push(lines[j]);
          j++;
        } else {
          break;
        }
      }

      // Now let's check if potentialTableLines contains a separator row (usually at index 1)
      let separatorIndex = -1;
      for (let k = 0; k < potentialTableLines.length; k++) {
        const p = parseTableRow(potentialTableLines[k]);
        if (p && p.length === 0) {
          separatorIndex = k;
          break;
        }
      }

      if (separatorIndex !== -1 && potentialTableLines.length >= 3) {
        // Yes, this is a table! Let's parse and convert it.
        const tableRows: string[][] = [];
        for (let k = 0; k < potentialTableLines.length; k++) {
          if (k === separatorIndex) continue; // skip separator
          const parsedRow = parseTableRow(potentialTableLines[k]);
          if (parsedRow && parsedRow.length > 0) {
            tableRows.push(parsedRow);
          }
        }

        if (tableRows.length > 0) {
          const formattedTable = formatParsedTable(tableRows);
          newLines.push(formattedTable);
          i = j; // skip all processed lines
          continue;
        }
      }
    }

    newLines.push(line);
    i++;
  }

  return newLines.join("\n");
}

export function formatMarkdownToPlainText(text: string): string {
  if (!text) return "";

  let formatted = convertMarkdownTables(text);

  // 1. Convert markdown links: [Link Text](https://url) -> Link Text (https://url)
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // 2. Convert headers: ### Header -> Header:
  formatted = formatted.replace(/^(?:#{1,6})\s+(.+)$/gm, "$1:");

  // 3. Convert bullet lists: - item or * item -> • item (preserving indentation)
  formatted = formatted.replace(/^(\s*)[-*]\s+(.+)$/gm, "$1• $2");

  // 4. Convert numbered lists: 1. item -> 1. item (preserving indentation)
  formatted = formatted.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, "$1$2. $3");

  // 5. Strip bold and italic markdown: **bold**, *italic*, __bold__, _italic_
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "$1");
  formatted = formatted.replace(/\*([^*]+)\*/g, "$1");
  formatted = formatted.replace(/__([^_]+)__/g, "$1");
  formatted = formatted.replace(/_([^_]+)_/g, "$1");

  // 6. Strip code block tags: ```lang content ``` -> content
  formatted = formatted.replace(/```(?:\w+)?\n([\s\S]*?)\n```/g, "$1");

  // 7. Strip inline code tags: `code` -> code
  formatted = formatted.replace(/`([^`]+)`/g, "$1");

  return formatted.trim();
}

/**
 * Splits a text into multiple chunks, each not exceeding the specified maxLength.
 * Tries to split at newline or space boundaries to maintain readability.
 */
export function splitMessage(text: string, maxLength: number = 1900): string[] {
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good split point near maxLength
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}
