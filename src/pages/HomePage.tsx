import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { TalkSummary } from "../../shared/types";
import { TalkCard } from "../components/TalkCard";
import { ApiError, getLatestTalks } from "../lib/api";

export function HomePage() {
	const [talks, setTalks] = useState<TalkSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			try {
				const payload = await getLatestTalks(3);
				if (!cancelled) {
					setTalks(payload.talks);
				}
			} catch (caught) {
				if (!cancelled) {
					setError(caught instanceof ApiError ? caught.message : "暂时无法加载演讲档案。");
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
			<section className="hero">
				<p className="hero__eyebrow">Agora / 对话广场</p>
				<h1 className="hero__title">
					<span>以表达传递热爱</span>
					<span>以交流碰撞思想</span>
					<span>以思辨塑造理性</span>
				</h1>
				<p className="hero__subtitle">
					以“表达、交流、思辨”为核心驱动力，连接每一颗渴望共鸣的心灵。
				</p>
				<div className="hero__actions">
					<Link className="button" to="/about">
						了解社团
					</Link>
					<Link className="button button--ghost" to="/talks">
						查看演讲档案
					</Link>
				</div>
			</section>

			<section className="section-card">
				<div className="section-heading">
					<div>
						<p className="section-label">Latest Archive</p>
						<h2>最新演讲 PPT 档案</h2>
					</div>
					<Link className="text-link" to="/talks">
						查看全部
					</Link>
				</div>
				{loading ? <p className="muted">正在加载最新演讲...</p> : null}
				{error ? <p className="form-error">{error}</p> : null}
				{!loading && !error && talks.length === 0 ? (
					<p className="muted">当前还没有已发布的演讲档案，管理员登录后即可录入第一条演讲记录与 PPT 外链。</p>
				) : null}
				<div className="talk-grid">
					{talks.map((talk) => (
						<TalkCard key={talk.id} talk={talk} />
					))}
				</div>
			</section>
		</div>
	);
}
