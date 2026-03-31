import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

async function seedDatabase() {
	'use server';

	await sql`
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			cash_balance NUMERIC(20,2) NOT NULL DEFAULT 100000.00
		);
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS holdings (
			user_id INT REFERENCES users(id),
			ticker TEXT NOT NULL,
			quantity NUMERIC(20,6) NOT NULL CHECK(quantity >= 0),
			PRIMARY KEY (user_id, ticker)
		);
	`;

	await sql`
		CREATE INDEX IF NOT EXISTS users_username_idx
		ON users (username);
	`;

	revalidatePath('/seed');
}

async function resetDatabase() {
	'use server';

	await sql`DROP TABLE IF EXISTS holdings;`;
	await sql`DROP TABLE IF EXISTS users;`;

	revalidatePath('/seed');
}

type TableInfo = {
	table_name: string;
};

type TableRecords = {
	tableName: string;
	rows: Record<string, unknown>[];
};

function quoteIdentifier(identifier: string) {
	return `"${identifier.replace(/"/g, '""')}"`;
}

export default async function SeedPage() {
	const tables = (await sql<TableInfo>`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
		AND table_type = 'BASE TABLE'
		ORDER BY table_name;
	`).rows;

	const recordsByTable: TableRecords[] = [];

	for (const table of tables) {
		const tableName = table.table_name;
		const query = `SELECT * FROM ${quoteIdentifier(tableName)};`;
		const rows = (await sql.query(query)).rows as Record<string, unknown>[];
		recordsByTable.push({ tableName, rows });
	}

	return (
		<main style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
			<h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Seed Database</h1>
			<p style={{ marginBottom: 20 }}>
				Run seed to ensure core tables exist. Reset will drop app tables even when the database is full.
			</p>

			<div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
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

				<form action={resetDatabase}>
					<button
						type="submit"
						style={{
							background: '#111827',
							color: '#f87171',
							border: '1px solid #f87171',
							borderRadius: 8,
							padding: '10px 14px',
							cursor: 'pointer',
							fontWeight: 600,
						}}
					>
						Reset Everything
					</button>
				</form>
			</div>

			<h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>All Database Tables</h2>
			<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
				<thead>
					<tr>
						<th style={{ textAlign: 'left', borderBottom: '1px solid #374151', padding: '8px 6px' }}>
							Table
						</th>
					</tr>
				</thead>
				<tbody>
					{tables.length === 0 ? (
						<tr>
							<td style={{ padding: '10px 6px', color: '#9ca3af' }}>No tables found.</td>
						</tr>
					) : (
						tables.map((table) => (
							<tr key={table.table_name}>
								<td style={{ padding: '8px 6px', borderBottom: '1px solid #1f2937' }}>
									{table.table_name}
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>

			<h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Table Records</h2>
			<div style={{ display: 'grid', gap: 16 }}>
				{recordsByTable.map((table) => {
					const headers = table.rows.length > 0 ? Object.keys(table.rows[0]) : [];

					return (
						<section
							key={table.tableName}
							style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 12, background: '#0b1220' }}
						>
							<h3 style={{ margin: '0 0 10px 0', fontSize: 16, color: '#d1d5db' }}>
								{table.tableName} ({table.rows.length} rows)
							</h3>
							{table.rows.length === 0 ? (
								<p style={{ margin: 0, color: '#9ca3af' }}>No records found.</p>
							) : (
								<div style={{ overflowX: 'auto' }}>
									<table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
										<thead>
											<tr>
												{headers.map((header) => (
													<th
														key={header}
														style={{
															textAlign: 'left',
															borderBottom: '1px solid #374151',
															padding: '8px 6px',
															fontSize: 13,
															color: '#e5e7eb',
														}}
													>
														{header}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{table.rows.map((row, idx) => (
												<tr key={`${table.tableName}:${idx}`}>
													{headers.map((header) => {
														const value = row[header];
														const displayValue =
															value === null
																? 'null'
																: typeof value === 'object'
																	? JSON.stringify(value)
																	: String(value);

														return (
															<td
																key={`${table.tableName}:${idx}:${header}`}
																style={{
																	padding: '8px 6px',
																	borderBottom: '1px solid #1f2937',
																	color: '#cbd5e1',
																	fontSize: 13,
																	whiteSpace: 'nowrap',
																}}
															>
																{displayValue}
															</td>
														);
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>
					);
				})}
			</div>
		</main>
	);
}
