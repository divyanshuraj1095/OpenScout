import React, { useState } from "react";
import { Bookmark } from "lucide-react";
import { useBookmarks } from "../hooks/useBookmarks";
import { useToast } from "./ui/Toast";

interface BookmarkButtonProps {
  issueId: number;
  size?: "sm" | "md";
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({ issueId, size = "md" }) => {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const bookmarked = isBookmarked(issueId);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setLoading(true);
      if (bookmarked) {
        await removeBookmark(issueId);
        toast("Removed bookmark");
      } else {
        await addBookmark(issueId);
        toast("Bookmarked issue!");
      }
    } catch (err: any) {
      toast(err.message || "Failed to update bookmark", "error");
    } finally {
      setLoading(false);
    }
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-lg border transition-all duration-200 focus:outline-none ${
        bookmarked
          ? "bg-neutral-900 border-neutral-900 text-white hover:bg-neutral-800"
          : "bg-white border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300"
      } ${loading ? "opacity-50 pointer-events-none" : "active:scale-[0.93]"}`}
      title={bookmarked ? "Remove Bookmark" : "Bookmark Issue"}
    >
      <Bookmark
        className={`${iconSizes[size]} ${bookmarked ? "fill-current" : ""}`}
      />
    </button>
  );
};
export default BookmarkButton;
