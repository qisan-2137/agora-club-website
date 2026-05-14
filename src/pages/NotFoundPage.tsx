import { Link } from "react-router-dom";

export function NotFoundPage() {
	return (
		<div className="page">
			<section className="section-card narrow-card">
				<p className="section-label">404</p>
				<h1>页面不存在</h1>
				<p className="muted">你访问的页面不存在，或链接已失效。</p>
				<Link className="button" to="/">
					返回首页
				</Link>
			</section>
		</div>
	);
}
