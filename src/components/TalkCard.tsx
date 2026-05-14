import { Link } from "react-router-dom";
import type { TalkSummary } from "../../shared/types";
import { formatDateLabel, formatUrlHost } from "../lib/format";

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
				<span className="muted">PPT 外链 · {formatUrlHost(talk.pptUrl)}</span>
				<div className="talk-card__actions">
					<Link className="button button--ghost" to={`/talks/${talk.id}`}>
						查看详情
					</Link>
					<a className="button" href={talk.pptUrl} target="_blank" rel="noreferrer">
						查看 / 下载 PPT
					</a>
				</div>
			</div>
		</article>
	);
}
