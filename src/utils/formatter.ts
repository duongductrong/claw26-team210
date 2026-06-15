/**
 * Converts Markdown text into clean, structured plain text suitable for
 * messaging channels like Zalo that do not support native Markdown rendering.
 */
export function formatMarkdownToPlainText(text: string): string {
  if (!text) return "";

  let formatted = text;

  // 1. Convert markdown links: [Link Text](https://url) -> Link Text (https://url)
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // 2. Convert headers: ### Header -> Header:
  formatted = formatted.replace(/^(?:#{1,6})\s+(.+)$/gm, "$1:");

  // 3. Convert bullet lists: - item or * item -> • item
  formatted = formatted.replace(/^\s*[-*]\s+(.+)$/gm, "• $1");

  // 4. Convert numbered lists: 1. item -> 1. item
  formatted = formatted.replace(/^\s*(\d+)\.\s+(.+)$/gm, "$1. $2");

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
