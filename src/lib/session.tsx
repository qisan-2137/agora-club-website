import { createContext, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import type { AdminIdentity } from "../../shared/types";
import { ApiError, getSession, logout as logoutRequest } from "./api";

interface SessionContextValue {
	admin: AdminIdentity | null;
	loading: boolean;
	refresh: () => Promise<AdminIdentity | null>;
	setAdmin: (admin: AdminIdentity | null) => void;
	logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
	const [admin, setAdmin] = useState<AdminIdentity | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = async () => {
		try {
			const session = await getSession();
			setAdmin(session.admin);
			return session.admin;
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				setAdmin(null);
				return null;
			}
			throw error;
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void refresh();
	}, []);

	const logout = async () => {
		try {
			await logoutRequest();
		} finally {
			setAdmin(null);
		}
	};

	return (
		<SessionContext.Provider
			value={{
				admin,
				loading,
				refresh,
				setAdmin,
				logout,
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}

export function useSession() {
	const value = useContext(SessionContext);
	if (!value) {
		throw new Error("useSession must be used within SessionProvider");
	}
	return value;
}
