import { startTransition, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { TalkDetail } from "../../shared/types";
import { ApiError, createTalk, getTalk, updateTalk, type TalkFormInput } from "../lib/api";

interface TalkEditorPageProps {
	mode: "create" | "edit";
}

const initialForm = {
	title: "",
	speakerName: "",
	eventDate: "",
	summary: "",
	speakerFeedback: "",
	pptUrl: "",
};

export function TalkEditorPage({ mode }: TalkEditorPageProps) {
	const navigate = useNavigate();
	const { talkId } = useParams();
	const [form, setForm] = useState(initialForm);
	const [currentTalk, setCurrentTalk] = useState<TalkDetail | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [pageError, setPageError] = useState<string | null>(null);
	const [loading, setLoading] = useState(mode === "edit");
	const [submitting, setSubmitting] = useState(false);

	const numericTalkId = Number(talkId);

	useEffect(() => {
		if (mode !== "edit") {
			return;
		}

		if (!Number.isFinite(numericTalkId) || numericTalkId <= 0) {
			setPageError("无效的演讲编号。");
			setLoading(false);
			return;
		}

		let cancelled = false;

		void (async () => {
			try {
				const payload = await getTalk(numericTalkId);
				if (!cancelled) {
					setCurrentTalk(payload.talk);
					setForm({
						title: payload.talk.title,
						speakerName: payload.talk.speakerName,
						eventDate: payload.talk.eventDate,
						summary: payload.talk.summary,
						speakerFeedback: payload.talk.speakerFeedback || "",
						pptUrl: payload.talk.pptUrl,
					});
				}
			} catch (caught) {
				if (!cancelled) {
					setPageError(caught instanceof ApiError ? caught.message : "暂时无法加载演讲记录。");
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [mode, numericTalkId]);

	if (loading) {
		return (
			<div className="page">
				<section className="section-card">
					<p className="muted">正在加载演讲记录...</p>
				</section>
			</div>
		);
	}

	if (pageError) {
		return (
			<div className="page">
				<section className="section-card">
					<p className="form-error">{pageError}</p>
					<Link className="button button--ghost" to="/admin">
						返回后台
					</Link>
				</section>
			</div>
		);
	}

	const heading = mode === "create" ? "新增演讲记录" : "编辑演讲记录";

	return (
		<div className="page">
			<section className="section-card section-card--wide">
				<div className="section-heading">
					<div>
						<p className="section-label">Admin Editor</p>
						<h1>{heading}</h1>
					</div>
					<Link className="button button--ghost" to="/admin">
						返回后台
					</Link>
				</div>
				<form
					className="stack-form"
					onSubmit={async (event) => {
						event.preventDefault();
						setSubmitting(true);
						setFieldErrors({});
						setPageError(null);

						const payload: TalkFormInput = {
							...form,
						};

						try {
							if (mode === "create") {
								await createTalk(payload);
							} else {
								await updateTalk(numericTalkId, payload);
							}
							startTransition(() => {
								navigate("/admin");
							});
						} catch (caught) {
							if (caught instanceof ApiError) {
								setPageError(caught.message);
								setFieldErrors(caught.details || {});
							} else {
								setPageError("保存失败。");
							}
						} finally {
							setSubmitting(false);
						}
					}}
				>
					<div className="field-grid">
						<label className="field">
							<span>标题</span>
							<input
								value={form.title}
								onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
								required
							/>
							{fieldErrors.title ? <small className="form-error">{fieldErrors.title}</small> : null}
						</label>
						<label className="field">
							<span>演讲者</span>
							<input
								value={form.speakerName}
								onChange={(event) =>
									setForm((current) => ({ ...current, speakerName: event.target.value }))
								}
								required
							/>
							{fieldErrors.speakerName ? <small className="form-error">{fieldErrors.speakerName}</small> : null}
						</label>
						<label className="field">
							<span>日期</span>
							<input
								type="date"
								value={form.eventDate}
								onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))}
								required
							/>
							{fieldErrors.eventDate ? <small className="form-error">{fieldErrors.eventDate}</small> : null}
						</label>
						<label className="field">
							<span>PPT 外链</span>
							<input
								type="url"
								placeholder="https://..."
								value={form.pptUrl}
								onChange={(event) => setForm((current) => ({ ...current, pptUrl: event.target.value }))}
								required
							/>
							{fieldErrors.pptUrl ? <small className="form-error">{fieldErrors.pptUrl}</small> : null}
							{currentTalk ? (
								<a className="text-link url-text" href={currentTalk.pptUrl} target="_blank" rel="noreferrer">
									查看当前外链
								</a>
							) : null}
						</label>
					</div>
					<label className="field">
						<span>简介</span>
						<textarea
							rows={5}
							value={form.summary}
							onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
							required
						/>
						{fieldErrors.summary ? <small className="form-error">{fieldErrors.summary}</small> : null}
					</label>
					<label className="field">
						<span>演讲者反馈文字</span>
						<textarea
							rows={6}
							value={form.speakerFeedback}
							onChange={(event) =>
								setForm((current) => ({ ...current, speakerFeedback: event.target.value }))
							}
						/>
					</label>
					{pageError ? <p className="form-error">{pageError}</p> : null}
					<div className="form-actions">
						<button className="button" type="submit" disabled={submitting}>
							{submitting ? "保存中..." : "保存"}
						</button>
						<Link className="button button--ghost" to="/admin">
							取消
						</Link>
					</div>
				</form>
			</section>
		</div>
	);
}
