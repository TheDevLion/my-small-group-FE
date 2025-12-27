import { environment } from "src/environments/environment";

const LOGGED_IN = "mysmallgroup_logged_in";
const GROUP_ID = "mysmallgroup_groupid";

export const saveSessionState = (groupID: string) => {
    if (groupID) {
        sessionStorage.setItem(LOGGED_IN, "true");
        sessionStorage.setItem(GROUP_ID, groupID);
    }
}

export const getSessionState = () => {
    return {
        loggedIn: sessionStorage.getItem(LOGGED_IN) === "true",
        groupID: sessionStorage.getItem(GROUP_ID) ?? "",
    };
}

export const clearSessionState = () => {
    sessionStorage.removeItem(LOGGED_IN);
    sessionStorage.removeItem(GROUP_ID);
}

export const checkIfLoggedIn = () => {
    return sessionStorage.getItem(LOGGED_IN) === "true";
}

export const baseApiFetch = async (path: string, options: RequestInit = {}) => {
    try {
        const response = await fetch(`${environment.apiUrl}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
            credentials: "include",
        });

        if (!response.ok) {
            if (response.status === 401) {
                clearSessionState();
                return { error: "unauthorized" };
            }
            return { error: "api_unavailable" };
        }

        if (response.status === 204) {
            return {};
        }

        return await response.json();
    }catch(error){
        return { error: "api_unavailable" };
    }
}

export const login = async (payload: string) => {
    return baseApiFetch("/login", {
        method: "POST",
        body: JSON.stringify({payload: payload}),
    });
}

export const logout = async () => {
    await baseApiFetch("/logout", {
        method: "POST",
    });
    clearSessionState();
}
