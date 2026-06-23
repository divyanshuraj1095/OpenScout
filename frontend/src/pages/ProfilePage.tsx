import React from "react";
import { Mail, Calendar, GitBranch, Link as LinkIcon, Award } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useBookmarks } from "../hooks/useBookmarks";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { bookmarks } = useBookmarks();

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 sm:p-8 max-w-[800px] mx-auto w-full flex flex-col gap-8 text-left">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Developer Profile
        </h1>
        <p className="text-sm text-neutral-400">
          Manage your account information and view your open-source journey details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Profile Card Left */}
        <div className="md:col-span-1 flex flex-col items-center text-center p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm">
          <div className="w-20 h-20 rounded-full border-2 border-neutral-950 bg-neutral-50 flex items-center justify-center font-bold text-neutral-800 text-3xl select-none mb-4">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-lg font-bold text-neutral-900 mb-1">
            {user?.name}
          </h2>
          <p className="text-xs text-neutral-400 mb-4 truncate w-full">
            {user?.email}
          </p>

          <Badge variant="default" className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            Contributor
          </Badge>
        </div>

        {/* Detailed Info Right */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Account details card */}
          <Card>
            <CardHeader className="bg-neutral-50/50">
              <h3 className="text-sm font-semibold text-neutral-900">
                Personal Information
              </h3>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-4">
              
              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-4.5 h-4.5 text-neutral-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Email Address</span>
                  <span className="text-sm text-neutral-800 font-medium">{user?.email}</span>
                </div>
              </div>

              {/* GitHub */}
              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-neutral-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">GitHub Profile</span>
                  {user?.gitHubURL ? (
                    <a
                      href={user.gitHubURL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-neutral-900 font-medium hover:underline flex items-center gap-1"
                    >
                      {user.gitHubURL}
                      <LinkIcon className="w-3 h-3 text-neutral-400" />
                    </a>
                  ) : (
                    <span className="text-sm text-neutral-400 italic font-medium">
                      Not linked
                    </span>
                  )}
                </div>
              </div>

              {/* Date registered */}
              <div className="flex items-center gap-3">
                <Calendar className="w-4.5 h-4.5 text-neutral-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Member Since</span>
                  <span className="text-sm text-neutral-800 font-medium">
                    {formatDate(user?.createdAt)}
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Stats details card */}
          <Card>
            <CardHeader className="bg-neutral-50/50">
              <h3 className="text-sm font-semibold text-neutral-900">
                Contribution Statistics
              </h3>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/30 flex flex-col gap-1">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Saved Backlog</span>
                <span className="text-2xl font-extrabold text-neutral-900">
                  {bookmarks.length}
                </span>
                <span className="text-[10px] text-neutral-400">Total bookmarks</span>
              </div>
              <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/30 flex flex-col gap-1">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Page Views</span>
                <span className="text-2xl font-extrabold text-neutral-900">
                  {user?.openedRepos ?? 0}
                </span>
                <span className="text-[10px] text-neutral-400">Interactions logged</span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
};
export default ProfilePage;
