// Utility for LLM API calls (Gemini, OpenAI, Anthropic)

export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
}

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
  coverLetter: string; // Added for Iteration 2
}

export type TargetLength = '1-page' | '2-page' | 'comprehensive';

export async function generateCustomizedCV(
  config: LLMConfig,
  contextCVs: { name: string; text: string }[],
  jobDescription: string,
  aspirations: string,
  targetLength: TargetLength,
  signal?: AbortSignal
): Promise<CVGenerationResult> {
  let lengthConstraint = "";
  if (targetLength === '1-page') {
    lengthConstraint = "3. **Strict 1-Page Resume Constraint**: Ensure the resume is ruthlessly optimized, concise, and fits strictly within a 1-page ceiling (approx 350-450 words). Limit roles to the most recent 10 years, heavily truncate older roles to 1-liners, and allow a maximum of 3 highly impactful bullet points per role.";
  } else if (targetLength === '2-page') {
    lengthConstraint = "3. **Strict 2-Page Constraint**: Ensure the resume is highly optimized, concise, and fits strictly within a 2-page ceiling (approximately 500-750 words). Filter out minor or redundant details, and focus on high-impact accomplishments.";
  } else {
    lengthConstraint = "3. **Comprehensive CV Format**: Provide a detailed, multi-page Curriculum Vitae. Include all relevant past roles, comprehensive bullet points for each, and maintain an exhaustive list of achievements and responsibilities that match the JD keywords. Do not overly truncate the history.";
  }

  const systemPrompt = `You are an expert resume writer and recruiter specializing in ATS (Applicant Tracking System) optimization and human-friendly storytelling.
Your job is to rewrite a candidate's resume/career history to perfectly align with a target Job Description (JD) and also write a customized cover letter.

Here are the strict guidelines:
1. **Truthfulness**: Rely ONLY on facts, roles, and achievements present in the provided career history (uploaded CVs). Do NOT invent jobs, companies, credentials, or achievements.
2. **ATS Optimization**: Identify critical keywords, technical skills, and phrases in the Job Description, and naturally integrate them into the candidate's experience where applicable. **CRITICAL: You MUST aim for a >95% ATS keyword match score. Ruthlessly find organic ways to include as many target keywords as mathematically possible without lying.**
${lengthConstraint}
4. **Professional Formatting**: Format headings to match the user's specific CV format:
   - The very top of the resume MUST start with the candidate's Name as an H1, immediately followed by the exact Target Job Title (from the JD) as an italicized subtitle on the next line. Like this:
     # [Candidate Name]
     *[Target Job Title]*
     email | phone | location | linkedin
   - Job Experience headers MUST be written as:
     ### Job Title | Dates
     *Company Name | Location*
   - Education headers MUST be written as:
     ### Degree Name | Dates
     *School Name | Location*
   - Standard sections headings MUST be formatted as H2 headings exactly like this: 
     ## EXECUTIVE PROFILE
     ## PROFESSIONAL EXPERIENCE
     ## TECHNICAL SKILLS & COMPETENCIES
     ## CORE IMPACT & CAREER HIGHLIGHTS
     ## EDUCATION
   - For TECHNICAL SKILLS & COMPETENCIES, write the skills as a bulleted list where each bullet starts with the bold category and a colon, e.g.:
     * **Mobile Architecture**: Modular Architecture, MVVM, Swift, ...
   - Use bolding (**text**) judiciously throughout the CV to highlight key technical skills, impactful metrics, and critical qualifications to draw the recruiter's eye.
5. **Human Readability**: Ensure the content sounds like it is written by a normal human professional, not copy-pasted from an AI tool. Avoid robotic transitions, cliché AI buzzwords, or overly complex vocabulary. Build credibility and trust through clear, authentic, and factual storytelling.
6. **Custom Cover Letter**: Write a short, punchy, and summarized Cover Letter (under 250 words) targeted to the recruiting team of the organization in the JD. It should highlight the applicant's top matches, explain their interest, and make it extremely easy for a recruiter to shortlist the candidate.`;

  const userPrompt = `
=== TARGET JOB DESCRIPTION ===
${jobDescription}

=== CANDIDATE CAREER HISTORY (UPLOADED CVS) ===
${contextCVs.map((cv, idx) => `[CV ${idx + 1}: ${cv.name}]\n${cv.text}`).join('\n\n')}

=== FUTURE ASPIRATIONS / FOCUS ===
${aspirations || "None specified. Focus on general alignment with the target JD."}

=== TASK ===
1. Analyze the Job Description for key requirements, skills, and credentials.
2. Review the candidate's career history and extract all relevant achievements, roles, and skills.
3. Construct a single, highly tailored CV in Markdown format that showcases the candidate's fit for this specific job, incorporating relevant keywords naturally. Keep the text concise to fit strictly within 2 pages when rendered.
4. Format job/education headings using the 'Title | Dates' and 'Subtitle | Location' syntax described in guidelines.
5. Estimate the ATS score (0 to 100) based on keyword matching. Aim for >95% by including almost all relevant keywords natively in the text.
6. List matched keywords, missing keywords, strengths, weaknesses, and actionable items.
7. Write a custom, concise, and high-impact Cover Letter (under 250 words) targeting this job.
8. List the key human-friendly changes you made (e.g., rewording, focusing on impact).
`;

  if (config.provider === 'gemini') {
    return callGemini(config, systemPrompt, userPrompt, signal);
  } else if (config.provider === 'openai') {
    return callOpenAI(config, systemPrompt, userPrompt, signal);
  } else if (config.provider === 'anthropic') {
    return callAnthropic(config, systemPrompt, userPrompt, signal);
  } else {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

export async function autoFixCV(
  config: LLMConfig,
  currentMarkdown: string,
  jobDescription: string,
  atsAnalysis: ATSAnalysis,
  signal?: AbortSignal
): Promise<CVGenerationResult> {
  const systemPrompt = `You are an expert resume writer and recruiter specializing in ATS (Applicant Tracking System) optimization and human-friendly storytelling.
Your job is to REVISE and IMPROVE an existing candidate's resume to incorporate specific missing keywords and fix weaknesses identified in an ATS scan.

Here are the strict guidelines:
1. **Truthfulness**: ONLY incorporate new keywords if they logically fit into the existing roles and achievements. Do not invent entirely new jobs.
2. **ATS Optimization**: Weave the provided Missing Keywords into the bullet points organically. **CRITICAL: You MUST aggressively incorporate these missing keywords to push the ATS match score above 95%.** Address the identified Weaknesses by expanding or rephrasing existing bullet points.
3. **Format Preservation**: You MUST output the ENTIRE updated CV in Markdown. You MUST preserve the exact layout and structure of the original Markdown provided to you.
4. **Human Readability**: Ensure the new additions sound natural, professional, and truthful, rather than artificially stuffed.
5. **Custom Cover Letter**: Also provide a revised Cover Letter that reflects the stronger alignment with the Job Description.`;

  const userPrompt = `
=== TARGET JOB DESCRIPTION ===
${jobDescription}

=== IDENTIFIED ATS GAPS ===
Missing Keywords: ${atsAnalysis.missingKeywords.join(', ') || 'None'}
Weaknesses: ${atsAnalysis.weaknesses.join('; ') || 'None'}
Action Items: ${atsAnalysis.actionItems.join('; ') || 'None'}

=== CURRENT CV MARKDOWN ===
${currentMarkdown}

=== TASK ===
1. Rewrite the CURRENT CV MARKDOWN to organically include the Missing Keywords and address the Weaknesses.
2. Return the ENTIRE updated Markdown CV.
3. Recalculate the ATS score and analysis (the score should improve since you fixed the gaps).
4. Provide a revised Cover Letter.
5. Detail the specific human-friendly changes you made to incorporate the keywords naturally.
`;

  if (config.provider === 'gemini') {
    return callGemini(config, systemPrompt, userPrompt, signal);
  } else if (config.provider === 'openai') {
    return callOpenAI(config, systemPrompt, userPrompt, signal);
  } else if (config.provider === 'anthropic') {
    return callAnthropic(config, systemPrompt, userPrompt, signal);
  } else {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

async function callGemini(config: LLMConfig, systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<CVGenerationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          cvMarkdown: { type: 'STRING', description: 'The generated customized CV in clean Markdown format matching the exact guidelines.' },
          atsScore: { type: 'INTEGER', description: 'An estimated ATS match score between 0 and 100.' },
          atsAnalysis: {
            type: 'OBJECT',
            properties: {
              matchedKeywords: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Keywords from the JD successfully integrated into the CV.' },
              missingKeywords: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Keywords/requirements from the JD that the candidate lacks.' },
              strengths: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Specific areas where the CV strongly matches the JD.' },
              weaknesses: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Specific gaps between CV and JD requirements.' },
              actionItems: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Concrete recommendations for the candidate to improve their fit.' }
            },
            required: ['matchedKeywords', 'missingKeywords', 'strengths', 'weaknesses', 'actionItems']
          },
          humanFriendlyChanges: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Summary of changes made to improve readability and story.' },
          coverLetter: { type: 'STRING', description: 'A short, punchy cover letter (under 250 words) targeted to the recruiting team of the organization in the JD.' }
        },
        required: ['cvMarkdown', 'atsScore', 'atsAnalysis', 'humanFriendlyChanges', 'coverLetter']
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API call failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini API.');
  }

  try {
    return JSON.parse(text) as CVGenerationResult;
  } catch (err) {
    console.error('Error parsing JSON from Gemini:', text, err);
    throw new Error('Failed to parse structured JSON response from Gemini.');
  }
}

async function callOpenAI(config: LLMConfig, systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<CVGenerationResult> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt + '\nIMPORTANT: You must return the output as a valid JSON object matching this TypeScript structure: { cvMarkdown: string, atsScore: number, atsAnalysis: { matchedKeywords: string[], missingKeywords: string[], strengths: string[], weaknesses: string[], actionItems: string[] }, humanFriendlyChanges: string[], coverLetter: string }' }
      ]
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API call failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI API.');
  }

  try {
    return JSON.parse(content) as CVGenerationResult;
  } catch (err) {
    throw new Error('Failed to parse JSON response from OpenAI.');
  }
}

async function callAnthropic(config: LLMConfig, systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<CVGenerationResult> {
  const url = 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt + '\nIMPORTANT: You must output ONLY a valid JSON object, with no conversational preamble or postamble. The JSON must match this structure: { "cvMarkdown": "...", "atsScore": 85, "atsAnalysis": { "matchedKeywords": [], "missingKeywords": [], "strengths": [], "weaknesses": [], "actionItems": [] }, "humanFriendlyChanges": [], "coverLetter": "..." }' }
      ]
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API call failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error('Empty response from Anthropic API.');
  }

  try {
    return JSON.parse(content) as CVGenerationResult;
  } catch (err) {
    throw new Error('Failed to parse JSON response from Anthropic.');
  }
}
