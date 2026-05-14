import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { TalkDetail } from "../../shared/types";
import { ApiError, getTalk } from "../lib/api";
import { formatDateLabel, formatFileSize } from "../lib/format";

export function TalkDetailPage() {
	const { talkId } = useParams();
	const [talk, setTalk] = useState<TalkDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const id = Number(talkId);

		if (!Number.isFinite(id) || id <= 0) {
			setError("无效的演讲编号。");
			setLoading(false);
			return;
		}

		void (async () => {
			try {
				const payload = await getTalk(id);
				if (!cancelled) {
					setTalk(payload.talk);
				}
			} catch (caught) {
				if (!cancelled) {
					setError(caught instanceof ApiError ? caught.message : "暂时无法加载演讲详情。");
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
	}, [talkId]);

	if (loading) {
		return (
			<div className="page">
				<section className="section-card">
					<p className="muted">正在加载演讲详情...</p>
				</section>
			</div>
		);
	}

	if (error || !talk) {
		return (
			<div className="page">
				<section className="section-card">
					<p className="form-error">{error || "演讲不存在。"}</p>
					<Link className="button button--ghost" to="/talks">
						返回演讲列表
					</Link>
				</section>
			</div>
		);
	}

	return (
		<div className="page">
			<section className="section-card section-card--wide">
				<div className="section-heading">
					<div>
						<p className="section-label">Talk Detail</p>
						<h1>{talk.title}</h1>
					</div>
					<a className="button" href={talk.downloadUrl}>
						下载 PPT
					</a>
				</div>
				<dl className="detail-grid">
					<div>
						<dt>演讲者</dt>
						<dd>{talk.speakerName}</dd>
					</div>
					<div>
						<dt>日期</dt>
						<dd>{formatDateLabel(talk.eventDate)}</dd>
					</div>
					<div>
						<dt>文件</dt>
						<dd>
							{talk.pptFileName} · {formatFileSize(talk.pptSizeBytes)}
						</dd>
					</div>
				</dl>
				<section className="detail-block">
					<h2>简介</h2>
					<p>{talk.summary}</p>
				</section>
				<section className="detail-block">
					<h2>演讲者反馈</h2>
					<p>{talk.speakerFeedback || "当前尚未填写演讲者反馈文字。"}</p>
				</section>
			</section>
		</div>
	);
}
