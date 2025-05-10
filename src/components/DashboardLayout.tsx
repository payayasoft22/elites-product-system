
import React from "react";
import { Link } from "react-router-dom";
import { AlignJustify, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/contexts/SidebarContext";
import UserNav from "@/components/UserNav";
import NotificationsPopover from "@/components/NotificationsPopover";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="mr-2 px-2 md:hidden"
              onClick={toggleSidebar}
            >
              <AlignJustify className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-bold">Elites Product Management</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationsPopover />
            <UserNav />
          </div>
        </div>
      </header>
      
      <div className="container flex-1 items-start pt-6">
        <main className="flex-1 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
