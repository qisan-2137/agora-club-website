import type {
	AdminIdentity,
	ApiErrorPayload,
	SessionPayload,
	TalkDetail,
	TalkPayload,
	TalkSummary,
	TalksPayload,
} from "../shared/types";

const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
};

const textEncoder = new TextEncoder();
const SESSION_COOKIE_FALLBACK = "agora_session";
const SESSION_DURATION_DAYS_FALLBACK = 7;
const MAX_PPT_SIZE_MB_FALLBACK = 40;
const TALK_FILE_PATTERN = /\.(ppt|pptx)$/i;
const TALK_LIMIT_MAX = 6;

type AppEnv = Env & {
	DB: D1Database;
	PPTS: R2Bucket;
	SESSION_SECRET: string;
	SESSION_COOKIE_NAME?: string;
	SESSION_DURATION_DAYS?: string;
	MAX_PPT_SIZE_MB?: string;
};

interface AdminRow {
	id: number;
	username: string;
	password_hash: string;
	role: "admin";
	is_active: number;
}

interface SessionRow {
	id: string;
	admin_id: number;
	username: string;
	role: "admin";
	expires_at: string;
}

interface TalkRow {
	id: number;
	title: string;
	speaker_name: string;
	event_date: string;
	summary: string;
	speaker_feedback: string | null;
	ppt_object_key: string;
	ppt_original_filename: string;
	ppt_mime_type: string;
	ppt_size_bytes: number;
	created_at: string;
	updated_at: string;
}

interface ParsedTalkForm {
	title: string;
	speakerName: string;
	eventDate: string;
	summary: string;
	speakerFeedback: string | null;
	file: File | null;
}

class HttpError extends Error {
	status: number;
	details?: Record<string, string>;

	constructor(status: number, message: string, details?: Record<string, string>) {
		super(message);
		this.status = status;
		this.details = details;
	}
}

function json<T>(data: T, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			...JSON_HEADERS,
			...(init.headers ?? {}),
		},
	});
}

function jsonError(status: number, error: string, details?: Record<string, string>): Response {
	const payload: ApiErrorPayload = { error, details };
	return json(payload, { status });
}

function normalizeString(value: FormDataEntryValue | null): string {
	return typeof value === "string" ? value.trim() : "";
}

function parseOptionalText(value: FormDataEntryValue | null): string | null {
	const text = normalizeString(value);
	return text ? text : null;
}

function parseInteger(value: string | undefined, fallback: number): number {
	if (!value) {
		return fallback;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getCookieName(env: AppEnv): string {
	return env.SESSION_COOKIE_NAME || SESSION_COOKIE_FALLBACK;
}

function getSessionDurationDays(env: AppEnv): number {
	return parseInteger(env.SESSION_DURATION_DAYS, SESSION_DURATION_DAYS_FALLBACK);
}

function getMaxPptSizeBytes(env: AppEnv): number {
	return parseInteger(env.MAX_PPT_SIZE_MB, MAX_PPT_SIZE_MB_FALLBACK) * 1024 * 1024;
}

function isLocalHost(hostname: string): boolean {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

function shouldUseSecureCookie(request: Request): boolean {
	const url = new URL(request.url);
	return url.protocol === "https:" && !isLocalHost(url.hostname);
}

function ensureSameOrigin(request: Request): Response | null {
	const origin = request.headers.get("origin");
	if (!origin) {
		return null;
	}

	const requestUrl = new URL(request.url);
	const originUrl = new URL(origin);
	if (originUrl.origin === requestUrl.origin) {
		return null;
	}

	if (isLocalHost(originUrl.hostname) && isLocalHost(requestUrl.hostname)) {
		return null;
	}

	return jsonError(403, "Cross-origin write requests are blocked.");
}

function mapTalkRow(request: Request, row: TalkRow): TalkSummary {
	void request;
	return {
		id: row.id,
		title: row.title,
		speakerName: row.speaker_name,
		eventDate: row.event_date,
		summary: row.summary,
		pptFileName: row.ppt_original_filename,
		pptSizeBytes: row.ppt_size_bytes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapTalkDetail(request: Request, row: TalkRow): TalkDetail {
	return {
		...mapTalkRow(request, row),
		speakerFeedback: row.speaker_feedback,
		downloadUrl: new URL(`/api/talks/${row.id}/download`, request.url).pathname,
	};
}

function parseCookieValue(request: Request, key: string): string | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) {
		return null;
	}

	for (const part of cookieHeader.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name === key) {
			return rest.join("=") || null;
		}
	}

	return null;
}

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): ArrayBuffer {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
	const padded = normalized + "=".repeat(padLength);
	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return bytes.buffer.slice(0);
}

async function sha256Base64Url(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
	return base64UrlEncode(new Uint8Array(digest));
}

async function hashSessionToken(token: string, secret: string): Promise<string> {
	return sha256Base64Url(`${secret}:${token}`);
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const [scheme, iterationValue, saltValue, hashValue] = storedHash.split("$");
	if (scheme !== "pbkdf2" || !iterationValue || !saltValue || !hashValue) {
		return false;
	}

	const iterations = Number.parseInt(iterationValue, 10);
	if (!Number.isFinite(iterations) || iterations <= 0) {
		return false;
	}

	const keyMaterial = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, [
		"deriveBits",
	]);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			hash: "SHA-256",
			salt: base64UrlDecode(saltValue),
			iterations,
		},
		keyMaterial,
		256
	);

	return base64UrlEncode(new Uint8Array(derivedBits)) === hashValue;
}

