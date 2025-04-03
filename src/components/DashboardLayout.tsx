
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, Package, PieChart, Settings, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, href, isActive }) => (
  <Link
    to={href}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
      isActive
        ? "bg-brand-100 text-brand-800"
        : "text-gray-600 hover:bg-gray-100"
    )}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = [
    {
      icon: <PieChart size={20} />,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      icon: <Package size={20} />,
      label: "Products",
      href: "/products",
    },
    {
      icon: <Users size={20} />,
      label: "Users",
      href: "/users",
    },
    {
      icon: <Settings size={20} />,
      label: "Settings",
      href: "/settings",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar for desktop */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 h-screen transition-all duration-300 ease-in-out fixed lg:relative z-30",
          isSidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between h-16 border-b">
            {isSidebarOpen ? (
              <h1 className="font-bold text-xl text-brand-800">Price Paladin</h1>
            ) : (
              <span className="font-bold text-xl mx-auto text-brand-800">PP</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:flex hidden"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  isActive={location.pathname === item.href}
                />
              ))}
            </nav>
          </div>
          
          <div className="p-4 border-t">
            {isSidebarOpen ? (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-gray-500">
                  <span>Logged in as</span>
                  <p className="font-medium truncate">{user?.email}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => logout()}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="mx-auto"
                onClick={() => logout()}
              >
                <LogOut size={20} />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="bg-white border-b h-16 flex items-center px-4 lg:hidden sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mr-2"
          >
            <Menu size={20} />
          </Button>
          <h1 className="font-bold text-xl text-brand-800">Price Paladin</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
