// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql } from "@vercel/postgres";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

type LoginRequest = {
  username: string;
  password: string;
};

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<LoginRequest>;
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const result = await sql<UserRow>`
    SELECT id, username, password_hash
    FROM users
    WHERE username = ${username}
    LIMIT 1;
  `;

  const user = result.rows[0];
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
  return NextResponse.json({ token });
}