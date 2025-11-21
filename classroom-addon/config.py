import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config(object):
    # Server configuration
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"

    # Google Cloud Project Configuration
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

    # Gemini API Key (loaded from .env - NEVER commit this!)
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

    # Cloudflare Worker URL
    CLOUDFLARE_WORKER_URL = os.environ.get("CLOUDFLARE_WORKER_URL")

    # OAuth 2.0 Scopes
    SCOPES = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/classroom.addons.teacher",
        "https://www.googleapis.com/auth/classroom.addons.student",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me",
        "https://www.googleapis.com/auth/classroom.coursework.students",
    ]

    # Redirect URI for OAuth
    REDIRECT_URI = os.environ.get("REDIRECT_URI") or "https://localhost:5000/callback"

    # Add-on Configuration
    ADDON_TITLE = "AI Auto-Grader"
    ADDON_DESCRIPTION = (
        "Automatically grade student submissions with AI-powered feedback"
    )
