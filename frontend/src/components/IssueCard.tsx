import React from "react";
import { Link } from "react-router-dom";
import { Star, Code, ArrowRight } from "lucide-react";
import type { Issue } from "../services/issues.service";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { BookmarkButton } from "./BookmarkButton";

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
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

  return (
    <Card hoverEffect className="w-full text-left">
      <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start justify-between">
        
        {/* Issue Details Left */}
        <div className="flex-1 min-w-0">
          
          {/* Repo Info Header */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mb-2">
            <span className="font-semibold text-neutral-800 hover:underline">
              <a
                href={issue.repository.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
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

          {/* Issue Title */}
          <Link to={`/issue/${issue.id}`} className="group block mb-3">
            <h3 className="text-base font-semibold text-neutral-900 group-hover:text-neutral-600 transition-colors line-clamp-1 flex items-center gap-1">
              {issue.title}
            </h3>
          </Link>

          {/* Issue Labels / Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {getDifficultyBadge(issue.difficulty)}
            {issue.labels.slice(0, 3).map((lbl, idx) => (
              <Badge key={idx} variant="outline" className="text-neutral-500 max-w-[120px] truncate">
                {lbl}
              </Badge>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-xs text-neutral-400">+{issue.labels.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Action buttons Right */}
        <div className="flex items-center gap-2 self-stretch md:self-center justify-end shrink-0">
          <BookmarkButton issueId={issue.id} size="sm" />
          <Link to={`/issue/${issue.id}`}>
            <button className="flex items-center gap-1 text-xs font-semibold px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 rounded-lg transition-colors">
              Explore
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

      </CardContent>
    </Card>
  );
};
export default IssueCard;
