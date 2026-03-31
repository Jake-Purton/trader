// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql } from "@vercel/postgres";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

type SignupRequest = {
  username: string;
  password: string;
};

type NewUserRow = {
  id: number;
  username: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<SignupRequest>;
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const inserted = await sql<NewUserRow>`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${hashedPassword})
      RETURNING id, username;
    `;

    const user = inserted.rows[0];
    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    const response = NextResponse.json({ success: true, username: user.username });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }
}