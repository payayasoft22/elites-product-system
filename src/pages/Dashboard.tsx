
import React from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/DashboardLayout";
import { usePermission } from "@/hooks/usePermission";
import AdminActionLog from "@/components/AdminActionLog";

const Dashboard = () => {
  const { isAdmin } = usePermission();

  return (
    <DashboardLayout>
      <Helmet>
        <title>Dashboard | Elites Product Management</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the Elites Product Management System
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Dashboard cards here */}
        </div>
        
        {/* Admin-only action log section */}
        {isAdmin && (
          <div className="mt-8">
            <AdminActionLog />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
