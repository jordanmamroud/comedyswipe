"use client";

import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

type RichText = {
  plain_text: string;
  href: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
};

function RichTextSpan({ texts }: { texts: RichText[] }) {
  return (
    <>
      {texts.map((t, i) => {
        let el: React.ReactNode = t.plain_text;

        if (t.annotations.code) {
          el = <code className="inline-code">{el}</code>;
        }
        if (t.annotations.bold) el = <strong>{el}</strong>;
        if (t.annotations.italic) el = <em>{el}</em>;
        if (t.annotations.strikethrough) el = <s>{el}</s>;
        if (t.annotations.underline) el = <u>{el}</u>;
        if (t.href) {
          el = (
            <a href={t.href} target="_blank" rel="noopener noreferrer">
              {el}
            </a>
          );
        }

        return <span key={i}>{el}</span>;
      })}
    </>
  );
}

function getChildren(block: any): BlockObjectResponse[] {
  return block._children || [];
}

function getRichText(block: any): RichText[] {
  const data = block[block.type];
  return data?.rich_text || [];
}

function getCaption(block: any): RichText[] {
  const data = block[block.type];
  return data?.caption || [];
}

export function NotionBlock({ block }: { block: BlockObjectResponse }) {
  const children = getChildren(block);
  const richText = getRichText(block);

  switch (block.type) {
    case "paragraph":
      return (
        <p>
          <RichTextSpan texts={richText} />
          {children.length > 0 && (
            <div className="indent">
              {children.map((c) => (
                <NotionBlock key={c.id} block={c} />
              ))}
            </div>
          )}
        </p>
      );

    case "heading_1":
      return (
        <h2>
          <RichTextSpan texts={richText} />
        </h2>
      );

    case "heading_2":
      return (
        <h3>
          <RichTextSpan texts={richText} />
        </h3>
      );

    case "heading_3":
      return (
        <h4>
          <RichTextSpan texts={richText} />
        </h4>
      );

    case "bulleted_list_item":
      return (
        <li>
          <RichTextSpan texts={richText} />
          {children.length > 0 && (
            <ul>
              {children.map((c) => (
                <NotionBlock key={c.id} block={c} />
              ))}
            </ul>
          )}
        </li>
      );

    case "numbered_list_item":
      return (
        <li>
          <RichTextSpan texts={richText} />
          {children.length > 0 && (
            <ol>
              {children.map((c) => (
                <NotionBlock key={c.id} block={c} />
              ))}
            </ol>
          )}
        </li>
      );

    case "to_do": {
      const checked = (block as any).to_do?.checked ?? false;
      return (
        <div className="todo-item">
          <input type="checkbox" checked={checked} readOnly />
          <span className={checked ? "checked" : ""}>
            <RichTextSpan texts={richText} />
          </span>
        </div>
      );
    }

    case "toggle":
      return (
        <details>
          <summary>
            <RichTextSpan texts={richText} />
          </summary>
          {children.map((c) => (
            <NotionBlock key={c.id} block={c} />
          ))}
        </details>
      );

    case "code": {
      const lang = (block as any).code?.language || "";
      const text = richText.map((t) => t.plain_text).join("");
      const caption = getCaption(block);
      return (
        <div className="code-block">
          {lang && <div className="code-lang">{lang}</div>}
          <pre>
            <code>{text}</code>
          </pre>
          {caption.length > 0 && (
            <p className="caption">
              <RichTextSpan texts={caption} />
            </p>
          )}
        </div>
      );
    }

    case "quote":
      return (
        <blockquote>
          <RichTextSpan texts={richText} />
          {children.map((c) => (
            <NotionBlock key={c.id} block={c} />
          ))}
        </blockquote>
      );

    case "callout": {
      const icon = (block as any).callout?.icon;
      const emoji = icon?.type === "emoji" ? icon.emoji : "💡";
      return (
        <div className="callout">
          <span className="callout-icon">{emoji}</span>
          <div>
            <RichTextSpan texts={richText} />
            {children.map((c) => (
              <NotionBlock key={c.id} block={c} />
            ))}
          </div>
        </div>
      );
    }

    case "divider":
      return <hr />;

    case "image": {
      const img = (block as any).image;
      const url =
        img?.type === "external" ? img.external?.url : img?.file?.url;
      const caption = getCaption(block);
      return (
        <figure>
          {url && (
            <img src={url} alt={caption.map((c: RichText) => c.plain_text).join("") || "Image"} />
          )}
          {caption.length > 0 && (
            <figcaption>
              <RichTextSpan texts={caption} />
            </figcaption>
          )}
        </figure>
      );
    }

    case "video": {
      const vid = (block as any).video;
      const url =
        vid?.type === "external" ? vid.external?.url : vid?.file?.url;
      return url ? (
        <div className="video-block">
          <a href={url} target="_blank" rel="noopener noreferrer">
            🎥 Video: {url}
          </a>
        </div>
      ) : null;
    }

    case "bookmark": {
      const bUrl = (block as any).bookmark?.url;
      const caption = getCaption(block);
      return (
        <div className="bookmark">
          <a href={bUrl} target="_blank" rel="noopener noreferrer">
            🔗 {caption.length > 0 ? caption.map((c: RichText) => c.plain_text).join("") : bUrl}
          </a>
        </div>
      );
    }

    case "embed": {
      const eUrl = (block as any).embed?.url;
      return eUrl ? (
        <div className="embed">
          <a href={eUrl} target="_blank" rel="noopener noreferrer">
            📎 Embed: {eUrl}
          </a>
        </div>
      ) : null;
    }

    case "table": {
      return (
        <table>
          <tbody>
            {children.map((row, rowIdx) => {
              const cells = (row as any).table_row?.cells || [];
              const isHeader =
                (block as any).table?.has_column_header && rowIdx === 0;
              return (
                <tr key={row.id}>
                  {cells.map((cell: RichText[], cellIdx: number) =>
                    isHeader ? (
                      <th key={cellIdx}>
                        <RichTextSpan texts={cell} />
                      </th>
                    ) : (
                      <td key={cellIdx}>
                        <RichTextSpan texts={cell} />
                      </td>
                    )
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    case "table_of_contents":
      return <div className="toc">[Table of Contents]</div>;

    case "column_list":
      return (
        <div className="column-list">
          {children.map((c) => (
            <NotionBlock key={c.id} block={c} />
          ))}
        </div>
      );

    case "column":
      return (
        <div className="column">
          {children.map((c) => (
            <NotionBlock key={c.id} block={c} />
          ))}
        </div>
      );

    case "file": {
      const file = (block as any).file;
      const fUrl =
        file?.type === "external" ? file.external?.url : file?.file?.url;
      return fUrl ? (
        <div className="file-block">
          <a href={fUrl} target="_blank" rel="noopener noreferrer">
            📄 File: {fUrl}
          </a>
        </div>
      ) : null;
    }

    case "pdf": {
      const pdf = (block as any).pdf;
      const pUrl =
        pdf?.type === "external" ? pdf.external?.url : pdf?.file?.url;
      return pUrl ? (
        <div className="pdf-block">
          <a href={pUrl} target="_blank" rel="noopener noreferrer">
            📄 PDF: {pUrl}
          </a>
        </div>
      ) : null;
    }

    case "equation": {
      const expr = (block as any).equation?.expression || "";
      return <div className="equation">{expr}</div>;
    }

    default:
      return null;
  }
}

// Group consecutive list items into <ul> or <ol> wrappers
export function NotionBlocks({ blocks }: { blocks: BlockObjectResponse[] }) {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === "bulleted_list_item") {
      const items: BlockObjectResponse[] = [];
      while (i < blocks.length && blocks[i].type === "bulleted_list_item") {
        items.push(blocks[i]);
        i++;
      }
      elements.push(
        <ul key={items[0].id}>
          {items.map((item) => (
            <NotionBlock key={item.id} block={item} />
          ))}
        </ul>
      );
    } else if (block.type === "numbered_list_item") {
      const items: BlockObjectResponse[] = [];
      while (i < blocks.length && blocks[i].type === "numbered_list_item") {
        items.push(blocks[i]);
        i++;
      }
      elements.push(
        <ol key={items[0].id}>
          {items.map((item) => (
            <NotionBlock key={item.id} block={item} />
          ))}
        </ol>
      );
    } else {
      elements.push(<NotionBlock key={block.id} block={block} />);
      i++;
    }
  }

  return <>{elements}</>;
}
