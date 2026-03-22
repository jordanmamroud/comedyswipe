import { getPageStream } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    return Response.json(
      {
        error:
          "Missing NOTION_TOKEN or NOTION_DATABASE_ID in environment variables",
      },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const page of getPageStream()) {
          controller.enqueue(
            encoder.encode(JSON.stringify(page) + "\n")
          );
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Notion API error:", message);
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: message }) + "\n")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
