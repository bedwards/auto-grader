// UI Management for the Auto-Grader
export class UIManager {
    constructor() {
        this.loadingEl = document.getElementById('loading');
    }

    showLoading() {
        this.loadingEl?.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingEl?.classList.add('hidden');
    }

    showUserInfo(user) {
        const signInBtn = document.getElementById('sign-in-btn');
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (signInBtn) signInBtn.classList.add('hidden');
        if (userInfo) userInfo.classList.remove('hidden');
        if (userAvatar && user.picture) userAvatar.src = user.picture;
        if (userName && user.name) userName.textContent = user.name;
    }

    hideUserInfo() {
        const signInBtn = document.getElementById('sign-in-btn');
        const userInfo = document.getElementById('user-info');

        if (signInBtn) signInBtn.classList.remove('hidden');
        if (userInfo) userInfo.classList.add('hidden');
    }

    updateDashboard(stats) {
        document.getElementById('total-courses').textContent = stats.totalCourses;
        document.getElementById('active-assignments').textContent = stats.activeAssignments;
        document.getElementById('pending-submissions').textContent = stats.pendingSubmissions;
        document.getElementById('total-rubrics').textContent = stats.totalRubrics;
    }

    displayCourses(courses) {
        const container = document.getElementById('courses-list');
        if (!container) return;

        if (courses.length === 0) {
            container.innerHTML = '<p>No courses found.</p>';
            return;
        }

        container.innerHTML = courses.map(course => `
            <div class="card">
                <h3>${this.escapeHtml(course.name)}</h3>
                <p>${this.escapeHtml(course.section || 'No section')}</p>
                <p>Course Code: ${this.escapeHtml(course.enrollmentCode || 'N/A')}</p>
                <p>Status: ${course.courseState}</p>
            </div>
        `).join('');
    }

    displayAssignments(assignments) {
        const container = document.getElementById('assignments-list');
        if (!container) return;

        if (assignments.length === 0) {
            container.innerHTML = '<p>No assignments found.</p>';
            return;
        }

        container.innerHTML = assignments.map(assignment => `
            <div class="card">
                <h3>${this.escapeHtml(assignment.title)}</h3>
                <p>Course: ${this.escapeHtml(assignment.courseName || 'Unknown')}</p>
                <p>${this.escapeHtml(assignment.description || 'No description')}</p>
                <p>Max Points: ${assignment.maxPoints || 'Ungraded'}</p>
                <p>State: ${assignment.state}</p>
                ${assignment.dueDate ? `<p>Due: ${this.formatDate(assignment.dueDate)}</p>` : ''}
            </div>
        `).join('');
    }

    displayRubrics(rubrics) {
        const container = document.getElementById('rubrics-list');
        if (!container) return;

        if (rubrics.length === 0) {
            container.innerHTML = '<p>No rubrics found. Create one to get started!</p>';
            return;
        }

        container.innerHTML = rubrics.map(rubric => `
            <div class="card">
                <h3>${this.escapeHtml(rubric.criteria?.title || 'Unnamed Rubric')}</h3>
                <p>Course: ${this.escapeHtml(rubric.courseName || 'Unknown')}</p>
                <p>Assignment: ${this.escapeHtml(rubric.assignmentTitle || 'Unknown')}</p>
                ${this.renderRubricLevels(rubric.criteria?.levels || [])}
            </div>
        `).join('');
    }

    renderRubricLevels(levels) {
        if (!levels || levels.length === 0) return '';

        return `
            <div style="margin-top: 10px;">
                <strong>Levels:</strong>
                <ul style="margin-left: 20px;">
                    ${levels.map(level => `
                        <li>${this.escapeHtml(level.title)}: ${level.points} pts - ${this.escapeHtml(level.description || '')}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    populateCourseSelect(courses) {
        const select = document.getElementById('course-select');
        if (!select) return;

        select.innerHTML = '<option value="">Choose a course...</option>' +
            courses.map(course => `
                <option value="${course.id}">${this.escapeHtml(course.name)}</option>
            `).join('');
    }

    populateAssignmentSelect(assignments) {
        const select = document.getElementById('assignment-select');
        if (!select) return;

        select.innerHTML = '<option value="">Choose an assignment...</option>' +
            assignments.map(assignment => `
                <option value="${assignment.id}">${this.escapeHtml(assignment.title)}</option>
            `).join('');
    }

    showGradingProgress() {
        const progressEl = document.getElementById('grading-progress');
        if (progressEl) {
            progressEl.classList.remove('hidden');
            document.getElementById('grading-results').innerHTML = '';
        }
    }

    updateGradingProgress(current, total, result) {
        const percentage = (current / total) * 100;
        const progressFill = document.getElementById('grading-progress-fill');
        const statusEl = document.getElementById('grading-status');
        const resultsEl = document.getElementById('grading-results');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        if (statusEl) {
            statusEl.textContent = `Grading: ${current} of ${total} submissions (${Math.round(percentage)}%)`;
        }

        if (resultsEl && result) {
            const resultHtml = `
                <div class="result-item">
                    <strong>Submission graded:</strong> ${result.grade} points
                    ${result.feedback ? `<p>${this.escapeHtml(result.feedback.substring(0, 100))}...</p>` : ''}
                </div>
            `;
            resultsEl.innerHTML = resultHtml + resultsEl.innerHTML;
        }
    }

    addGradingError(submission, error) {
        const resultsEl = document.getElementById('grading-results');
        if (!resultsEl) return;

        const errorHtml = `
            <div class="result-item error">
                <strong>Error:</strong> Failed to grade submission
                <p>${this.escapeHtml(error.message)}</p>
            </div>
        `;
        resultsEl.innerHTML = errorHtml + resultsEl.innerHTML;
    }

    completeGrading(graded, total) {
        const statusEl = document.getElementById('grading-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <strong style="color: var(--secondary-color);">
                    Grading Complete! Successfully graded ${graded} of ${total} submissions.
                </strong>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateObj) {
        if (!dateObj) return 'No date';
        
        const { year, month, day } = dateObj;
        if (!year || !month || !day) return 'Invalid date';
        
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
