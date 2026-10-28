import os
import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from google import genai
from google.genai import errors, types

from knowledge_base import FULL_PROMPT

MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
RETRYABLE = (429, 500, 502, 503, 504)
MAX_MESSAGE_CHARS = 1000      # per visitor message
MAX_TURNS_PER_SESSION = 40    # stops a single visitor from running up your quota
MAX_SESSIONS = 1000           # in-memory cap

# Key comes from the environment ONLY (never hard-code it):
#   Windows (PowerShell): $env:GEMINI_API_KEY="your-key"
#   macOS / Linux:        export GEMINI_API_KEY="your-key"
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    raise SystemExit("Set the GEMINI_API_KEY environment variable first.")

client = genai.Client(api_key=API_KEY)

CONFIG = types.GenerateContentConfig(
    system_instruction=FULL_PROMPT,
    temperature=0.4,
)

PORTFOLIO_DIR = Path(__file__).resolve().parent.parent
app = Flask(__name__)

# If the portfolio is hosted elsewhere (e.g. GitHub Pages), allow it to call this API.
# Set ALLOWED_ORIGINS="https://kerobassem.github.io" in production.
origins = os.environ.get("ALLOWED_ORIGINS", "*")
CORS(app, resources={r"/api/*": {"origins": origins.split(",")}})

# One Gemini chat per visitor session (in memory; resets on restart).
chats = {}


def get_chat(session_id):
    if session_id not in chats:
        if len(chats) >= MAX_SESSIONS:
            chats.pop(next(iter(chats)))
        chats[session_id] = {"chat": client.chats.create(model=MODEL, config=CONFIG), "turns": 0}
    return chats[session_id]


# Serve the portfolio files from the parent directory of this backend.
@app.get("/")
def index():
    return send_from_directory(PORTFOLIO_DIR, "index.html")


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(PORTFOLIO_DIR, path)


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    session_id = str(data.get("session_id") or "")[:100]

    if not message or not session_id:
        return jsonify(error="Message and session_id are required."), 400
    if len(message) > MAX_MESSAGE_CHARS:
        return jsonify(error=f"Message too long (max {MAX_MESSAGE_CHARS} characters)."), 400

    entry = get_chat(session_id)
    if entry["turns"] >= MAX_TURNS_PER_SESSION:
        return jsonify(error="Conversation limit reached. Please start a new chat."), 429

    for attempt in range(3):
        try:
            response = entry["chat"].send_message(message)
            entry["turns"] += 1
            return jsonify(reply=response.text or "Sorry, I couldn't generate a reply. Please try again.")
        except errors.APIError as e:
            if e.code in RETRYABLE:
                if attempt < 2:
                    time.sleep(2 * (attempt + 1))
                    continue
                return jsonify(error="The assistant is temporarily unavailable. Please try again later."), 503
            app.logger.error("Gemini API error: %s", e)
            return jsonify(error="Something went wrong on the server."), 502

    return jsonify(error="Something went wrong."), 500


@app.post("/api/reset")
def reset():
    data = request.get_json(silent=True) or {}
    chats.pop(str(data.get("session_id")), None)
    return jsonify(ok=True)


if __name__ == "__main__":
    app.run(port=5000)
