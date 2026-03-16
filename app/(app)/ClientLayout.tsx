"use client";

import Topbar from "../components/Topbar";
import SidebarClient from "../components/SidebarClient";
import { useState } from "react";
import { UserProvider } from "../components/UserContext";
import { VehiclesProvider } from "../components/VehicleContext";


export default function ClientLayout({user, children}: {user: any, children: React.ReactNode}) {
    const [open, setOpen] = useState(true);

    return(
        <UserProvider user={user}>
            <VehiclesProvider>
                <div className="flex h-screen w-screen overflow-hidden">
                    <SidebarClient open={open} user={user} />
                    <div className="flex-1 min-w-0 bg-gray-100">
                        <Topbar open={open} setOpen={setOpen}/>
                        <main className="h-[calc(100vh-4rem)] overflow-auto">
                            {children}
                        </main>
                    </div>
                </div>
            </VehiclesProvider>
        </UserProvider>
    );
}