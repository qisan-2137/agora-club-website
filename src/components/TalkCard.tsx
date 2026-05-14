import { Link } from "react-router-dom";
import type { TalkSummary } from "../../shared/types";
import { formatDateLabel, formatFileSize } from "../lib/format";
import { getTalkDownloadUrl } from "../lib/api";

interface TalkCardProps {
	talk: TalkSummary;
}

export function TalkCard({ talk }: TalkCardProps) {
	return (
		<article className="talk-card">
			<div className="talk-card__meta">
				<span>{formatDateLabel(talk.eventDate)}</span>
				<span>{talk.speakerName}</span>
			</div>
			<h3 className="talk-card__title">
				<Link to={`/talks/${talk.id}`}>{talk.title}</Link>
			</h3>
			<p className="talk-card__summary">{talk.summary}</p>
			<div className="talk-card__footer">
				<span className="muted">
					{talk.pptFileName} · {formatFileSize(talk.pptSizeBytes)}
				</span>
				<div className="talk-card__actions">
					<Link className="button button--ghost" to={`/talks/${talk.id}`}>
						查看详情
					</Link>
					<a className="button" href={getTalkDownloadUrl(talk.id)}>
						下载 PPT
					</a>
				</div>
			</div>
		</article>
	);
}
