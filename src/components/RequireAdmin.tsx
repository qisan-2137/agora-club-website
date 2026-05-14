import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../lib/session";

export function RequireAdmin({ children }: PropsWithChildren) {
	const { admin, loading } = useSession();
	const location = useLocation();

	if (loading) {
		return (
			<section className="page">
				<div className="section-card">
					<p className="muted">正在验证管理员会话...</p>
				</div>
			</section>
		);
	}

	if (!admin) {
		const next = encodeURIComponent(location.pathname + location.search);
		return <Navigate to={`/login?next=${next}`} replace />;
	}

	return <>{children}</>;
}
