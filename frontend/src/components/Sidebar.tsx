import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Compass, Bookmark, User, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useBookmarks } from "../hooks/useBookmarks";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const { bookmarks } = useBookmarks();

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/explore", label: "Issue Explorer", icon: Compass },
    {
      to: "/bookmarks",
      label: "Bookmarks",
      icon: Bookmark,
      badge: bookmarks.length > 0 ? bookmarks.length : undefined,
    },
    { to: "/profile", label: "Profile", icon: User },
  ];

  const activeStyle = "flex items-center gap-3 px-3 py-2 text-sm font-medium text-black bg-neutral-100 rounded-lg";
  const inactiveStyle = "flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors";

  const handleLogoutClick = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/25 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 border-r border-neutral-100 bg-white transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full justify-between p-4">
          <nav className="flex flex-col gap-1.5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
              >
                <link.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{link.label}</span>
                {link.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-xs font-semibold bg-neutral-900 text-white rounded-full">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Section at the bottom */}
          {user && (
            <div className="border-t border-neutral-100 pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full border border-neutral-200 bg-neutral-50 flex items-center justify-center font-bold text-neutral-700 text-sm select-none">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-neutral-900 truncate">
                    {user.name}
                  </span>
                  <span className="text-xs text-neutral-400 truncate">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
