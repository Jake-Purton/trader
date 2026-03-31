import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

type ExistsRow = {
  id: number;
};

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!username) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  const result = await sql<ExistsRow>`
    SELECT id
    FROM users
    WHERE username = ${username}
    LIMIT 1;
  `;

  return NextResponse.json({ exists: result.rows.length > 0 }, { status: 200 });
}