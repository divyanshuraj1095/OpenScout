import React, { createContext, useContext, useState, useEffect } from "react";
import { bookmarksService } from "../services/bookmarks.service";
import type { Bookmark } from "../services/bookmarks.service";
import { useAuth } from "./useAuth";

interface BookmarksContextType {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  fetchBookmarks: () => Promise<void>;
  addBookmark: (issueId: number) => Promise<void>;
  removeBookmark: (issueId: number) => Promise<void>;
  isBookmarked: (issueId: number) => boolean;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

export const BookmarksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchBookmarks = async () => {
    if (!user) {
      setBookmarks([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const list = await bookmarksService.getBookmarks();
      setBookmarks(list);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch bookmarks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [user]);

  const addBookmark = async (issueId: number) => {
    try {
      setError(null);
      await bookmarksService.addBookmark(issueId);
      await fetchBookmarks();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to add bookmark");
      throw err;
    }
  };

  const removeBookmark = async (issueId: number) => {
    try {
      setError(null);
      await bookmarksService.deleteBookmark(issueId);
      await fetchBookmarks();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to remove bookmark");
      throw err;
    }
  };

  const isBookmarked = (issueId: number) => {
    return bookmarks.some((b) => b.issueId === issueId);
  };

  return (
    <BookmarksContext.Provider
      value={{
        bookmarks,
        loading,
        error,
        fetchBookmarks,
        addBookmark,
        removeBookmark,
        isBookmarked,
      }}
    >
      {children}
    </BookmarksContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }
  return context;
};
