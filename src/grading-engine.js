// AI-powered Grading Engine with Gemini and Phi-2
export class GradingEngine {
    constructor() {
        this.settings = this.loadSettings();
        this.geminiApiKey = null; // Will be set by user
        this.cloudflareWorkerUrl = this.settings.cloudflareWorkerUrl || '';
    }

    loadSettings() {
        return JSON.parse(localStorage.getItem('autoGraderSettings') || '{}');
    }

    getGeminiApiKey() {
        // Try from instance variable first
        if (this.geminiApiKey) return this.geminiApiKey;
        
        // Try from localStorage
        const stored = localStorage.getItem('geminiApiKey');
        if (stored) {
            this.geminiApiKey = stored;
            return stored;
        }
        
        return null;
    }

    // Grade a submission using AI
    async gradeSubmission(options) {
        const { submission, assignment, rubrics, useGemini, usePhi2, constructiveFeedback, course } = options;

        // Extract submission content
        const submissionText = await this.extractSubmissionText(submission);
        
        if (!submissionText) {
            throw new Error('Unable to extract submission content');
        }

        let result = {
            grade: null,
            feedback: '',
            rubricScores: []
        };

        // Use Gemini if selected and available
        if (useGemini) {
            try {
                result = await this.gradeWithGemini(submissionText, assignment, rubrics, constructiveFeedback, course);
            } catch (error) {
                console.error('Gemini grading failed:', error);
                if (!usePhi2) throw error;
            }
        }

        // Fallback to or use Phi-2
        if (usePhi2 && (!result.grade || useGemini)) {
            try {
                const phi2Result = await this.gradeWithPhi2(submissionText, assignment, rubrics, constructiveFeedback, course);
                // Merge results or use Phi-2 result
                if (!result.grade) {
                    result = phi2Result;
                }
            } catch (error) {
                console.error('Phi-2 grading failed:', error);
                if (!useGemini) throw error;
            }
        }

        return result;
    }

    async extractSubmissionText(submission) {
        // Extract text from various submission types
        let text = '';

        // Text submission
        if (submission.assignmentSubmission?.attachments) {
            for (const attachment of submission.assignmentSubmission.attachments) {
                if (attachment.driveFile) {
                    // Would need to fetch Drive file content
                    text += `[Attachment: ${attachment.driveFile.title}]\n`;
                } else if (attachment.link) {
                    text += `[Link: ${attachment.link.url}]\n`;
                } else if (attachment.youtubeVideo) {
                    text += `[Video: ${attachment.youtubeVideo.title}]\n`;
                }
            }
        }

        // Short answer submission
        if (submission.shortAnswerSubmission) {
            text += submission.shortAnswerSubmission.answer || '';
        }

        return text.trim();
    }

    async gradeWithGemini(submissionText, assignment, rubrics, constructiveFeedback, course) {
        const prompt = this.buildGradingPrompt(submissionText, assignment, rubrics, constructiveFeedback, course);

        const apiKey = this.getGeminiApiKey();
        if (!apiKey) {
            throw new Error('Gemini API Key not configured. Please add it in Settings.');
        }

        // Call Gemini API
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0]?.content?.parts[0]?.text || '';

