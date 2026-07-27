import { Fragment } from "react";
import DOMPurify from "dompurify";

const htmlTagPattern = /<\/?(p|br|strong|b|em|i|ul|ol|li|h[1-6]|div|span)\b[^>]*>/i;

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function FormattedProductText({ text }: { text?: string | null }) {
  if (!text?.trim()) return null;

  if (htmlTagPattern.test(text)) {
    return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }} />;
  }

  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-3 whitespace-pre-wrap">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const isList = lines.every((line) => /^([•\-–*]|\d+[.)])\s+/.test(line));

        if (isList) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^([•\-–*]|\d+[.)])\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        if (lines.length === 1 && lines[0].length <= 70 && !/[.!?]$/.test(lines[0])) {
          return (
            <h3 key={blockIndex} className="font-semibold text-foreground">
              {renderInline(lines[0].replace(/^#+\s*/, ""))}
            </h3>
          );
        }

        return (
          <p key={blockIndex} className="leading-relaxed">
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}