import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const AUTH_COOKIE_NAME = 'auth_token';

export type SessionPayload = {
	sub: number | string;
	username: string;
	iat?: number;
	exp?: number;
};

export async function getSessionFromCookie(): Promise<SessionPayload | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

	if (!token) {
		return null;
	}

	try {
		return jwt.verify(token, JWT_SECRET) as SessionPayload;
	} catch {
		return null;
	}
}

export function getAuthCookieName() {
	return AUTH_COOKIE_NAME;
}
