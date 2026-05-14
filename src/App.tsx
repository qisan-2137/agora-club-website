import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout";
import { RequireAdmin } from "./components/RequireAdmin";
import { AboutPage } from "./pages/AboutPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { TalkDetailPage } from "./pages/TalkDetailPage";
import { TalkEditorPage } from "./pages/TalkEditorPage";
import { TalksPage } from "./pages/TalksPage";

export default function App() {
	return (
		<Routes>
			<Route element={<SiteLayout />}>
				<Route index element={<HomePage />} />
				<Route path="/about" element={<AboutPage />} />
				<Route path="/talks" element={<TalksPage />} />
				<Route path="/talks/:talkId" element={<TalkDetailPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/admin"
					element={
						<RequireAdmin>
							<Outlet />
						</RequireAdmin>
					}
				>
					<Route index element={<AdminDashboardPage />} />
					<Route path="talks/new" element={<TalkEditorPage mode="create" />} />
					<Route path="talks/:talkId/edit" element={<TalkEditorPage mode="edit" />} />
				</Route>
				<Route path="/404" element={<NotFoundPage />} />
				<Route path="*" element={<Navigate to="/404" replace />} />
			</Route>
		</Routes>
	);
}
