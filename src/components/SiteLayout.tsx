import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "../lib/session";

const links = [
	{ to: "/", label: "首页" },
	{ to: "/about", label: "社团介绍" },
	{ to: "/talks", label: "演讲档案" },
];

export function SiteLayout() {
	const { admin, logout } = useSession();
	const navigate = useNavigate();

	return (
		<div className="app-shell">
			<header className="site-header">
				<div className="site-header__inner">
					<div>
						<NavLink className="brand" to="/">
							<span className="brand__en">Agora</span>
							<span className="brand__cn">对话广场</span>
						</NavLink>
					</div>
					<nav className="main-nav" aria-label="主导航">
						{links.map((link) => (
							<NavLink
								key={link.to}
								to={link.to}
								className={({ isActive }) => (isActive ? "nav-link nav-link--active" : "nav-link")}
								end={link.to === "/"}
							>
								{link.label}
							</NavLink>
						))}
					</nav>
					<div className="header-actions">
						{admin ? (
							<>
								<NavLink className="button button--ghost" to="/admin">
									管理后台
								</NavLink>
								<button
									className="button button--ghost"
									type="button"
									onClick={async () => {
										await logout();
										navigate("/");
									}}
								>
									退出登录
								</button>
							</>
						) : (
							<NavLink className="button button--ghost" to="/login">
								管理员登录
							</NavLink>
						)}
					</div>
				</div>
			</header>
			<main className="site-main">
				<Outlet />
			</main>
			<footer className="site-footer">
				<p>Agora / 对话广场</p>
				<p className="muted">以表达、交流、思辨连接热爱表达的人。</p>
			</footer>
		</div>
	);
}
