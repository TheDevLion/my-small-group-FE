import { environment } from "src/environments/environment";

const LOGGED_IN = "mysmallgroup_logged_in";
const GROUP_ID = "mysmallgroup_groupid";
let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;

export const saveSessionState = (groupID: string) => {
    sessionVersion++;
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
    sessionVersion++;
    sessionStorage.removeItem(LOGGED_IN);
    sessionStorage.removeItem(GROUP_ID);
}

export const checkIfLoggedIn = () => {
    return sessionStorage.getItem(LOGGED_IN) === "true";
}

export const baseApiFetch = async (path: string, options: RequestInit = {}) => {
    const version = sessionVersion;
    try {
        const response = await fetch(`${environment.apiUrl}${path}`, {
            ...options,
            headers: {
                ...(options.body instanceof FormData ? {} : {"Content-Type": "application/json"}),
                ...(getSessionState().groupID && path !== '/login' ? {'X-Group-ID': getSessionState().groupID} : {}),
                ...(options.headers || {}),
            },
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
    await baseApiFetch("/logout", {
        method: "POST",
    });
    clearSessionState();
}
