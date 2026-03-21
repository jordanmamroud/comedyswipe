import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export type NotionPage = {
  id: string;
  title: string;
  blocks: BlockObjectResponse[];
};

function getPageTitle(page: PageObjectResponse): string {
  const titleProp = Object.values(page.properties).find(
    (p) => p.type === "title"
  );
  if (titleProp && titleProp.type === "title") {
    return titleProp.title.map((t) => t.plain_text).join("") || "Untitled";
  }
  return "Untitled";
}

async function getAllBlockChildren(
  blockId: string
): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ("type" in block) {
        const b = block as BlockObjectResponse;
        // Recursively fetch children for blocks that have them
        if (b.has_children) {
          (b as any)._children = await getAllBlockChildren(b.id);
        }
        blocks.push(b);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

async function getAllDatabasePages(
  databaseId: string
): Promise<PageObjectResponse[]> {
  const allPages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  // Use search API filtered to the database to get all pages
  do {
    const response = await notion.search({
      filter: { property: "object", value: "page" },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const result of response.results) {
      if (
        "properties" in result &&
        "parent" in result &&
        (result as any).parent?.database_id?.replace(/-/g, "") ===
          databaseId.replace(/-/g, "")
      ) {
        allPages.push(result as PageObjectResponse);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return allPages;
}

export async function getAllPages(): Promise<NotionPage[]> {
  const databaseId = process.env.NOTION_DATABASE_ID!;
  const dbPages = await getAllDatabasePages(databaseId);

  const pages: NotionPage[] = [];
  for (const p of dbPages) {
    const title = getPageTitle(p);
    const blocks = await getAllBlockChildren(p.id);
    pages.push({ id: p.id, title, blocks });
  }

  return pages;
}
