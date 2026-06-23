import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/Button";
import { LogOut, Menu, X } from "lucide-react";
import { useToast } from "./ui/Toast";

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast("Logged out successfully");
      navigate("/");
    } catch (err: any) {
      toast("Logout failed", "error");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Mobile Toggle */}
        <div className="flex items-center gap-4">
          {user && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-neutral-500 hover:text-neutral-900 rounded-md focus:outline-none"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm tracking-wider">
              OS
            </div>
            <span className="font-semibold text-neutral-900 text-lg tracking-tight">
              OpenScout
            </span>
          </Link>
        </div>

        {/* Action Button Area */}
        <nav className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-sm text-neutral-500 font-medium">
                {user.name}
              </span>
              <div className="w-8 h-8 rounded-full border border-neutral-200 bg-neutral-50 flex items-center justify-center font-bold text-neutral-700 text-sm select-none">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
export default Navbar;
