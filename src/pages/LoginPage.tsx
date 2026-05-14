import { startTransition, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, login } from "../lib/api";
import { useSession } from "../lib/session";

export function LoginPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { admin, refresh } = useSession();
	const [username, setUsername] = useState("Admin1");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (admin) {
		return (
			<div className="page">
				<section className="section-card narrow-card">
					<p>当前已登录为 {admin.username}。</p>
					<button
						className="button"
						type="button"
						onClick={() => {
							startTransition(() => {
								navigate("/admin");
							});
						}}
					>
						进入管理后台
					</button>
				</section>
			</div>
		);
	}

	const next = searchParams.get("next") || "/admin";

	return (
		<div className="page">
			<section className="section-card narrow-card">
				<div className="section-heading">
					<div>
						<p className="section-label">Admin Login</p>
						<h1>管理员登录</h1>
					</div>
				</div>
				<form
					className="stack-form"
					onSubmit={async (event) => {
						event.preventDefault();
						setSubmitting(true);
						setError(null);
						try {
							await login(username, password);
							await refresh();
							startTransition(() => {
								navigate(next, { replace: true });
							});
						} catch (caught) {
							setError(caught instanceof ApiError ? caught.message : "登录失败。");
						} finally {
							setSubmitting(false);
						}
					}}
				>
					<label className="field">
						<span>用户名</span>
						<input value={username} onChange={(event) => setUsername(event.target.value)} required />
					</label>
					<label className="field">
						<span>密码</span>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
						/>
					</label>
					{error ? <p className="form-error">{error}</p> : null}
					<button className="button" type="submit" disabled={submitting}>
						{submitting ? "登录中..." : "登录"}
					</button>
				</form>
				<p className="muted">P0 版本仅开放 Admin1 与 Admin2 两个管理员账号。</p>
			</section>
		</div>
	);
}
