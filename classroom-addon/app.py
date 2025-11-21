from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import config
import google.oauth2.credentials
import googleapiclient.discovery
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
import json

app = Flask(__name__)
app.config.from_object(config.Config)


def get_credentials():
    """Get credentials from session"""
    if "credentials" not in session:
        return None

    credentials_dict = session["credentials"]
    return google.oauth2.credentials.Credentials(**credentials_dict)


def credentials_to_dict(credentials):
    """Convert credentials to dict for session storage"""
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }


@app.route("/")
def index():
    """Company landing page"""
    return render_template(
        "index.html",
        title="AI Auto-Grader",
        message="Welcome to AI Auto-Grader for Google Classroom",
    )


@app.route("/addon-discovery")
def addon_discovery():
    """Add-on discovery page - shown when add-on is first opened in Classroom"""
    # Get query parameters passed by Classroom
    login_hint = request.args.get("login_hint", "")

    return render_template(
        "addon-discovery.html",
        title="AI Auto-Grader Setup",
        message="Welcome! Let's set up AI-powered grading for your assignments.",
        login_hint=login_hint,
    )


@app.route("/teacher-view")
def teacher_view():
    """Teacher view - shown when teacher creates/edits attachment"""
    item_id = request.args.get("itemId", "")
    item_type = request.args.get("itemType", "")
    course_id = request.args.get("courseId", "")

    return render_template(
        "teacher-view.html",
        title="Create Auto-Grading Assignment",
        item_id=item_id,
        item_type=item_type,
        course_id=course_id,
    )


@app.route("/student-view")
def student_view():
    """Student view - shown when student opens attachment"""
    item_id = request.args.get("itemId", "")
    attachment_id = request.args.get("attachmentId", "")
    submission_id = request.args.get("submissionId", "")

    return render_template(
        "student-view.html",
        title="Submit Your Work",
        item_id=item_id,
        attachment_id=attachment_id,
        submission_id=submission_id,
    )


@app.route("/grader-view")
def grader_view():
    """Grader view - shown when teacher reviews student work"""
    item_id = request.args.get("itemId", "")
    attachment_id = request.args.get("attachmentId", "")
    submission_id = request.args.get("submissionId", "")

    return render_template(
        "grader-view.html",
        title="Review Student Work",
        item_id=item_id,
        attachment_id=attachment_id,
        submission_id=submission_id,
    )


@app.route("/authorize")
def authorize():
    """Begin OAuth flow"""
    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": app.config["GOOGLE_CLIENT_ID"],
                "client_secret": app.config["GOOGLE_CLIENT_SECRET"],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [app.config["REDIRECT_URI"]],
            }
        },
        scopes=app.config["SCOPES"],
    )

    flow.redirect_uri = app.config["REDIRECT_URI"]

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        login_hint=request.args.get("login_hint", ""),
    )

    session["state"] = state
    return redirect(authorization_url)


@app.route("/callback")
def callback():
    """OAuth callback handler"""
    from google_auth_oauthlib.flow import Flow

    state = session["state"]

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": app.config["GOOGLE_CLIENT_ID"],
                "client_secret": app.config["GOOGLE_CLIENT_SECRET"],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [app.config["REDIRECT_URI"]],
            }
        },
        scopes=app.config["SCOPES"],
        state=state,
    )

    flow.redirect_uri = app.config["REDIRECT_URI"]

    authorization_response = request.url.replace("http://", "https://")
    flow.fetch_token(authorization_response=authorization_response)

    credentials = flow.credentials
    session["credentials"] = credentials_to_dict(credentials)

    return redirect(url_for("addon_discovery"))


@app.route("/api/grade", methods=["POST"])
def api_grade():
    """API endpoint to grade a submission"""
    data = request.json

    submission_text = data.get("submission", "")
    rubric = data.get("rubric", {})
    grade_level = data.get("grade_level", "high school")

    # Use Gemini API to grade
    try:
        import google.generativeai as genai

        genai.configure(api_key=app.config["GEMINI_API_KEY"])

        model = genai.GenerativeModel("gemini-pro")

        prompt = f"""You are an expert teacher grading student work.

Grade Level: {grade_level}
Rubric: {json.dumps(rubric, indent=2)}

Student Submission:
{submission_text}

Please provide:
1. A numerical grade (0-100)
2. Constructive, grade-appropriate feedback
3. Specific strengths
4. Areas for improvement

Format your response as JSON:
{{
  "grade": <number>,
  "feedback": "<feedback text>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}}"""

        response = model.generate_content(prompt)
        result = json.loads(response.text)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/create-attachment", methods=["POST"])
def api_create_attachment():
    """API endpoint to create an add-on attachment"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({"error": "Not authorized"}), 401

    try:
        service = googleapiclient.discovery.build(
            "classroom", "v1", credentials=credentials
        )

        data = request.json
        course_id = data.get("courseId")
        item_id = data.get("itemId")

        attachment = {
            "teacherViewUri": {
                "uri": f"https://localhost:5000/teacher-view?itemId={item_id}"
            },
            "studentViewUri": {
                "uri": f"https://localhost:5000/student-view?itemId={item_id}"
            },
            "title": "AI Auto-Grading",
        }

        result = (
            service.courses()
            .courseWork()
            .addOnAttachments()
            .create(courseId=course_id, itemId=item_id, body=attachment)
            .execute()
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Run with SSL for local testing
    app.run(
        host="localhost",
        port=5001,
        ssl_context=("localhost.pem", "localhost-key.pem"),
        debug=True,
    )
