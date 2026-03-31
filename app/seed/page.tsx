import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';

async function seedDatabase() {
	'use server';

	const demoUsername = 'demo';
	const demoPasswordHash = await bcrypt.hash('demo123', 10);

	await sql`
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL
		);
	`;

	await sql`
		CREATE INDEX IF NOT EXISTS users_username_idx
		ON users (username);
	`;

	await sql`
		INSERT INTO users (username, password_hash)
		VALUES (${demoUsername}, ${demoPasswordHash})
		ON CONFLICT (username) DO NOTHING;
	`;
}

export default function SeedPage() {
	return (
		<main style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
			<h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Seed Database</h1>
			<p style={{ marginBottom: 20 }}>
				This will create the users table with id, username, and password_hash, then add a sample user.
			</p>

			<form action={seedDatabase}>
				<button
					type="submit"
					style={{
						background: '#111827',
						color: '#22c55e',
						border: '1px solid #22c55e',
						borderRadius: 8,
						padding: '10px 14px',
						cursor: 'pointer',
						fontWeight: 600,
					}}
				>
					Run Seed
				</button>
			</form>
		</main>
	);
}
