import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { TalkSummary } from "../../shared/types";
import { ApiError, deleteTalk, getTalkDownloadUrl, getTalks } from "../lib/api";
import { formatDateLabel, formatFileSize } from "../lib/format";
import { useSession } from "../lib/session";

export function AdminDashboardPage() {
	const { admin } = useSession();
	const [talks, setTalks] = useState<TalkSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

	const loadTalks = async () => {
		setLoading(true);
		setError(null);
		try {
			const payload = await getTalks();
			setTalks(payload.talks);
		} catch (caught) {
			setError(caught instanceof ApiError ? caught.message : "暂时无法加载后台列表。");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadTalks();
	}, []);

	return (
		<div className="page">
			<section className="section-card">
				<div className="section-heading">
					<div>
						<p className="section-label">Admin Console</p>
						<h1>管理后台</h1>
						<p className="muted">当前管理员：{admin?.username}</p>
					</div>
					<Link className="button" to="/admin/talks/new">
						新增演讲记录
					</Link>
				</div>
				{loading ? <p className="muted">正在加载后台数据...</p> : null}
				{error ? <p className="form-error">{error}</p> : null}
				{!loading && !error && talks.length === 0 ? <p className="muted">当前还没有演讲记录。</p> : null}
				{talks.length > 0 ? (
					<div className="table-shell">
						<table className="admin-table">
							<thead>
								<tr>
									<th>标题</th>
									<th>演讲者</th>
									<th>日期</th>
									<th>文件</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								{talks.map((talk) => (
									<tr key={talk.id}>
										<td>
											<strong>{talk.title}</strong>
											<p className="muted table-summary">{talk.summary}</p>
										</td>
										<td>{talk.speakerName}</td>
										<td>{formatDateLabel(talk.eventDate)}</td>
										<td>
											{talk.pptFileName}
											<br />
											<span className="muted">{formatFileSize(talk.pptSizeBytes)}</span>
										</td>
										<td>
											<div className="table-actions">
												<Link className="button button--ghost" to={`/admin/talks/${talk.id}/edit`}>
													编辑
												</Link>
												<a className="button button--ghost" href={getTalkDownloadUrl(talk.id)}>
													下载
												</a>
												<button
													className="button button--danger"
													type="button"
													disabled={pendingDeleteId === talk.id}
													onClick={async () => {
														if (!window.confirm(`确定删除《${talk.title}》及其 PPT 文件吗？`)) {
															return;
														}
														setPendingDeleteId(talk.id);
														setError(null);
														try {
															await deleteTalk(talk.id);
															await loadTalks();
														} catch (caught) {
															setError(caught instanceof ApiError ? caught.message : "删除失败。");
														} finally {
															setPendingDeleteId(null);
														}
													}}
												>
													{pendingDeleteId === talk.id ? "删除中..." : "删除"}
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</section>
		</div>
	);
}
