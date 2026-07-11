export type TargetLength = '1-page' | '2-page' | 'comprehensive';

export interface ATSAnalysis {
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  actionItems: string[];
}

export interface CVGenerationResult {
  cvMarkdown: string;
  atsScore: number;
  atsAnalysis: ATSAnalysis;
  humanFriendlyChanges: string[];
  coverLetter: string;
}
