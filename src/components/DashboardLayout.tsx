
import React, { ReactNode } from "react";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { usePermission } from "@/hooks/usePermission";
import AdminActionLog from "@/components/AdminActionLog";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  const { isAdmin } = usePermission();
  
  return (
    <>
      <Helmet>
        <title>Elites Project System</title>
      </Helmet>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300 ease-in-out">
            <main className="flex-1 p-4 sm:p-6 max-w-full w-full mx-auto">
              <div className="container mx-auto max-w-7xl">
                {children}
                
                {/* Admin Action Log - Only visible to admin users */}
                {isAdmin && (
                  <div className="mt-8">
                    <AdminActionLog />
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </>
  );
};

export default DashboardLayout;
