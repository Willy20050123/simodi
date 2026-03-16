"use client";

import { createContext, useContext } from "react";


export type CurrentUser = {
    id?:    number | string;
    nip?:   number | string;
    name?:  string;
    fungsi?:  string;
    posisi?:  string;
    role?: string;
}

const UserContext = createContext<CurrentUser | null>(null);

export function UserProvider({ user, children }: { user: CurrentUser, children: React.ReactNode }){
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useCurrentUser() {
    const uc = useContext(UserContext);
    if (!uc) throw new Error("useCurrentUser must be used inside UserProvider");
    return uc;
}