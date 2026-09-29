import { Fragment, type ReactNode } from "react";

/**
 * Markdown mínimo para los README de los informes adicionales: títulos,
 * párrafos, listas, tablas, citas, bloques de código, negrita, cursiva, código
 * y enlaces. Genera elementos React (nunca HTML en crudo), así que un README
 * no puede inyectar marcado.
 */

function inline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const id = `${key}-${index++}`;
    if (token.startsWith("`")) out.push(<code key={id}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**")) out.push(<strong key={id}>{inline(token.slice(2, -2), id)}</strong>);
    else if (token.startsWith("*")) out.push(<em key={id}>{inline(token.slice(1, -1), id)}</em>);
    else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)!;
      const href = link[2]!;
      out.push(
        /^https?:\/\//.test(href) ? (
          <a key={id} href={href} target="_blank" rel="noopener noreferrer">{link[1]}</a>
        ) : (
          <span key={id}>{link[1]}</span>
        ),
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    const key = `b-${index}`;
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]!.startsWith("```")) body.push(lines[index++]!);
      index += 1;
      blocks.push(<pre key={key}><code>{body.join("\n")}</code></pre>);
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const content = inline(heading[2]!, key);
      blocks.push(level === 1 ? <h2 key={key}>{content}</h2> : level === 2 ? <h3 key={key}>{content}</h3> : <h4 key={key}>{content}</h4>);
      index += 1;
      continue;
    }
    if (line.trim().startsWith("|") && lines[index + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[index + 1]!)) {
      const head = cells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index]!.trim().startsWith("|")) rows.push(cells(lines[index++]!));
      blocks.push(
        <div className="md-table" key={key}>
          <table>
            <thead><tr>{head.map((cell, i) => <th key={i}>{inline(cell, `${key}-h${i}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i}>{inline(cell, `${key}-${r}-${i}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (index < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[index]!)) {
        let item = lines[index]!.replace(/^\s*([-*]|\d+\.)\s+/, "");
        index += 1;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]!) && !/^\s*([-*]|\d+\.)\s+/.test(lines[index]!)) item += ` ${lines[index++]!.trim()}`;
        items.push(item);
      }
      const children = items.map((item, i) => <li key={i}>{inline(item, `${key}-${i}`)}</li>);
      blocks.push(ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>);
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index]!.startsWith(">")) quote.push(lines[index++]!.replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key}>{inline(quote.join(" "), key)}</blockquote>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index]!.trim() && !/^(#{1,4}\s|```|>|\s*([-*]|\d+\.)\s+|\s*\|)/.test(lines[index]!)) paragraph.push(lines[index++]!);
    if (!paragraph.length) paragraph.push(lines[index++]!);
    blocks.push(
      <p key={key}>
        {paragraph.map((part, i) => (
          <Fragment key={i}>
            {/* Líneas «**Campo**: valor» del README: una por línea; el resto, texto corrido. */}
            {i ? part.startsWith("**") ? <br /> : " " : null}
            {inline(part, `${key}-${i}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="md">{blocks}</div>;
}
