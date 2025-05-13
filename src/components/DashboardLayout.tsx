
import React, { ReactNode } from "react";
import { Sidebar } from "@/components/ui/sidebar";
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
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
            {children}
            
            {/* Admin Action Log - Only visible to admin users */}
            {isAdmin && (
              <div className="mt-8">
                <AdminActionLog />
              </div>
            )}
          </main>
        </div>
      </div>
      <Toaster />
    </>
  );
};

export default DashboardLayout;
