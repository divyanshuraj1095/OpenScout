import api from "./api";

export interface Repository {
  id: number;
  repoName: string;
  ownerName: string;
  url: string;
  stars: number | null;
  language: string | null;
  description: string | null;
}

export interface Issue {
  id: number;
  gitHubIssueId: string;
  title: string;
  description: string | null;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | null;
  labels: string[];
  repositoryId: number;
  repository: Repository;
}

export interface IssuesResponse {
  currentPage: number;
  totalPages: number;
  totalIssues: number;
  message: string;
  data: Issue[];
}

export const issuesService = {
  async getIssues(params: {
    page?: number;
    limit?: number;
    difficulty?: string;
    label?: string;
    language?: string;
  }) {
    const response = await api.get<IssuesResponse>("/issues", { params });
    return response.data;
  },

  async getIssue(id: number) {
    const response = await api.get<{ message: string; data: Issue }>(`/issue/${id}`);
    return response.data.data;
  },

  async searchIssues(q: string) {
    const response = await api.get<{ message: string; data: Issue[] }>("/search", {
      params: { q },
    });
    return response.data.data;
  },

  async getRepos() {
    const response = await api.get<{ data: Repository[] }>("/repos");
    return response.data.data;
  },

  async addRepo(repoUrl: string) {
    const response = await api.post<{ message: string; data: number }>("/repo", { repoUrl });
    return response.data;
  },

  async refreshRepo(id: number) {
    const response = await api.get<{ message: string }>(`/repo/${id}/refresh`);
    return response.data;
  },
};
