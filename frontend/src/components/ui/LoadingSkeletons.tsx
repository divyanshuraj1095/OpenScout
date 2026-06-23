import React from "react";
import { Skeleton } from "./Skeleton";
import { Card, CardContent } from "./Card";

export const IssueListSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="w-full">
          <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex-1 w-full flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-32" />
                <div className="h-3 w-1.5 bg-neutral-200 rounded-full" />
                <Skeleton className="h-3 w-12" />
                <div className="h-3 w-1.5 bg-neutral-200 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-3/4 sm:w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2 self-stretch md:self-auto justify-end w-full md:w-auto mt-2 md:mt-0">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const IssueDetailsSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-[900px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-8 w-4/5" />
        <div className="flex gap-2 mt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <Card>
        <CardContent className="p-6 flex flex-col gap-4">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-col gap-2.5 mt-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Skeleton className="h-5 w-48" />
          <IssueListSkeleton />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
};
