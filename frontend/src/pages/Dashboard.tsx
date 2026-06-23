import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Database, Star, Code, Bookmark, RefreshCw, LayoutDashboard, ExternalLink } from "lucide-react";
import { issuesService } from "../services/issues.service";
import type { Repository } from "../services/issues.service";
import { useBookmarks } from "../hooks/useBookmarks";
import { useAuth } from "../hooks/useAuth";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";
import { DashboardSkeleton } from "../components/ui/LoadingSkeletons";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { bookmarks } = useBookmarks();
  const { toast } = useToast();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const data = await issuesService.getRepos();
      setRepos(data);
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to fetch repositories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleIndexRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) return;

    try {
      setIndexing(true);
      const response = await issuesService.addRepo(repoUrlInput.trim());
      toast(response.message || "Repository indexed successfully!");
      setRepoUrlInput("");
      await fetchRepos();
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Failed to index repository", "error");
    } finally {
      setIndexing(false);
    }
  };

  const handleRefreshRepo = async (id: number) => {
    try {
      setRefreshingId(id);
      await issuesService.refreshRepo(id);
      toast("Repository issues sync complete!");
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Sync failed", "error");
    } finally {
      setRefreshingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 max-w-[1400px] mx-auto w-full">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 text-left">
      
      {/* Welcome header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Welcome back, {user?.name}
        </h1>
        <p className="text-sm text-neutral-400">
          Monitor your study logs, add new codebases, and check AI mentors.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Bookmarked Count Card */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Total Bookmarks
              </span>
              <span className="text-3xl font-extrabold text-neutral-900 mt-1">
                {bookmarks.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800">
              <Bookmark className="w-6 h-6 fill-current text-black" />
            </div>
          </CardContent>
        </Card>

        {/* Indexed Repos Card */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Indexed Repositories
              </span>
              <span className="text-3xl font-extrabold text-neutral-900 mt-1">
                {repos.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800">
              <Database className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Opened Repos Card */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Profile Clicks
              </span>
              <span className="text-3xl font-extrabold text-neutral-900 mt-1">
                {user?.openedRepos ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800">
              <LayoutDashboard className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Main Grid: Indexer + Repository List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Repos List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-neutral-900">
            Indexed Codebases
          </h2>

          {repos.length === 0 ? (
            <Card className="border-dashed py-12 text-center">
              <CardContent className="flex flex-col items-center gap-3">
                <Database className="w-10 h-10 text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-900">No repositories indexed yet</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Index a Github codebase on the right panel to extract open issues and run classification analysis.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {repos.map((repo) => (
                <Card key={repo.id}>
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-neutral-900 truncate">
                          {repo.ownerName}/{repo.repoName}
                        </h3>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-400 hover:text-neutral-900"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      
                      <p className="text-xs text-neutral-400 line-clamp-1 mb-3">
                        {repo.description || "No description provided."}
                      </p>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-0.5 text-xs text-neutral-500 font-medium">
                          <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                          {repo.stars ?? 0}
                        </span>
                        {repo.language && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Code className="w-3 h-3" />
                            {repo.language}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={refreshingId === repo.id}
                        onClick={() => handleRefreshRepo(repo.id)}
                        className="flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === repo.id ? "animate-spin" : ""}`} />
                        Sync
                      </Button>
                      <Link to={`/explore?language=${repo.language || ""}`}>
                        <Button size="sm">Explore</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Index Form Card */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-neutral-900">
            Add Repository
          </h2>

          <Card className="sticky top-20 border-neutral-200 shadow-sm">
            <CardHeader className="bg-neutral-50/50">
              <h3 className="text-sm font-semibold text-neutral-900">
                Index GitHub Repository
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Enter the Github repository URL to seed all open issues.
              </p>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleIndexRepo} className="flex flex-col gap-4">
                <Input
                  label="Repository URL"
                  type="url"
                  placeholder="https://github.com/facebook/react"
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  disabled={indexing}
                  required
                />
                
                <Button type="submit" loading={indexing} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Index Repository
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