function buildSessionCookie(request: Request, env: AppEnv, token: string, expiresAt: Date): string {
	const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
	const parts = [
		`${getCookieName(env)}=${token}`,
		"Path=/",
		`Max-Age=${maxAgeSeconds}`,
		"HttpOnly",
		"SameSite=Lax",
	];
	if (shouldUseSecureCookie(request)) {
		parts.push("Secure");
	}
	return parts.join("; ");
}

function buildClearedSessionCookie(request: Request, env: AppEnv): string {
	const parts = [
		`${getCookieName(env)}=`,
		"Path=/",
		"Max-Age=0",
		"HttpOnly",
		"SameSite=Lax",
	];
	if (shouldUseSecureCookie(request)) {
		parts.push("Secure");
	}
	return parts.join("; ");
}

async function getAuthenticatedAdmin(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<AdminIdentity | null> {
	const token = parseCookieValue(request, getCookieName(env));
	if (!token) {
		return null;
	}

	const tokenHash = await hashSessionToken(token, env.SESSION_SECRET);
	const result = await env.DB.prepare(
		`
		SELECT admin_sessions.id, admin_sessions.admin_id, admins.username, admins.role, admin_sessions.expires_at
		FROM admin_sessions
		INNER JOIN admins ON admins.id = admin_sessions.admin_id
		WHERE admin_sessions.token_hash = ?
			AND admin_sessions.revoked_at IS NULL
			AND admin_sessions.expires_at > CURRENT_TIMESTAMP
			AND admins.is_active = 1
		LIMIT 1
		`
	)
		.bind(tokenHash)
		.first<SessionRow>();

	if (!result) {
		return null;
	}

	ctx.waitUntil(
		env.DB.prepare("UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?").bind(result.id).run()
	);

	return {
		id: result.admin_id,
		username: result.username,
		role: result.role,
	};
}

async function requireAdmin(
	request: Request,
	env: AppEnv,
	ctx: ExecutionContext
): Promise<{ admin: AdminIdentity | null; response: Response | null }> {
	const admin = await getAuthenticatedAdmin(request, env, ctx);
	if (!admin) {
		return {
			admin: null,
			response: jsonError(401, "Authentication required."),
		};
	}

	return { admin, response: null };
}

async function listTalkRows(env: AppEnv, limit?: number): Promise<TalkRow[]> {
	const baseQuery = `
		SELECT id, title, speaker_name, event_date, summary, speaker_feedback,
		       ppt_object_key, ppt_original_filename, ppt_mime_type, ppt_size_bytes,
		       created_at, updated_at
		FROM talks
		ORDER BY event_date DESC, id DESC
	`;

	if (typeof limit === "number") {
		const result = await env.DB.prepare(`${baseQuery} LIMIT ?`).bind(limit).all<TalkRow>();
		return result.results;
	}

	const result = await env.DB.prepare(baseQuery).all<TalkRow>();
	return result.results;
}

async function getTalkRowById(env: AppEnv, talkId: number): Promise<TalkRow | null> {
	return env.DB.prepare(
		`
		SELECT id, title, speaker_name, event_date, summary, speaker_feedback,
		       ppt_object_key, ppt_original_filename, ppt_mime_type, ppt_size_bytes,
		       created_at, updated_at
		FROM talks
		WHERE id = ?
		LIMIT 1
		`
	)
		.bind(talkId)
		.first<TalkRow>();
}

function sanitizeFilename(name: string): string {
	return name
		.normalize("NFKC")
		.replace(/[^\p{L}\p{N}._-]+/gu, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();
}

function makeObjectKey(eventDate: string, originalFilename: string): string {
	const safeName =
		sanitizeFilename(originalFilename) ||
		`slides${originalFilename.toLowerCase().endsWith(".ppt") ? ".ppt" : ".pptx"}`;
	return `talks/${eventDate}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

async function parseTalkForm(request: Request, env: AppEnv, isCreate: boolean): Promise<ParsedTalkForm> {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.includes("multipart/form-data")) {
		throw new HttpError(415, "Please submit talk data as multipart/form-data.");
	}

	const formData = await request.formData();
	const title = normalizeString(formData.get("title"));
	const speakerName = normalizeString(formData.get("speakerName"));
	const eventDate = normalizeString(formData.get("eventDate"));
	const summary = normalizeString(formData.get("summary"));
	const speakerFeedback = parseOptionalText(formData.get("speakerFeedback"));
	const fileValue = formData.get("pptFile");
	const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
	const details: Record<string, string> = {};

	if (!title) {
		details.title = "请输入演讲标题。";
	}
	if (!speakerName) {
		details.speakerName = "请输入演讲者姓名。";
	}
	if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
		details.eventDate = "请输入有效日期，格式为 YYYY-MM-DD。";
	}
	if (!summary) {
		details.summary = "请输入演讲简介。";
	}
	if (isCreate && !file) {
		details.pptFile = "请上传 PPT 文件。";
	}

	if (file) {
		if (!TALK_FILE_PATTERN.test(file.name)) {
			details.pptFile = "仅支持 .ppt 或 .pptx 文件。";
		}
		if (file.size > getMaxPptSizeBytes(env)) {
			details.pptFile = `PPT 文件大小不能超过 ${parseInteger(env.MAX_PPT_SIZE_MB, MAX_PPT_SIZE_MB_FALLBACK)}MB。`;
		}
	}

	if (Object.keys(details).length > 0) {
		throw new HttpError(400, "Talk data validation failed.", details);
	}

	return {
		title,
		speakerName,
		eventDate,
		summary,
		speakerFeedback,
		file,
	};
}

async function uploadPptFile(env: AppEnv, eventDate: string, file: File): Promise<{
	objectKey: string;
	originalFilename: string;
	mimeType: string;
	sizeBytes: number;
}> {
	const objectKey = makeObjectKey(eventDate, file.name);
	const mimeType =
		file.type ||
		(file.name.toLowerCase().endsWith(".ppt")
			? "application/vnd.ms-powerpoint"
			: "application/vnd.openxmlformats-officedocument.presentationml.presentation");

	await env.PPTS.put(objectKey, await file.arrayBuffer(), {
		httpMetadata: {
			contentType: mimeType,
			contentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
		},
	});

	return {
		objectKey,
		originalFilename: file.name,
		mimeType,
		sizeBytes: file.size,
	};
}

async function handleLogin(request: Request, env: AppEnv): Promise<Response> {
	const body = (await request.json()) as { username?: string; password?: string };
	const username = body.username?.trim();
	const password = body.password;

	if (!username || !password) {
		return jsonError(400, "Username and password are required.");
	}

	const admin = await env.DB.prepare(
		`
		SELECT id, username, password_hash, role, is_active
		FROM admins
		WHERE username = ?
		LIMIT 1
		`
	)
		.bind(username)
		.first<AdminRow>();

	if (!admin || !admin.is_active) {
		return jsonError(401, "Invalid username or password.");
	}

	const passwordOk = await verifyPassword(password, admin.password_hash);
	if (!passwordOk) {
		return jsonError(401, "Invalid username or password.");
	}

	const token = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
	const tokenHash = await hashSessionToken(token, env.SESSION_SECRET);
	const expiresAt = new Date(Date.now() + getSessionDurationDays(env) * 24 * 60 * 60 * 1000);

	await env.DB.batch([
		env.DB.prepare(
			`
			INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at, last_seen_at, created_at)
			VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`
		).bind(crypto.randomUUID(), admin.id, tokenHash, expiresAt.toISOString()),
		env.DB.prepare(
			`
			UPDATE admins
			SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
			`
		).bind(admin.id),
	]);

	const payload: SessionPayload = {
		admin: {
			id: admin.id,
			username: admin.username,
			role: admin.role,
		},
	};

	return json(payload, {
		headers: {
			"Set-Cookie": buildSessionCookie(request, env, token, expiresAt),
		},
	});
}

async function handleLogout(request: Request, env: AppEnv): Promise<Response> {
	const token = parseCookieValue(request, getCookieName(env));
	if (token) {
		const tokenHash = await hashSessionToken(token, env.SESSION_SECRET);
		await env.DB.prepare(
			"UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL"
		)
			.bind(tokenHash)
			.run();
	}

	return json(
		{ ok: true },
		{
			headers: {
				"Set-Cookie": buildClearedSessionCookie(request, env),
			},
		}
	);
}

async function handleCreateTalk(request: Request, env: AppEnv, admin: AdminIdentity): Promise<Response> {
	const data = await parseTalkForm(request, env, true);
	if (!data.file) {
		return jsonError(400, "PPT file is required.");
	}

	let uploadResult: Awaited<ReturnType<typeof uploadPptFile>> | null = null;
	try {
		uploadResult = await uploadPptFile(env, data.eventDate, data.file);
		const inserted = await env.DB.prepare(
			`
			INSERT INTO talks (
				title, speaker_name, event_date, summary, speaker_feedback,
				ppt_object_key, ppt_original_filename, ppt_mime_type, ppt_size_bytes,
				created_by_admin_id, updated_by_admin_id, created_at, updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			RETURNING id
			`
		)
			.bind(
				data.title,
				data.speakerName,
				data.eventDate,
				data.summary,
				data.speakerFeedback,
				uploadResult.objectKey,
				uploadResult.originalFilename,
				uploadResult.mimeType,
				uploadResult.sizeBytes,
				admin.id,
				admin.id
			)
			.first<{ id: number }>();

		if (!inserted?.id) {
			throw new HttpError(500, "Failed to save the talk record.");
		}

		const talk = await getTalkRowById(env, inserted.id);
		if (!talk) {
			throw new HttpError(500, "Talk was created but could not be reloaded.");
		}

		const payload: TalkPayload = { talk: mapTalkDetail(request, talk) };
		return json(payload, { status: 201 });
	} catch (error) {
		if (uploadResult) {
			await env.PPTS.delete(uploadResult.objectKey);
		}
		throw error;
	}
}

async function handleUpdateTalk(request: Request, env: AppEnv, admin: AdminIdentity, talkId: number): Promise<Response> {
	const existing = await getTalkRowById(env, talkId);
	if (!existing) {
		return jsonError(404, "Talk not found.");
	}

	const data = await parseTalkForm(request, env, false);
	let uploadResult: Awaited<ReturnType<typeof uploadPptFile>> | null = null;

	try {
		if (data.file) {
			uploadResult = await uploadPptFile(env, data.eventDate, data.file);
		}

		const nextObjectKey = uploadResult?.objectKey ?? existing.ppt_object_key;
		const nextFilename = uploadResult?.originalFilename ?? existing.ppt_original_filename;
		const nextMimeType = uploadResult?.mimeType ?? existing.ppt_mime_type;
		const nextSize = uploadResult?.sizeBytes ?? existing.ppt_size_bytes;

		await env.DB.prepare(
			`
			UPDATE talks
			SET title = ?,
			    speaker_name = ?,
			    event_date = ?,
			    summary = ?,
			    speaker_feedback = ?,
			    ppt_object_key = ?,
			    ppt_original_filename = ?,
			    ppt_mime_type = ?,
			    ppt_size_bytes = ?,
			    updated_by_admin_id = ?,
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
			`
		)
			.bind(
				data.title,
				data.speakerName,
				data.eventDate,
				data.summary,
				data.speakerFeedback,
				nextObjectKey,
				nextFilename,
				nextMimeType,
				nextSize,
				admin.id,
				talkId
			)
			.run();

		if (uploadResult && existing.ppt_object_key !== uploadResult.objectKey) {
			await env.PPTS.delete(existing.ppt_object_key);
		}

		const talk = await getTalkRowById(env, talkId);
		if (!talk) {
			throw new HttpError(500, "Updated talk could not be reloaded.");
		}

		const payload: TalkPayload = { talk: mapTalkDetail(request, talk) };
		return json(payload);
	} catch (error) {
		if (uploadResult) {
			await env.PPTS.delete(uploadResult.objectKey);
		}
		throw error;
	}
}

async function handleDeleteTalk(env: AppEnv, talkId: number): Promise<Response> {
	const existing = await getTalkRowById(env, talkId);
	if (!existing) {
		return jsonError(404, "Talk not found.");
	}

	await env.DB.prepare("DELETE FROM talks WHERE id = ?").bind(talkId).run();
	await env.PPTS.delete(existing.ppt_object_key);
	return json({ ok: true });
}

async function handleTalkDownload(request: Request, env: AppEnv, talkId: number): Promise<Response> {
	const talk = await getTalkRowById(env, talkId);
	if (!talk) {
		return jsonError(404, "Talk not found.");
	}

	const object = await env.PPTS.get(talk.ppt_object_key);
	if (!object) {
		return jsonError(404, "PPT file not found.");
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("content-type", talk.ppt_mime_type);
	headers.set("content-disposition", `attachment; filename="${encodeURIComponent(talk.ppt_original_filename)}"`);

	return new Response(object.body, { headers });
}

function parseTalkId(value: string | undefined): number | null {
	if (!value) {
		return null;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function handleApi(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);
	const segments = url.pathname.split("/").filter(Boolean);
	const [, resource, id, action] = segments;

	if (request.method !== "GET") {
		const sameOriginError = ensureSameOrigin(request);
		if (sameOriginError) {
			return sameOriginError;
		}
	}

	if (resource === "health" && request.method === "GET") {
		return json({
			ok: true,
			date: new Date().toISOString(),
		});
	}

	if (resource === "auth" && request.method === "GET" && id === "me") {
		const admin = await getAuthenticatedAdmin(request, env, ctx);
		if (!admin) {
			return jsonError(401, "Not authenticated.");
		}
		const payload: SessionPayload = { admin };
		return json(payload);
	}

	if (resource === "auth" && request.method === "POST" && id === "login") {
		return handleLogin(request, env);
	}

	if (resource === "auth" && request.method === "POST" && id === "logout") {
		return handleLogout(request, env);
	}

	if (resource === "talks" && request.method === "GET" && !id) {
		const rows = await listTalkRows(env);
		const payload: TalksPayload = { talks: rows.map((row) => mapTalkRow(request, row)) };
		return json(payload);
	}

	if (resource === "talks" && request.method === "GET" && id === "latest") {
		const limit = Math.min(parseInteger(url.searchParams.get("limit") ?? undefined, 3), TALK_LIMIT_MAX);
		const rows = await listTalkRows(env, limit);
		const payload: TalksPayload = { talks: rows.map((row) => mapTalkRow(request, row)) };
		return json(payload);
	}

	if (resource === "talks" && request.method === "GET" && action === "download") {
		const talkId = parseTalkId(id);
		if (!talkId) {
			return jsonError(400, "Invalid talk id.");
		}
		return handleTalkDownload(request, env, talkId);
	}

	if (resource === "talks" && request.method === "GET" && id) {
		const talkId = parseTalkId(id);
		if (!talkId) {
			return jsonError(400, "Invalid talk id.");
		}
		const talk = await getTalkRowById(env, talkId);
		if (!talk) {
			return jsonError(404, "Talk not found.");
		}
		const payload: TalkPayload = { talk: mapTalkDetail(request, talk) };
		return json(payload);
	}

	if (resource === "admin" && segments[2] === "talks") {
		const { admin, response } = await requireAdmin(request, env, ctx);
		if (response || !admin) {
			return response as Response;
		}

		if (request.method === "POST" && !segments[3]) {
			return handleCreateTalk(request, env, admin);
		}

		const talkId = parseTalkId(segments[3]);
		if (!talkId) {
			return jsonError(400, "Invalid talk id.");
		}

		if (request.method === "PATCH") {
			return handleUpdateTalk(request, env, admin, talkId);
		}

		if (request.method === "DELETE") {
			return handleDeleteTalk(env, talkId);
		}
	}

	return jsonError(404, "API route not found.");
}

export default {
	async fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);
			if (!url.pathname.startsWith("/api/")) {
				return new Response("Not Found", { status: 404 });
			}
			return await handleApi(request, env, ctx);
		} catch (error) {
			if (error instanceof HttpError) {
				return jsonError(error.status, error.message, error.details);
			}

			console.error(error);
			return jsonError(500, "Unexpected server error.");
		}
	},
} satisfies ExportedHandler<AppEnv>;
