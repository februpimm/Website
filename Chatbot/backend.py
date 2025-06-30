from flask import Flask, request, jsonify
from flask_cors import CORS
from query import BasicChatBot
from dotenv import load_dotenv
import os

app = Flask(__name__)
CORS(app)
load_dotenv(".env")

chatbot = None
chatbot = BasicChatBot()

@app.route('/ask', methods=['POST'])
def ask():
    if chatbot is None:
        return jsonify({"error": "Chatbot is not available."}), 503

    data = request.get_json()
    if not data or 'question' not in data or not data['question']:
        return jsonify({"error": "Question is missing or empty."}), 400

    try:
        question = data['question']
        answer = chatbot.get_answer(question)
        return jsonify({"answer": answer})
    except Exception:
        return jsonify({"error": "An error occurred while processing your question."}), 500

@app.route('/')
def mainPage():
    return "Backend server is running."

if __name__ == "__main__":
    app.run(debug=True, port=3000)