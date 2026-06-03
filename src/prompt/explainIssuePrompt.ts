export function buildIssuePrompt(title: string,description: string) {
   return `
You are a senior software engineer mentoring a beginner.

Explain this GitHub issue in simple language.

Provide:
1. Problem summary
2. Skills required
3. Why this issue exists
4. Difficulty (Beginner/Intermediate/Advanced)

Issue Title:
${title}

Issue Description:
${description}
`;
}