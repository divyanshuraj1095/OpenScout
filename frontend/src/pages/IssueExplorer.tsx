import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, AlertCircle, Inbox } from "lucide-react";
import { useIssues } from "../hooks/useIssues";
import { IssueCard } from "../components/IssueCard";
import { FilterPanel } from "../components/FilterPanel";
import { Pagination } from "../components/Pagination";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { IssueListSkeleton } from "../components/ui/LoadingSkeletons";

export const IssueExplorer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract initial parameters from URL query parameters if present
  const urlDifficulty = searchParams.get("difficulty") || "";
  const urlLanguage = searchParams.get("language") || "";
  const urlLabel = searchParams.get("label") || "";

  const {
    issues,
    loading,
    error,
    page,
    setPage,
    totalPages,
    difficulty,
    setDifficulty,
    label,
    setLabel,
    language,
    setLanguage,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useIssues({
    difficulty: urlDifficulty,
    language: urlLanguage,
    label: urlLabel,
    page: 1,
    limit: 10,
  });

  // Sync URL search params with state changes
  useEffect(() => {
    const params: Record<string, string> = {};
    if (difficulty) params.difficulty = difficulty;
    if (language) params.language = language;
    if (label) params.label = label;
    setSearchParams(params);
  }, [difficulty, language, label, setSearchParams]);

  const handleClearFilters = () => {
    setDifficulty("");
    setLanguage("");
    setLabel("");
    setSearchQuery("");
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refresh();
  };

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 text-left">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Explorer Workspace
        </h1>
        <p className="text-sm text-neutral-400">
          Discover beginner-friendly GitHub issues classified by AI mentors.
        </p>
      </div>

      {/* Grid containing Filters (Left) and Issue List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Side: Filter Panel */}
        <div className="lg:col-span-1">
          <FilterPanel
            selectedDifficulty={difficulty}
            onChangeDifficulty={(val) => {
              setDifficulty(val);
              setPage(1);
            }}
            selectedLanguage={language}
            onChangeLanguage={(val) => {
              setLanguage(val);
              setPage(1);
            }}
            selectedLabel={label}
            onChangeLabel={(val) => {
              setLabel(val);
              setPage(1);
            }}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Right Side: Search and Issue List */}
        <div className="lg:col-span-3 flex flex-col gap-6 w-full">
          
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search issues across title and description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg shadow-sm focus:outline-none focus:border-black focus:ring-4 focus:ring-neutral-100 transition-all text-sm placeholder:text-neutral-400 text-neutral-900"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          {/* Error notifications */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-grow">
                <p className="font-semibold">Failed to fetch issues</p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={refresh} className="border-red-200 hover:bg-red-100/50">
                Retry
              </Button>
            </div>
          )}

          {/* Skeletons while Loading */}
          {loading && <IssueListSkeleton />}

          {/* Empty states */}
          {!loading && !error && issues.length === 0 && (
            <Card className="border-dashed py-16 text-center">
              <CardContent className="flex flex-col items-center gap-3">
                <Inbox className="w-12 h-12 text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-900">No issues found</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  We couldn't find any issues matching your search terms or filters. Try adjusting them or clear all filters.
                </p>
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Issue Feed cards */}
          {!loading && !error && issues.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1">
                Showing {issues.length} {issues.length === 1 ? "issue" : "issues"}
              </div>
              
              <div className="flex flex-col gap-4">
                {issues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>

              {/* Pagination controls */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
export default IssueExplorer;
