// Google OAuth Authentication
export class GoogleAuth {
    constructor() {
        // This will fail if not set - good! User must configure it.
        this.CLIENT_ID = this.getClientId();
        this.SCOPES = [
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.coursework.me',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ];
        
        this.tokenClient = null;
        this.accessToken = null;
        this.currentUser = null;
        
        this.loadGoogleAPI();
    }

    getClientId() {
        // Try to get from localStorage (user must set this via settings)
        const storedClientId = localStorage.getItem('googleClientId');
        if (storedClientId) {
            return storedClientId;
        }
        
        // Show error to user
        console.error('GOOGLE_CLIENT_ID not configured!');
        throw new Error('Google Client ID not configured. Please go to Settings and add your Google OAuth Client ID.');
    }

    loadGoogleAPI() {
        // Load Google Identity Services
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.initializeGoogleIdentity();
        };
        document.head.appendChild(script);
    }

    initializeGoogleIdentity() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES.join(' '),
            callback: (response) => {
                if (response.error) {
                    console.error('OAuth error:', response);
                    return;
                }
                this.accessToken = response.access_token;
                this.getUserInfo();
            }
        });
    }

    async signIn() {
        if (!this.tokenClient) {
            throw new Error('Google Identity Services not loaded');
        }
        
        this.tokenClient.requestAccessToken();
    }

    async getUserInfo() {
        if (!this.accessToken) return null;

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                return this.currentUser;
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
        return null;
    }

    signOut() {
        this.accessToken = null;
        this.currentUser = null;
        if (google.accounts.oauth2) {
            google.accounts.oauth2.revoke(this.accessToken);
        }
    }

    getAccessToken() {
        return this.accessToken;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async checkAuth() {
        // Check for demo mode (for testing)
        const demoMode = localStorage.getItem('DEMO_MODE');
        if (demoMode === 'true') {
            this.accessToken = 'demo_token';
            this.currentUser = JSON.parse(localStorage.getItem('mockUser') || '{"name":"Demo User","email":"demo@test.com","picture":""}');
            console.log('✓ Demo mode enabled');
            return true;
        }
        
        // Check if there's a valid token in session storage
        const savedToken = sessionStorage.getItem('googleAccessToken');
        if (savedToken) {
            this.accessToken = savedToken;
            await this.getUserInfo();
            return !!this.currentUser;
        }
        return false;
    }

    isAuthenticated() {
        return !!this.accessToken;
    }
}
