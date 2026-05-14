export type AdminRole = "admin";

export interface AdminIdentity {
	id: number;
	username: string;
	role: AdminRole;
}

export interface TalkSummary {
	id: number;
	title: string;
	speakerName: string;
	eventDate: string;
	summary: string;
	pptFileName: string;
	pptSizeBytes: number;
	createdAt: string;
	updatedAt: string;
}

export interface TalkDetail extends TalkSummary {
	speakerFeedback: string | null;
	downloadUrl: string;
}

export interface TalksPayload {
	talks: TalkSummary[];
}

export interface TalkPayload {
	talk: TalkDetail;
}

export interface SessionPayload {
	admin: AdminIdentity;
}

export interface ApiErrorPayload {
	error: string;
	details?: Record<string, string>;
}
