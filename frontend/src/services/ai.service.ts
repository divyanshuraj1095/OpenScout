import api from "./api";

export interface AiExplanationResponse {
  message: string;
  data: string; // Markdown text explanation
}

export const aiService = {
  async explainIssue(id: number) {
    const response = await api.get<AiExplanationResponse>(`/explain/${id}`);
    return response.data.data;
  },
};
