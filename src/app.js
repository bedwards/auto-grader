import { GoogleAuth } from './auth.js';
import { ClassroomAPI } from './classroom-api.js';
import { GradingEngine } from './grading-engine.js';
import { UIManager } from './ui-manager.js';

class AutoGraderApp {
    constructor() {
        this.auth = new GoogleAuth();
        this.classroom = new ClassroomAPI();
        this.gradingEngine = new GradingEngine();
        this.ui = new UIManager();
        
        this.init();
    }

    async init() {
        console.log('Initializing Auto-Grader App...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check if user is already signed in
        const isSignedIn = await this.auth.checkAuth();
        if (isSignedIn) {
            await this.handleSignIn();
        }
    }

    setupEventListeners() {
        // Auth buttons
        document.getElementById('sign-in-btn').addEventListener('click', () => {
            this.signIn();
        });

        document.getElementById('sign-out-btn').addEventListener('click', () => {
            this.signOut();
        });

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Generate buttons
        document.getElementById('generate-assignment-btn')?.addEventListener('click', () => {
            this.generateAssignment();
        });

        document.getElementById('generate-rubric-btn')?.addEventListener('click', () => {
            this.generateRubric();
        });

        // Grading controls
        document.getElementById('course-select')?.addEventListener('change', (e) => {
            this.handleCourseSelect(e.target.value);
        });

        document.getElementById('assignment-select')?.addEventListener('change', (e) => {
            this.handleAssignmentSelect(e.target.value);
        });

        document.getElementById('start-grading-btn')?.addEventListener('click', () => {
            this.startAutoGrading();
        });

        // Settings
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });
    }

    async signIn() {
        this.ui.showLoading();
        try {
            await this.auth.signIn();
            await this.handleSignIn();
        } catch (error) {
            console.error('Sign in error:', error);
            alert('Failed to sign in. Please try again.');
        } finally {
            this.ui.hideLoading();
        }
    }

    async handleSignIn() {
        const user = this.auth.getCurrentUser();
        this.ui.showUserInfo(user);
        
        // Initialize Classroom API with auth
        this.classroom.setAuth(this.auth);
        
        // Load dashboard data
        await this.loadDashboard();
        
        // Show main content
        document.getElementById('not-authenticated').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
    }

    signOut() {
        this.auth.signOut();
        this.ui.hideUserInfo();
        document.getElementById('not-authenticated').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        this.ui.showLoading();
        try {
            switch (tabName) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'courses':
                    await this.loadCourses();
                    break;
                case 'assignments':
                    await this.loadAssignments();
                    break;
                case 'rubrics':
                    await this.loadRubrics();
                    break;
                case 'grading':
                    await this.loadGradingOptions();
                    break;
                case 'settings':
                    this.loadSettings();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName}:`, error);
            alert(`Failed to load ${tabName}. Please try again.`);
        } finally {
            this.ui.hideLoading();
        }
    }

    async loadDashboard() {
        const courses = await this.classroom.getCourses();
        const stats = {
            totalCourses: courses.length,
            activeAssignments: 0,
            pendingSubmissions: 0,
            totalRubrics: 0
        };

        // Count assignments and submissions
        for (const course of courses.slice(0, 5)) {
            const assignments = await this.classroom.getCourseWork(course.id);
            stats.activeAssignments += assignments.length;
            
            for (const assignment of assignments) {
                const submissions = await this.classroom.getSubmissions(course.id, assignment.id);
                stats.pendingSubmissions += submissions.filter(s => s.state === 'TURNED_IN').length;
            }
        }

        this.ui.updateDashboard(stats);
    }

    async loadCourses() {
        const courses = await this.classroom.getCourses();
        this.ui.displayCourses(courses);
    }

    async loadAssignments() {
        const courses = await this.classroom.getCourses();
        const allAssignments = [];
        
        for (const course of courses) {
            const assignments = await this.classroom.getCourseWork(course.id);
            allAssignments.push(...assignments.map(a => ({ ...a, courseName: course.name })));
        }
        
        this.ui.displayAssignments(allAssignments);
    }

    async loadRubrics() {
        const courses = await this.classroom.getCourses();
        const allRubrics = [];
        
        for (const course of courses) {
            const assignments = await this.classroom.getCourseWork(course.id);
            for (const assignment of assignments) {
                const rubrics = await this.classroom.getRubrics(course.id, assignment.id);
                allRubrics.push(...rubrics.map(r => ({ ...r, courseName: course.name, assignmentTitle: assignment.title })));
            }
        }
        
        this.ui.displayRubrics(allRubrics);
    }

    async loadGradingOptions() {
        const courses = await this.classroom.getCourses();
        this.ui.populateCourseSelect(courses);
    }

    async handleCourseSelect(courseId) {
        if (!courseId) {
            document.getElementById('assignment-select').disabled = true;
            document.getElementById('start-grading-btn').disabled = true;
            return;
        }

        const assignments = await this.classroom.getCourseWork(courseId);
        this.ui.populateAssignmentSelect(assignments);
        document.getElementById('assignment-select').disabled = false;
    }

    handleAssignmentSelect(assignmentId) {
        document.getElementById('start-grading-btn').disabled = !assignmentId;
    }

    async startAutoGrading() {
        const courseId = document.getElementById('course-select').value;
        const assignmentId = document.getElementById('assignment-select').value;
        const useGemini = document.getElementById('use-gemini').checked;
        const usePhi2 = document.getElementById('use-phi2').checked;
        const constructiveFeedback = document.getElementById('constructive-feedback').checked;

        if (!courseId || !assignmentId) {
            alert('Please select a course and assignment.');
            return;
        }

        document.getElementById('start-grading-btn').disabled = true;
        this.ui.showGradingProgress();

        try {
            const submissions = await this.classroom.getSubmissions(courseId, assignmentId);
            const assignment = await this.classroom.getAssignment(courseId, assignmentId);
            const rubrics = await this.classroom.getRubrics(courseId, assignmentId);

            const totalSubmissions = submissions.filter(s => s.state === 'TURNED_IN').length;
            let gradedCount = 0;

            for (const submission of submissions) {
                if (submission.state !== 'TURNED_IN') continue;

                try {
                    // Get course details for grade level
                    const course = await this.classroom.getCourse(courseId);
                    
                    const result = await this.gradingEngine.gradeSubmission({
                        submission,
                        assignment,
                        rubrics,
                        useGemini,
                        usePhi2,
                        constructiveFeedback,
                        course
                    });

                    // Update submission with grade and feedback
                    await this.classroom.updateSubmission(courseId, assignmentId, submission.id, {
                        assignedGrade: result.grade,
                        draftGrade: result.grade
                    });

                    // Add feedback as comment
                    if (result.feedback) {
                        await this.classroom.addComment(courseId, assignmentId, submission.id, result.feedback);
                    }

                    gradedCount++;
                    this.ui.updateGradingProgress(gradedCount, totalSubmissions, result);

                } catch (error) {
                    console.error('Error grading submission:', error);
                    this.ui.addGradingError(submission, error);
                }
            }

            this.ui.completeGrading(gradedCount, totalSubmissions);
            
        } catch (error) {
            console.error('Auto-grading error:', error);
            alert('Failed to complete auto-grading. Please check the console for details.');
        } finally {
            document.getElementById('start-grading-btn').disabled = false;
        }
    }

    async generateAssignment() {
        const topic = prompt('Enter the assignment topic:');
        if (!topic) return;

        this.ui.showLoading();
        try {
            const assignment = await this.gradingEngine.generateAssignment(topic);
            // Show generated assignment in a modal or new section
            alert('Assignment generated! (Implementation needed for display)');
            console.log('Generated assignment:', assignment);
        } catch (error) {
            console.error('Error generating assignment:', error);
            alert('Failed to generate assignment. Please try again.');
        } finally {
            this.ui.hideLoading();
        }
    }

    async generateRubric() {
        const assignmentDescription = prompt('Enter the assignment description for the rubric:');
        if (!assignmentDescription) return;

        this.ui.showLoading();
        try {
            const rubric = await this.gradingEngine.generateRubric(assignmentDescription);
            // Show generated rubric in a modal or new section
            alert('Rubric generated! (Implementation needed for display)');
            console.log('Generated rubric:', rubric);
        } catch (error) {
            console.error('Error generating rubric:', error);
            alert('Failed to generate rubric. Please try again.');
        } finally {
            this.ui.hideLoading();
        }
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('autoGraderSettings') || '{}');
        
        const googleClientId = localStorage.getItem('googleClientId');
        if (googleClientId) {
            document.getElementById('google-client-id').value = googleClientId;
        }
        
        const geminiApiKey = localStorage.getItem('geminiApiKey');
        if (geminiApiKey) {
            document.getElementById('gemini-api-key').value = geminiApiKey;
        }
        
        if (settings.cloudflareWorkerUrl) {
            document.getElementById('cloudflare-worker-url').value = settings.cloudflareWorkerUrl;
        }
        if (settings.defaultAiModel) {
            document.getElementById('default-ai-model').value = settings.defaultAiModel;
        }
        if (settings.feedbackDetail) {
            document.getElementById('feedback-detail').value = settings.feedbackDetail;
        }
        if (settings.autoReturn !== undefined) {
            document.getElementById('auto-return').checked = settings.autoReturn;
        }
    }

    saveSettings() {
        const googleClientId = document.getElementById('google-client-id').value;
        const geminiApiKey = document.getElementById('gemini-api-key').value;
        
        if (!googleClientId) {
            alert('Google OAuth Client ID is required!');
            return;
        }
        
        // Save credentials separately
        localStorage.setItem('googleClientId', googleClientId);
        if (geminiApiKey) {
            localStorage.setItem('geminiApiKey', geminiApiKey);
        }
        
        const settings = {
            cloudflareWorkerUrl: document.getElementById('cloudflare-worker-url').value,
            defaultAiModel: document.getElementById('default-ai-model').value,
            feedbackDetail: document.getElementById('feedback-detail').value,
            autoReturn: document.getElementById('auto-return').checked
        };

        localStorage.setItem('autoGraderSettings', JSON.stringify(settings));
        alert('Settings saved successfully! Please refresh the page to apply changes.');
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AutoGraderApp();
    });
} else {
    new AutoGraderApp();
}
