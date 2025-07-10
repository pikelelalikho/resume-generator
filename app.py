from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import os
import requests
import logging
import json
from datetime import datetime
from dotenv import load_dotenv
from werkzeug.exceptions import BadRequest
import re

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app config
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])  # More specific CORS

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['JSON_SORT_KEYS'] = False

# Get API keys securely
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PDFCO_API_KEY = os.getenv('PDFCO_API_KEY')
ENVIRONMENT = os.getenv('FLASK_ENV', 'development')

# Validate required environment variables
if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY is not set in the environment")
    raise ValueError("OPENAI_API_KEY is not set in the environment")

if not PDFCO_API_KEY:
    logger.error("PDFCO_API_KEY is not set in the environment")
    raise ValueError("PDFCO_API_KEY is not set in the environment")

# Initialize OpenAI client with error handling
try:
    client = OpenAI(api_key=OPENAI_API_KEY)
    logger.info("OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    raise

# Input validation functions
def validate_text_input(text, field_name, min_length=1, max_length=1000):
    """Validate text input with length constraints"""
    if not text or not isinstance(text, str):
        raise ValueError(f"{field_name} is required and must be a string")
    
    text = text.strip()
    if len(text) < min_length:
        raise ValueError(f"{field_name} must be at least {min_length} characters long")
    
    if len(text) > max_length:
        raise ValueError(f"{field_name} must be no more than {max_length} characters long")
    
    return text

def validate_email(email):
    """Basic email validation"""
    if email:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError("Invalid email format")
    return email

def sanitize_html(html_content):
    """Basic HTML sanitization"""
    if not html_content:
        return ""
    
    # Remove script tags and their content
    html_content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html_content, flags=re.IGNORECASE)
    
    # Remove dangerous attributes
    html_content = re.sub(r'on\w+="[^"]*"', '', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r"on\w+='[^']*'", '', html_content, flags=re.IGNORECASE)
    
    return html_content

# Error handlers
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

# Routes
@app.route('/')
def home():
    """Serve the main application page"""
    try:
        return render_template('ResumeGen.html')
    except Exception as e:
        logger.error(f"Error serving home page: {e}")
        return jsonify({"error": "Unable to load application", "status": "error"}), 500

@app.route('/favicon.ico')
def favicon():
    """Serve favicon"""
    try:
        return send_from_directory(
            os.path.join(app.root_path, 'static'),
            'favicon.ico',
            mimetype='image/vnd.microsoft.icon'
        )
    except FileNotFoundError:
        logger.warning("Favicon not found")
        return "", 404

