import { useEffect, useState } from "react";
import type { TalkSummary } from "../../shared/types";
import { TalkCard } from "../components/TalkCard";
import { ApiError, getTalks } from "../lib/api";

export function TalksPage() {
	const [talks, setTalks] = useState<TalkSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			try {
				const payload = await getTalks();
				if (!cancelled) {
					setTalks(payload.talks);
				}
			} catch (caught) {
				if (!cancelled) {
					setError(caught instanceof ApiError ? caught.message : "暂时无法加载演讲列表。");
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
	}, []);

	return (
		<div className="page">
			<section className="section-card">
				<div className="section-heading">
					<div>
						<p className="section-label">Speech Archive</p>
						<h1>演讲 PPT 列表</h1>
					</div>
				</div>
				{loading ? <p className="muted">正在加载演讲列表...</p> : null}
				{error ? <p className="form-error">{error}</p> : null}
				{!loading && !error && talks.length === 0 ? <p className="muted">当前还没有任何演讲档案。</p> : null}
				<div className="talk-grid">
					{talks.map((talk) => (
						<TalkCard key={talk.id} talk={talk} />
					))}
				</div>
			</section>
		</div>
	);
}
