import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const baseDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(baseDir, "..");
const textEncoder = new TextEncoder();
const iterations = 210000;

function parseArgs() {
	const args = new Set(process.argv.slice(2));
	return {
		local: args.has("--local"),
		remote: args.has("--remote"),
	};
}

function loadDotEnv() {
	const filePath = resolve(rootDir, ".dev.vars");
	if (!existsSync(filePath)) {
		return;
	}

	const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, eqIndex).trim();
		let value = trimmed.slice(eqIndex + 1).trim();
		if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

function base64UrlEncode(bytes) {
	return Buffer.from(bytes)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

async function createPasswordHash(password) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits"]
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			hash: "SHA-256",
			salt,
			iterations,
		},
		keyMaterial,
		256
	);

	return `pbkdf2$${iterations}$${base64UrlEncode(salt)}$${base64UrlEncode(new Uint8Array(derivedBits))}`;
}

function escapeSql(value) {
	return value.replace(/'/g, "''");
}

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

async function main() {
	loadDotEnv();
	const { local, remote } = parseArgs();
	const admin1Password = requireEnv("ADMIN1_PASSWORD");
	const admin2Password = requireEnv("ADMIN2_PASSWORD");

	if (local && remote) {
		throw new Error("Use either --local or --remote, not both.");
	}

	const targetFlag = remote ? "--remote" : "--local";
	const admin1Hash = await createPasswordHash(admin1Password);
	const admin2Hash = await createPasswordHash(admin2Password);

	const sql = `
INSERT INTO admins (username, password_hash, role, is_active, created_at, updated_at)
VALUES
  ('Admin1', '${escapeSql(admin1Hash)}', 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Admin2', '${escapeSql(admin2Hash)}', 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(username) DO UPDATE SET
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = CURRENT_TIMESTAMP;
`.trim();

	execFileSync(
		"npx",
		["wrangler", "d1", "execute", "agora-club-db", targetFlag, "--command", sql],
		{
			cwd: rootDir,
			stdio: "inherit",
			env: process.env,
		}
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
