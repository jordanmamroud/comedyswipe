import { NextResponse } from "next/server";
import { getAllPages } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      return NextResponse.json(
        {
          error:
            "Missing NOTION_TOKEN or NOTION_DATABASE_ID in environment variables",
        },
        { status: 500 }
      );
    }

    const pages = await getAllPages();
    return NextResponse.json({ pages });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Notion API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