@app.route('/generate', methods=['POST'])
def generate():
    """AI Resume content generation endpoint with enhanced validation"""
    try:
        # Validate content type
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json", "status": "error"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided", "status": "error"}), 400

        # Validate and sanitize inputs
        try:
            role = validate_text_input(data.get('role', ''), 'Role', min_length=2, max_length=100)
            skills = validate_text_input(data.get('skills', ''), 'Skills', min_length=3, max_length=500)
            job_description = data.get('job_description', '').strip()
            
            # Optional job description validation
            if job_description:
                if len(job_description) > 2000:
                    return jsonify({"error": "Job description too long (max 2000 characters)", "status": "error"}), 400
        except ValueError as e:
            return jsonify({"error": str(e), "status": "error"}), 400

        # Enhanced prompt with better structure
        prompt = f"""
        Create a professional resume summary and experience section for a {role} position.

        Skills: {skills}
        {f"Job Description Context: {job_description}" if job_description else ""}

        Please provide:
        1. A compelling professional summary (2-3 sentences, 50-80 words)
        2. 3-5 key achievements and responsibilities relevant for this role
        3. Use action verbs and quantifiable results where possible
        4. Include industry-relevant keywords naturally
        5. Format with clear sections using markdown

        Focus on:
        - Quantifiable achievements (percentages, numbers, metrics)
        - Industry-relevant keywords from the skills and job description
        - ATS-friendly language
        - Professional tone and clarity
        """

        # OpenAI API call with better error handling
        try:
            completion = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional resume writer with 10+ years of experience creating ATS-optimized resumes. Focus on quantifiable achievements and industry-specific keywords. Always format responses clearly with sections."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7,
                timeout=30
            )

            output = completion.choices[0].message.content
            
            # Log successful generation
            logger.info(f"Generated resume content for role: {role}")
            
            return jsonify({
                "content": output,
                "status": "success",
                "metadata": {
                    "role": role,
                    "generated_at": datetime.now().isoformat(),
                    "tokens_used": completion.usage.total_tokens if hasattr(completion, 'usage') else None
                }
            })

        except Exception as openai_error:
            logger.error(f"OpenAI API error: {openai_error}")
            return jsonify({
                "error": "AI service temporarily unavailable. Please try again.",
                "status": "error"
            }), 503

    except Exception as e:
        logger.error(f"Error in generate endpoint: {e}")
        return jsonify({"error": "An unexpected error occurred", "status": "error"}), 500

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    """PDF Generation from HTML content with enhanced validation"""
    try:
        # Validate content type
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json", "status": "error"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided", "status": "error"}), 400

        html_content = data.get('html', '').strip()
        if not html_content:
            return jsonify({"error": "No HTML content provided", "status": "error"}), 400

        # Validate HTML content length
        if len(html_content) > 100000:  # 100KB limit
            return jsonify({"error": "HTML content too large", "status": "error"}), 400

        # Sanitize HTML content
        sanitized_html = sanitize_html(html_content)
        
        # Get filename from request or use default
        filename = data.get('filename', 'Resume').strip()
        if not filename:
            filename = 'Resume'
        
        # Sanitize filename
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        if not filename.endswith('.pdf'):
            filename += '.pdf'

        # Enhanced HTML structure for PDF
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Resume</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    line-height: 1.6;
                    color: #333;
                }}
                .resume-container {{
                    max-width: 800px;
                    margin: 0 auto;
                }}
                h1, h2, h3 {{ 
                    color: #2c3e50; 
                    margin-bottom: 10px;
                }}
                .section {{ 
                    margin-bottom: 20px; 
                }}
                @media print {{
                    body {{ margin: 0; }}
                }}
            </style>
        </head>
        <body>
            <div class="resume-container">
                {sanitized_html}
            </div>
        </body>
        </html>
        """

        # PDF.co API payload
        payload = {
            "name": filename,
            "html": full_html,
            "margins": "10mm",
            "paperSize": "A4",
            "orientation": "portrait",
            "printBackground": True
        }

        # Make request to PDF.co API
        try:
            response = requests.post(
                "https://api.pdf.co/v1/pdf/convert/from/html",
                headers={
                    "x-api-key": PDFCO_API_KEY,
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30
            )

            result = response.json()

            if response.status_code == 200 and result.get("error") is False and "url" in result:
                logger.info(f"PDF generated successfully: {filename}")
                return jsonify({
                    "status": "success",
                    "url": result["url"],
                    "filename": filename,
                    "generated_at": datetime.now().isoformat()
                })
            else:
                error_msg = result.get("message", "Unknown PDF generation error")
                logger.error(f"PDF.co API error: {error_msg}")
                return jsonify({
                    "status": "error",
                    "error": f"PDF generation failed: {error_msg}"
                }), 500

        except requests.exceptions.Timeout:
            logger.error("PDF.co API timeout")
            return jsonify({
                "status": "error",
                "error": "PDF generation service is taking too long. Please try again."
            }), 504

        except requests.exceptions.RequestException as e:
            logger.error(f"PDF.co API request error: {e}")
            return jsonify({
                "status": "error",
                "error": "PDF generation service is temporarily unavailable"
            }), 503

    except Exception as e:
        logger.error(f"Error in generate-pdf endpoint: {e}")
        return jsonify({"error": "An unexpected error occurred", "status": "error"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint"""
    try:
        # Check OpenAI API connectivity
        openai_status = "healthy"
        try:
            client.models.list()
        except Exception:
            openai_status = "unhealthy"

        # Check PDF.co API connectivity
        pdfco_status = "healthy"
        try:
            test_response = requests.get(
                "https://api.pdf.co/v1/account/balance",
                headers={"x-api-key": PDFCO_API_KEY},
                timeout=5
            )
            if test_response.status_code != 200:
                pdfco_status = "unhealthy"
        except Exception:
            pdfco_status = "unhealthy"

        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "environment": ENVIRONMENT,
            "services": {
                "openai": openai_status,
                "pdfco": pdfco_status
            }
        })

    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/info', methods=['GET'])
def api_info():
    """API information endpoint"""
    return jsonify({
        "name": "Resume Generator API",
        "version": "1.0.0",
        "description": "AI-powered resume generation and PDF conversion service",
        "endpoints": {
            "/": "Main application",
            "/generate": "Generate AI resume content",
            "/generate-pdf": "Convert HTML to PDF",
            "/health": "Health check",
            "/api/info": "API information"
        }
    })

# Request/Response logging middleware
@app.before_request
def log_request_info():
    if ENVIRONMENT == 'development':
        logger.info(f"Request: {request.method} {request.url}")

@app.after_request
def log_response_info(response):
    if ENVIRONMENT == 'development':
        logger.info(f"Response: {response.status_code}")
    return response

if __name__ == '__main__':
    # Configuration based on environment
    if ENVIRONMENT == 'production':
        app.run(host='0.0.0.0', port=5000, debug=False)
    else:
        app.run(debug=True, host='0.0.0.0', port=5000)