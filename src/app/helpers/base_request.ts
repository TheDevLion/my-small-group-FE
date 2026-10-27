import { environment } from "src/environments/environment";

const LOGGED_IN = "mysmallgroup_logged_in";
const GROUP_ID = "mysmallgroup_groupid";
const AUTH_TOKEN = "mysmallgroup_auth_token";
let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;

export const saveSessionState = (groupID: string, authToken = "") => {
    sessionVersion++;
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
    sessionVersion++;
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
    const version = sessionVersion;
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

        const groupID = getSessionState().groupID;
        if (groupID && path !== '/login') headers.set('X-Group-ID', groupID);

        const response = await fetch(`${environment.apiUrl}${path}`, {
            ...options,
            headers,
            credentials: "include",
        });

        if (version !== sessionVersion) return {error: 'unauthorized'};
        if (!response.ok) {
            if (response.status === 401) {
                clearSessionState();
                if (path !== '/login') window.dispatchEvent(new Event('session-expired'));
            }
            const data = await response.json().catch(() => null);
            return data?.error ? data : {error: 'api_unavailable'};
        }

        if (response.status === 204) {
            return {};
        }

        const data = await response.json();
        return version === sessionVersion ? data : {error: 'unauthorized'};
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
    const request = baseApiFetch("/logout", {method: "POST"});
    clearSessionState();
    await request;
}
