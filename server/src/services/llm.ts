import type { TargetLength, ATSAnalysis, CVGenerationResult } from '../types.js';

export interface LLMCallConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  apiKey: string;
}

export async function generateCustomizedCVServer(
  config: LLMCallConfig,
  contextCVs: { name: string; text: string }[],
  jobDescription: string,
  aspirations: string,
  targetLength: TargetLength
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

=== CANDIDATE CAREER HISTORY ===
${contextCVs.map((cv, idx) => `[Profile #${idx + 1}: ${cv.name}]\n${cv.text}`).join('\n\n')}

${aspirations ? `=== USER ASPIRATIONS / CUSTOM FOCUS ===\n${aspirations}\n` : ''}

=== YOUR TASK ===
Carefully read the career history and the target Job Description. Generate a customized CV and Cover Letter that adheres to all the strict guidelines above.
Return the output as a valid JSON object matching the requested schema.`;

  return callProvider(config, systemPrompt, userPrompt);
}

export async function autoFixCVServer(
  config: LLMCallConfig,
  currentMarkdown: string,
  jobDescription: string,
  atsAnalysis: ATSAnalysis
): Promise<CVGenerationResult> {
  const systemPrompt = `You are an expert resume writer specializing in ATS optimization.
Your job is to read an existing CV, analyze the target Job Description, and review the identified ATS gaps (missing keywords, weaknesses, action items).
You must rewrite the CV to organically integrate the missing keywords and resolve the weaknesses.

Strict rules:
1. Preserve all existing formatting, structure, headers, and details.
2. Integrate the missing keywords organically into bullet points of your professional experience or technical skills. Do NOT just dump them at the bottom.
3. Keep the content sounding human-written, not robotic.
4. Ensure the output is returned strictly as the requested JSON object.`;

  const userPrompt = `
=== CURRENT CV MARKDOWN ===
${currentMarkdown}

=== TARGET JOB DESCRIPTION ===
${jobDescription}

=== IDENTIFIED ATS GAPS ===
- Missing Keywords: ${atsAnalysis.missingKeywords.join(', ')}
- Weaknesses: ${atsAnalysis.weaknesses.join('; ')}
- Action Items: ${atsAnalysis.actionItems.join('; ')}

=== YOUR TASK ===
Modify the CV to organically weave in the missing keywords, resolve the weaknesses, and address the action items.
Return the output as a valid JSON object matching the requested schema.`;

  return callProvider(config, systemPrompt, userPrompt);
}

async function callProvider(config: LLMCallConfig, systemPrompt: string, userPrompt: string): Promise<CVGenerationResult> {
  if (config.provider === 'gemini') {
    return callGemini(config, systemPrompt, userPrompt);
  } else if (config.provider === 'openai') {
    return callOpenAI(config, systemPrompt, userPrompt);
  } else if (config.provider === 'anthropic') {
    return callAnthropic(config, systemPrompt, userPrompt);
  }
  throw new Error(`Unsupported provider: ${config.provider}`);
}

async function callGemini(config: LLMCallConfig, systemPrompt: string, userPrompt: string): Promise<CVGenerationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          cvMarkdown: { type: 'STRING' },
          atsScore: { type: 'INTEGER' },
          atsAnalysis: {
            type: 'OBJECT',
            properties: {
              matchedKeywords: { type: 'ARRAY', items: { type: 'STRING' } },
              missingKeywords: { type: 'ARRAY', items: { type: 'STRING' } },
              strengths: { type: 'ARRAY', items: { type: 'STRING' } },
              weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
              actionItems: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['matchedKeywords', 'missingKeywords', 'strengths', 'weaknesses', 'actionItems']
          },
          humanFriendlyChanges: { type: 'ARRAY', items: { type: 'STRING' } },
          coverLetter: { type: 'STRING' }
        },
        required: ['cvMarkdown', 'atsScore', 'atsAnalysis', 'humanFriendlyChanges', 'coverLetter']
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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

  return JSON.parse(text) as CVGenerationResult;
}

async function callOpenAI(config: LLMCallConfig, systemPrompt: string, userPrompt: string): Promise<CVGenerationResult> {
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
    })
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

  return JSON.parse(content) as CVGenerationResult;
}

async function callAnthropic(config: LLMCallConfig, systemPrompt: string, userPrompt: string): Promise<CVGenerationResult> {
  const url = 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4000,
      system: systemPrompt,
      tools: [
        {
          name: 'submit_customized_cv',
          description: 'Submit the completed ATS-optimized CV, cover letter, and ATS keyword metrics.',
          input_schema: {
            type: 'object',
            properties: {
              cvMarkdown: {
                type: 'string',
                description: 'The complete customized CV in markdown format.'
              },
              atsScore: {
                type: 'integer',
                description: 'The calculated ATS score out of 100.'
              },
              atsAnalysis: {
                type: 'object',
                properties: {
                  matchedKeywords: { type: 'array', items: { type: 'string' } },
                  missingKeywords: { type: 'array', items: { type: 'string' } },
                  strengths: { type: 'array', items: { type: 'string' } },
                  weaknesses: { type: 'array', items: { type: 'string' } },
                  actionItems: { type: 'array', items: { type: 'string' } }
                },
                required: ['matchedKeywords', 'missingKeywords', 'strengths', 'weaknesses', 'actionItems']
              },
              humanFriendlyChanges: {
                type: 'array',
                items: { type: 'string' }
              },
              coverLetter: {
                type: 'string',
                description: 'The customized cover letter targeted to the JD.'
              }
            },
            required: ['cvMarkdown', 'atsScore', 'atsAnalysis', 'humanFriendlyChanges', 'coverLetter']
          }
        }
      ],
      tool_choice: {
        type: 'tool',
        name: 'submit_customized_cv'
      },
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API call failed with status ${response.status}`);
  }

  const data = await response.json();

  // Try extracting output from tool_use block first (guarantees valid JSON structure from Anthropic)
  const toolUseBlock = data.content?.find((block: any) => block.type === 'tool_use');
  if (toolUseBlock && toolUseBlock.input) {
    return toolUseBlock.input as CVGenerationResult;
  }

  // Fallback to text block parsing if tool_use was somehow bypassed
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  const content = textBlock?.text;
  if (!content) {
    throw new Error('Empty response from Anthropic API.');
  }

  return resilientParseJSON<CVGenerationResult>(content);
}

function resilientParseJSON<T>(text: string): T {
  let cleaned = text.trim();
  
  // Strip markdown code block wrappers if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (firstErr) {
    // Attempt parsing by isolating the outermost JSON brackets
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const rawJson = cleaned.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(rawJson) as T;
      } catch (secondErr) {
        console.error('Failed to parse extracted JSON substring. Raw response:', cleaned);
        throw new Error(`JSON parsing failed: ${(secondErr as Error).message}.`);
      }
    }
    
    throw firstErr;
  }
}
