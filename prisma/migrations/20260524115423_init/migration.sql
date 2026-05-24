-- CreateTable
CREATE TABLE "Repository" (
    "id" SERIAL NOT NULL,
    "repoName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "stars" INTEGER,
    "language" TEXT,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" SERIAL NOT NULL,
    "gitHubIssueId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" TEXT,
    "labels" TEXT[],
    "repositoryId" INTEGER NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
