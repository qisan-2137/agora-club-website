import type { SessionPayload, TalkPayload, TalksPayload } from "../../shared/types";

export class ApiError extends Error {
	status: number;
	details?: Record<string, string>;

	constructor(status: number, message: string, details?: Record<string, string>) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

export interface TalkFormInput {
	title: string;
	speakerName: string;
	eventDate: string;
	summary: string;
	speakerFeedback: string;
	pptUrl: string;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
	const response = await fetch(input, {
		credentials: "same-origin",
		...init,
	});

	const contentType = response.headers.get("content-type") || "";
	const isJson = contentType.includes("application/json");
	const body = isJson
		? ((await response.json()) as { error?: string; details?: Record<string, string> })
		: null;

	if (!response.ok) {
		throw new ApiError(response.status, body?.error || "请求失败。", body?.details);
	}

	return body as T;
}

export function getSession() {
	return requestJson<SessionPayload>("/api/auth/me");
}

export function login(username: string, password: string) {
	return requestJson<SessionPayload>("/api/auth/login", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ username, password }),
	});
}

export function logout() {
	return requestJson<{ ok: true }>("/api/auth/logout", {
		method: "POST",
	});
}

export function getLatestTalks(limit = 3) {
	return requestJson<TalksPayload>(`/api/talks/latest?limit=${limit}`);
}

export function getTalks() {
	return requestJson<TalksPayload>("/api/talks");
}

export function getTalk(talkId: number) {
	return requestJson<TalkPayload>(`/api/talks/${talkId}`);
}

export function createTalk(input: TalkFormInput) {
	return requestJson<TalkPayload>("/api/admin/talks", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(input),
	});
}

export function updateTalk(talkId: number, input: TalkFormInput) {
	return requestJson<TalkPayload>(`/api/admin/talks/${talkId}`, {
		method: "PATCH",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(input),
	});
}

export function deleteTalk(talkId: number) {
	return requestJson<{ ok: true }>(`/api/admin/talks/${talkId}`, {
		method: "DELETE",
	});
}
