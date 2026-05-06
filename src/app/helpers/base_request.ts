import { environment } from "src/environments/environment";

const LOGGED_IN = "mysmallgroup_logged_in";
const GROUP_ID = "mysmallgroup_groupid";
const AUTH_TOKEN = "mysmallgroup_auth_token";

export const saveSessionState = (groupID: string, authToken = "") => {
    if (groupID) {
        sessionStorage.setItem(LOGGED_IN, "true");
        sessionStorage.setItem(GROUP_ID, groupID);
        if (authToken) {
            sessionStorage.setItem(AUTH_TOKEN, authToken);
        } else {
            sessionStorage.removeItem(AUTH_TOKEN);
        }
    }
}

export const getSessionState = () => {
    return {
        loggedIn: sessionStorage.getItem(LOGGED_IN) === "true",
        groupID: sessionStorage.getItem(GROUP_ID) ?? "",
        authToken: sessionStorage.getItem(AUTH_TOKEN) ?? "",
    };
}

export const clearSessionState = () => {
    sessionStorage.removeItem(LOGGED_IN);
    sessionStorage.removeItem(GROUP_ID);
    sessionStorage.removeItem(AUTH_TOKEN);
}

export const checkIfLoggedIn = () => {
    return sessionStorage.getItem(LOGGED_IN) === "true" && !!sessionStorage.getItem(AUTH_TOKEN);
}

const getAuthToken = () => {
    return sessionStorage.getItem(AUTH_TOKEN) ?? "";
}

export const baseApiFetch = async (path: string, options: RequestInit = {}) => {
    try {
        const headers = new Headers(options.headers || {});
        const isFormDataBody = options.body instanceof FormData;

        if (!isFormDataBody && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        const authToken = getAuthToken();
        if (authToken && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${authToken}`);
        }

        const response = await fetch(`${environment.apiUrl}${path}`, {
            ...options,
            headers,
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
