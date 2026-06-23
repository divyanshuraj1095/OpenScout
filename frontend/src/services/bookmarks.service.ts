import api from "./api";
import type { Issue } from "./issues.service";

export interface Bookmark {
  id: number;
  userId: number;
  issueId: number;
  issue: Issue;
}

export const bookmarksService = {
  async getBookmarks() {
    const response = await api.get<{ message: string; data: Bookmark[] }>("/bookmarks");
    return response.data.data;
  },

  async addBookmark(issueId: number) {
    const response = await api.post<{ message: string }>(`/bookmarks/add/${issueId}`);
    return response.data;
  },

  async deleteBookmark(issueId: number) {
    const response = await api.delete<{ message: string }>(`/bookmarks/${issueId}`);
    return response.data;
  },
};
