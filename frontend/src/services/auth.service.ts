import api from "./api";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  gitHubURL: string | null;
  openedRepos: number;
  createdAt: string;
}

export const authService = {
  async signup(data: { name: string; email: string; password?: string; gitHubURL?: string }) {
    const response = await api.post<{ message: string }>("/signup", data);
    return response.data;
  },

  async login(data: { email: string; password?: string }) {
    const response = await api.post<{ message: string }>("/login", data);
    return response.data;
  },

  async logout() {
    const response = await api.post<string>("/logout");
    return response.data;
  },

  async getProfile() {
    const response = await api.get<{ message: string; data: UserProfile }>("/profile");
    return response.data.data;
  },
};
