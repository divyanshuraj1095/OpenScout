import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Compass, Inbox, Search } from "lucide-react";
import { useBookmarks } from "../hooks/useBookmarks";
import { IssueCard } from "../components/IssueCard";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { IssueListSkeleton } from "../components/ui/LoadingSkeletons";

export const BookmarksPage: React.FC = () => {
  const { bookmarks, loading } = useBookmarks();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedLanguage("");
    setSelectedDifficulty("");
  };

  // Get unique languages and difficulties from current bookmarks for simple sub-filters
  const languages = Array.from(
    new Set(bookmarks.map((b) => b.issue.repository.language).filter(Boolean))
  ) as string[];

  // Client-side search and filtering for bookmarks (since they are already in memory)
  const filteredBookmarks = bookmarks.filter((b) => {
    const issue = b.issue;
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.description && issue.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLanguage =
      !selectedLanguage || issue.repository.language === selectedLanguage;

    const matchesDifficulty =
      !selectedDifficulty || issue.difficulty === selectedDifficulty;

    return matchesSearch && matchesLanguage && matchesDifficulty;
  });

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 text-left">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Bookmarks Backlog
        </h1>
        <p className="text-sm text-neutral-400">
          Review, organize, and tackle your saved open-source contributions.
        </p>
      </div>

      {/* Main Area */}
      {loading ? (
        <IssueListSkeleton />
      ) : bookmarks.length === 0 ? (
        // Empty State: No bookmarks saved
        <Card className="border-dashed py-16 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <Bookmark className="w-12 h-12 text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-900">Your backlog is empty</p>
            <p className="text-xs text-neutral-400 max-w-sm">
              Bookmark issues in the explorer page to save them to your developer roadmap.
            </p>
            <Link to="/explore" className="mt-2">
              <Button className="flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Find Issues
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Local Search and Filter Row */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-neutral-50/50 p-4 border border-neutral-200 rounded-xl">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg shadow-sm focus:outline-none focus:border-black focus:ring-4 focus:ring-neutral-100 transition-all text-sm placeholder:text-neutral-400 text-neutral-900"
              />
            </div>

            {/* Language filter select */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-black"
              >
                <option value="">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>

              {/* Difficulty filter select */}
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-black"
              >
                <option value="">All Difficulties</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              {(searchQuery || selectedLanguage || selectedDifficulty) && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Reset
                </Button>
              )}
            </div>

          </div>

          {/* Bookmarks List */}
          {filteredBookmarks.length === 0 ? (
            <Card className="border-dashed py-12 text-center">
              <CardContent className="flex flex-col items-center gap-2">
                <Inbox className="w-10 h-10 text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-900">No matching bookmarks</p>
                <p className="text-xs text-neutral-400">
                  Try adjusting your search terms or filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                Saved Bookmarks ({filteredBookmarks.length})
              </div>
              <div className="flex flex-col gap-4">
                {filteredBookmarks.map((bookmark) => (
                  <IssueCard key={bookmark.id} issue={bookmark.issue} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
export default BookmarksPage;
