import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Star, Code, AlertCircle, BookOpen } from "lucide-react";
import { issuesService } from "../services/issues.service";
import type { Issue } from "../services/issues.service";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { BookmarkButton } from "../components/BookmarkButton";
import { AiExplanationCard } from "../components/AiExplanationCard";
import { Button } from "../components/ui/Button";
import { IssueDetailsSkeleton } from "../components/ui/LoadingSkeletons";

export const IssueDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssueDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await issuesService.getIssue(Number(id));
      setIssue(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load issue details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetails();
  }, [id]);

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return <Badge variant="success">Beginner</Badge>;
      case "intermediate":
        return <Badge variant="warning">Intermediate</Badge>;
      case "advanced":
        return <Badge variant="danger">Advanced</Badge>;
      default:
        return <Badge variant="secondary">Unclassified</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 max-w-[900px] mx-auto w-full">
        <IssueDetailsSkeleton />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-6 sm:p-8 max-w-[600px] mx-auto w-full text-center py-20 flex flex-col items-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-bold text-neutral-900">Failed to load issue details</h2>
        <p className="text-sm text-neutral-400 max-w-sm">
          {error || "We couldn't retrieve details for this issue ID. Make sure the database exists."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button onClick={fetchIssueDetails}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Create GitHub URL for this specific issue
  const githubIssueUrl = `${issue.repository.url}/issues`; // approximate, or link to issues page

  return (
    <div className="p-6 sm:p-8 max-w-[1000px] mx-auto w-full flex flex-col gap-6 text-left">
      
      {/* Back button link */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-neutral-950 uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explorer
        </button>
      </div>

      {/* Header Container */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="flex-1 min-w-0">
          
          {/* Repo Info */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold mb-2 uppercase tracking-wide">
            <span className="text-neutral-800 hover:underline">
              <a href={issue.repository.url} target="_blank" rel="noreferrer">
                {issue.repository.ownerName}/{issue.repository.repoName}
              </a>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
              {issue.repository.stars ?? 0}
            </span>
            {issue.repository.language && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-1 font-medium">
                  <Code className="w-3.5 h-3.5" />
                  {issue.repository.language}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug mb-3">
            {issue.title}
          </h1>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {getDifficultyBadge(issue.difficulty)}
            {issue.labels.map((lbl, idx) => (
              <Badge key={idx} variant="outline" className="text-neutral-500">
                {lbl}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Toggle buttons */}
        <div className="shrink-0 flex items-center gap-2 self-stretch md:self-auto justify-end">
          <BookmarkButton issueId={issue.id} size="md" />
          <a href={githubIssueUrl} target="_blank" rel="noreferrer">
            <Button className="flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </Button>
          </a>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Issue Description Card */}
        <Card>
          <CardHeader className="bg-neutral-50/50 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-neutral-800" />
            <h2 className="text-sm font-semibold text-neutral-900">
              Issue Description
            </h2>
          </CardHeader>
          <CardContent className="p-6">
            {issue.description ? (
              <div className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap font-sans overflow-x-auto max-h-[400px] overflow-y-auto pr-2">
                {issue.description}
              </div>
            ) : (
              <div className="text-sm text-neutral-400 italic">
                No description provided for this GitHub issue.
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Mentor Guide Explanation Section */}
        <div className="mt-2">
          <AiExplanationCard issueId={issue.id} />
        </div>

      </div>
    </div>
  );
};
export default IssueDetailsPage;
