from flask import Flask, request, jsonify, render_template, send_from_directory, redirect
from flask_cors import CORS
from openai import OpenAI
import os
import requests
import logging
from datetime import datetime
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://resume-generator-svqj.onrender.com"
])

# Environment and API Keys
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['JSON_SORT_KEYS'] = False

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PDFCO_API_KEY = os.getenv('PDFCO_API_KEY')
ENVIRONMENT = os.getenv('FLASK_ENV', 'production')

if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY missing in environment")
    raise ValueError("OPENAI_API_KEY not set")
if not PDFCO_API_KEY:
    logger.error("PDFCO_API_KEY missing in environment")
    raise ValueError("PDFCO_API_KEY not set")

client = OpenAI(api_key=OPENAI_API_KEY)
start_time = datetime.now()

def validate_text_input(text, field_name, min_length=1, max_length=1000):
    if not text or not isinstance(text, str):
        raise ValueError(f"{field_name} must be provided and be a string.")
    text = text.strip()
    if len(text) < min_length:
        raise ValueError(f"{field_name} must be at least {min_length} characters.")
    if len(text) > max_length:
        raise ValueError(f"{field_name} cannot exceed {max_length} characters.")
    return text

def sanitize_html(html_content):
    if not html_content:
        return ""
    html_content = re.sub(r'<script.*?>.*?</script>', '', html_content, flags=re.IGNORECASE | re.DOTALL)
    html_content = re.sub(r'on\w+="[^"]*"', '', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r"on\w+='[^']*'", '', html_content, flags=re.IGNORECASE)
    return html_content

@app.before_request
def enforce_https():
    if ENVIRONMENT == 'production' and not request.is_secure and request.headers.get('x-forwarded-proto', 'http') != 'https':
        url = request.url.replace("http://", "https://", 1)
        return redirect(url, code=301)

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request", "status": "error"}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found", "status": "error"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error", "status": "error"}), 500

@app.route('/')
def home():
    try:
        return render_template('ResumeGen.html')
    except Exception as e:
        logger.error(f"Error loading home page: {e}")
        return jsonify({"error": "Unable to load app", "status": "error"}), 500

@app.route('/generate', methods=['POST'])
def generate():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json", "status": "error"}), 400
        data = request.get_json()
        role = validate_text_input(data.get('role', ''), 'Role', 2, 100)
        skills = validate_text_input(data.get('skills', ''), 'Skills', 3, 500)
        job_description = data.get('job_description', '').strip()

        prompt = f"""
        Create a professional resume summary and experience section for a {role} role.
        Skills: {skills}
        {'Job Description Context: ' + job_description if job_description else ''}
        Provide:
        1. A compelling professional summary (50-80 words)
        2. 3-5 key quantified achievements
        3. ATS-optimized, keyword-rich, clear markdown sections
        """

        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional resume writer."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        output = completion.choices[0].message.content

        return jsonify({
            "content": output,
            "status": "success",
            "metadata": {
                "role": role,
                "generated_at": datetime.now().isoformat()
            }
        })

    except Exception as e:
        logger.error(f"Error in /generate: {e}")
        return jsonify({"error": "An error occurred while generating resume.", "status": "error"}), 500

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json", "status": "error"}), 400
        data = request.get_json()
        html_content = sanitize_html(data.get('html', ''))
        filename = re.sub(r'[<>:"/\\|?*]', '', data.get('filename', 'Resume')).strip() + '.pdf'

        payload = {
            "name": filename,
            "html": f"<html><body>{html_content}</body></html>",
            "margins": "10mm",
            "paperSize": "A4",
            "orientation": "portrait",
            "printBackground": True
        }

        response = requests.post(
            "https://api.pdf.co/v1/pdf/convert/from/html",
            headers={"x-api-key": PDFCO_API_KEY, "Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        result = response.json()

        if response.status_code == 200 and result.get("error") is False:
            return jsonify({"status": "success", "url": result["url"], "filename": filename})
        else:
            logger.error(f"PDF.co error: {result.get('message')}")
            return jsonify({"error": "Failed to generate PDF.", "status": "error"}), 500

    except Exception as e:
        logger.error(f"Error in /generate-pdf: {e}")
        return jsonify({"error": "An error occurred while generating PDF.", "status": "error"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        openai_status = "healthy"
        pdfco_status = "healthy"

        try:
            client.models.list()
        except Exception:
            openai_status = "unhealthy"

        try:
            test_resp = requests.get("https://api.pdf.co/v1/account/balance", headers={"x-api-key": PDFCO_API_KEY}, timeout=5)
            if test_resp.status_code != 200:
                pdfco_status = "unhealthy"
        except Exception:
            pdfco_status = "unhealthy"

        return jsonify({
            "status": "healthy",
            "environment": ENVIRONMENT,
            "uptime": str(datetime.now() - start_time),
            "services": {"openai": openai_status, "pdfco": pdfco_status}
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

@app.route('/api/info', methods=['GET'])
def api_info():
    return jsonify({
        "name": "Resume Generator API",
        "version": "1.0.0",
        "endpoints": {
            "/": "Frontend UI",
            "/generate": "Generate resume content",
            "/generate-pdf": "Generate PDF from HTML",
            "/health": "Health check",
            "/api/info": "API information"
        }
    })

@app.before_request
def log_request():
    if ENVIRONMENT != 'production':
        logger.info(f"{request.method} {request.url}")

@app.after_request
def log_response(response):
    if ENVIRONMENT != 'production':
        logger.info(f"Status: {response.status_code}")
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=(ENVIRONMENT != 'production'))
