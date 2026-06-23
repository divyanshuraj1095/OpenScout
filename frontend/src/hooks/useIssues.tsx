import { useState, useEffect, useCallback } from "react";
import { issuesService } from "../services/issues.service";
import type { Issue } from "../services/issues.service";

export const useIssues = (initialParams?: {
  difficulty?: string;
  label?: string;
  language?: string;
  page?: number;
  limit?: number;
}) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialParams?.page || 1);
  const [limit] = useState<number>(initialParams?.limit || 10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalIssues, setTotalIssues] = useState<number>(0);

  const [difficulty, setDifficulty] = useState<string>(initialParams?.difficulty || "");
  const [label, setLabel] = useState<string>(initialParams?.label || "");
  const [language, setLanguage] = useState<string>(initialParams?.language || "");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (searchQuery.trim() !== "") {
        // Use search endpoint
        const data = await issuesService.searchIssues(searchQuery);
        setIssues(data);
        setTotalPages(1);
        setTotalIssues(data.length);
        setPage(1);
      } else {
        // Use issues listing endpoint with filters
        const response = await issuesService.getIssues({
          page,
          limit,
          difficulty: difficulty || undefined,
          label: label || undefined,
          language: language || undefined,
        });
        setIssues(response.data);
        setTotalPages(response.totalPages);
        setTotalIssues(response.totalIssues);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  }, [page, limit, difficulty, label, language, searchQuery]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return {
    issues,
    loading,
    error,
    page,
    setPage,
    totalPages,
    totalIssues,
    difficulty,
    setDifficulty,
    label,
    setLabel,
    language,
    setLanguage,
    searchQuery,
    setSearchQuery,
    refresh: fetchIssues,
  };
};