        return this.parseGradingResponse(generatedText, assignment.maxPoints);
    }

    async gradeWithPhi2(submissionText, assignment, rubrics, constructiveFeedback, course) {
        if (!this.cloudflareWorkerUrl) {
            throw new Error('Cloudflare Worker URL not configured');
        }

        const prompt = this.buildGradingPrompt(submissionText, assignment, rubrics, constructiveFeedback, course);

        const response = await fetch(`${this.cloudflareWorkerUrl}/grade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                model: '@cf/microsoft/phi-2'
            })
        });

        if (!response.ok) {
            throw new Error(`Cloudflare Worker error: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedText = data.response || '';

        return this.parseGradingResponse(generatedText, assignment.maxPoints);
    }

    buildGradingPrompt(submissionText, assignment, rubrics, constructiveFeedback, course) {
        let prompt = `You are an experienced educator grading a student assignment. Please provide a fair and accurate assessment.\n\n`;
        
        // Extract grade level from course information
        const gradeLevel = this.extractGradeLevel(course);
        if (gradeLevel) {
            prompt += `Grade Level: ${gradeLevel}\n`;
        }
        
        prompt += `Course: ${course?.name || 'Unknown Course'}\n`;
        if (course?.section) {
            prompt += `Section: ${course.section}\n`;
        }
        
        prompt += `Assignment Title: ${assignment.title}\n`;
        prompt += `Assignment Description: ${assignment.description || 'No description provided'}\n`;
        prompt += `Maximum Points: ${assignment.maxPoints || 100}\n\n`;

        if (rubrics && rubrics.length > 0) {
            prompt += `Grading Rubric:\n`;
            rubrics.forEach((rubric, idx) => {
                prompt += `\nCriteria ${idx + 1}: ${rubric.criteria?.title || 'Unnamed'}\n`;
                if (rubric.criteria?.levels) {
                    rubric.criteria.levels.forEach(level => {
                        prompt += `  - ${level.title}: ${level.points} points - ${level.description}\n`;
                    });
                }
            });
            prompt += `\n`;
        }

        prompt += `Student Submission:\n${submissionText}\n\n`;

        if (constructiveFeedback) {
            prompt += `Please provide:\n`;
            prompt += `1. A numerical grade (0-${assignment.maxPoints || 100})\n`;
            prompt += `2. Constructive feedback that is:\n`;
            if (gradeLevel) {
                prompt += `   - Appropriate for ${gradeLevel} students\n`;
            }
            prompt += `   - Specific and actionable\n`;
            prompt += `   - Encouraging but honest\n`;
            prompt += `   - Focused on both strengths and areas for improvement\n`;
            prompt += `   - Uses language and concepts suitable for this grade level\n\n`;
        } else {
            prompt += `Please provide only a numerical grade (0-${assignment.maxPoints || 100}).\n\n`;
        }

        prompt += `Format your response as:\n`;
        prompt += `GRADE: [number]\n`;
        if (constructiveFeedback) {
            prompt += `FEEDBACK: [your detailed feedback here]\n`;
        }

        return prompt;
    }

    parseGradingResponse(responseText, maxPoints) {
        const result = {
            grade: null,
            feedback: '',
            rubricScores: []
        };

        // Extract grade
        const gradeMatch = responseText.match(/GRADE:\s*(\d+(?:\.\d+)?)/i);
        if (gradeMatch) {
            result.grade = Math.min(parseFloat(gradeMatch[1]), maxPoints || 100);
        }

        // Extract feedback
        const feedbackMatch = responseText.match(/FEEDBACK:\s*([\s\S]+)/i);
        if (feedbackMatch) {
            result.feedback = feedbackMatch[1].trim();
        }

        return result;
    }

    // Generate an assignment using AI
    async generateAssignment(topic) {
        const prompt = `Create a detailed assignment for the following topic: "${topic}"

Please include:
1. Assignment Title
2. Clear Instructions
3. Learning Objectives
4. Requirements/Deliverables
5. Suggested grading criteria

Format the response in a structured way.`;

        return await this.generateWithAI(prompt);
    }

    // Generate a rubric using AI
    async generateRubric(assignmentDescription) {
        const prompt = `Create a detailed grading rubric for the following assignment:

${assignmentDescription}

Please create a rubric with:
1. 3-5 key criteria to evaluate
2. For each criterion, provide 4 levels of achievement (Exemplary, Proficient, Developing, Beginning)
3. Point values for each level
4. Clear descriptions for each level

Format the rubric in a structured way that can be used in Google Classroom.`;

        return await this.generateWithAI(prompt);
    }

    async generateWithAI(prompt) {
        // Try Gemini first
        const apiKey = this.getGeminiApiKey();
        if (apiKey) {
            try {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                    return data.candidates[0]?.content?.parts[0]?.text || '';
                }
            } catch (error) {
                console.error('Gemini generation failed:', error);
            }
        }

        // Fallback to Phi-2
        if (this.cloudflareWorkerUrl) {
            try {
                const response = await fetch(`${this.cloudflareWorkerUrl}/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt,
                        model: '@cf/microsoft/phi-2'
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.response || '';
                }
            } catch (error) {
                console.error('Phi-2 generation failed:', error);
            }
        }

        throw new Error('Failed to generate content with AI');
    }

    // Analyze submission quality
    extractGradeLevel(course) {
        if (!course) return null;
        
        // Check section field (e.g., "Grade 5", "5th Grade", "High School")
        if (course.section) {
            const gradeMatch = course.section.match(/(?:grade\s*)?(\d+)(?:th|st|nd|rd)?/i);
            if (gradeMatch) {
                return `Grade ${gradeMatch[1]}`;
            }
            // Check for common terms
            if (/elementary/i.test(course.section)) return 'Elementary';
            if (/middle\s*school/i.test(course.section)) return 'Middle School';
            if (/high\s*school/i.test(course.section)) return 'High School';
            if (/college|university/i.test(course.section)) return 'College';
        }
        
        // Check course name (e.g., "10th Grade Biology")
        if (course.name) {
            const gradeMatch = course.name.match(/(?:grade\s*)?(\d+)(?:th|st|nd|rd)?/i);
            if (gradeMatch) {
                return `Grade ${gradeMatch[1]}`;
            }
            if (/elementary/i.test(course.name)) return 'Elementary';
            if (/middle\s*school/i.test(course.name)) return 'Middle School';
            if (/high\s*school/i.test(course.name)) return 'High School';
            if (/college|university/i.test(course.name)) return 'College';
        }
        
        // Check description
        if (course.description) {
            const gradeMatch = course.description.match(/(?:grade\s*)?(\d+)(?:th|st|nd|rd)?/i);
            if (gradeMatch) {
                return `Grade ${gradeMatch[1]}`;
            }
        }
        
        return null;
    }

    analyzeSubmissionQuality(submissionText, assignment) {
        const analysis = {
            wordCount: submissionText.split(/\s+/).length,
            hasStructure: false,
            readabilityScore: 0,
            completenessScore: 0
        };

        // Check for paragraph structure
        analysis.hasStructure = submissionText.includes('\n\n') || submissionText.split('\n').length > 3;

        // Simple completeness check based on word count
        const expectedWords = assignment.description?.split(/\s+/).length * 2 || 500;
        analysis.completenessScore = Math.min(100, (analysis.wordCount / expectedWords) * 100);

        return analysis;
    }
}
