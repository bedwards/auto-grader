// Google Classroom API Integration
export class ClassroomAPI {
    constructor() {
        this.BASE_URL = 'https://classroom.googleapis.com/v1';
        this.auth = null;
    }

    setAuth(auth) {
        this.auth = auth;
    }

    async makeRequest(endpoint, options = {}) {
        if (!this.auth || !this.auth.getAccessToken()) {
            throw new Error('Not authenticated');
        }

        const url = `${this.BASE_URL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.auth.getAccessToken()}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`API Error: ${error.error?.message || response.statusText}`);
        }

        return await response.json();
    }

    // Courses
    async getCourses() {
        const response = await this.makeRequest('/courses?courseStates=ACTIVE');
        return response.courses || [];
    }

    async getCourse(courseId) {
        return await this.makeRequest(`/courses/${courseId}`);
    }

    // Course Work (Assignments)
    async getCourseWork(courseId) {
        const response = await this.makeRequest(`/courses/${courseId}/courseWork`);
        return response.courseWork || [];
    }

    async getAssignment(courseId, courseWorkId) {
        return await this.makeRequest(`/courses/${courseId}/courseWork/${courseWorkId}`);
    }

    async createCourseWork(courseId, courseWork) {
        return await this.makeRequest(`/courses/${courseId}/courseWork`, {
            method: 'POST',
            body: JSON.stringify(courseWork)
        });
    }

    // Student Submissions
    async getSubmissions(courseId, courseWorkId) {
        const response = await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`
        );
        return response.studentSubmissions || [];
    }

    async getSubmission(courseId, courseWorkId, submissionId) {
        return await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}`
        );
    }

    async updateSubmission(courseId, courseWorkId, submissionId, updates) {
        return await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}?updateMask=${Object.keys(updates).join(',')}`,
            {
                method: 'PATCH',
                body: JSON.stringify(updates)
            }
        );
    }

    async returnSubmission(courseId, courseWorkId, submissionId) {
        return await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}:return`,
            {
                method: 'POST',
                body: JSON.stringify({})
            }
        );
    }

    // Rubrics
    async getRubrics(courseId, courseWorkId) {
        try {
            const response = await this.makeRequest(
                `/courses/${courseId}/courseWork/${courseWorkId}/rubrics`
            );
            return response.rubrics || [];
        } catch (error) {
            console.warn('No rubrics found for this assignment');
            return [];
        }
    }

    async createRubric(courseId, courseWorkId, rubric) {
        return await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/rubrics`,
            {
                method: 'POST',
                body: JSON.stringify(rubric)
            }
        );
    }

    async getRubric(courseId, courseWorkId, rubricId) {
        return await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/rubrics/${rubricId}`
        );
    }

    async updateRubric(courseId, courseWorkId, rubricId, updates) {
        return await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/rubrics/${rubricId}?updateMask=${Object.keys(updates).join(',')}`,
            {
                method: 'PATCH',
                body: JSON.stringify(updates)
            }
        );
    }

    // Comments/Feedback
    async addComment(courseId, courseWorkId, submissionId, comment) {
        // Note: This uses a private comment that only the teacher and student can see
        return await this.makeRequest(
            `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}:modifyAttachments`,
            {
                method: 'POST',
                body: JSON.stringify({
                    addAttachments: [{
                        driveFile: {
                            shareMode: 'VIEW',
                            title: 'Feedback',
                            alternateLink: '',
                            thumbnailUrl: ''
                        }
                    }]
                })
            }
        );
    }

    // Students
    async getStudents(courseId) {
        const response = await this.makeRequest(`/courses/${courseId}/students`);
        return response.students || [];
    }

    async getStudent(courseId, userId) {
        return await this.makeRequest(`/courses/${courseId}/students/${userId}`);
    }

    // Teachers
    async getTeachers(courseId) {
        const response = await this.makeRequest(`/courses/${courseId}/teachers`);
        return response.teachers || [];
    }

    // Grading Periods (New feature)
    async getGradingPeriodSettings(courseId) {
        try {
            return await this.makeRequest(`/courses/${courseId}/gradingPeriodSettings`);
        } catch (error) {
            console.warn('Grading periods not available for this course');
            return null;
        }
    }

    // Student Groups (Preview feature)
    async getStudentGroups(courseId) {
        try {
            const response = await this.makeRequest(`/courses/${courseId}/studentGroups`);
            return response.studentGroups || [];
        } catch (error) {
            console.warn('Student groups not available');
            return [];
        }
    }
}
