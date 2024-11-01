from flask import Flask, request, jsonify
from transformers import pipeline
import logging
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit
# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Load the summarizer model
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

def chunk_text(text, max_chunk_size=512):
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    for word in words:
        if current_length + len(word) + 1 > max_chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
            current_length += len(word) + 1
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

@app.route('/summarize', methods=['POST'])
def summarize_text():
    data = request.json
    text = data.get('text', '')  # Use .get to avoid KeyError if text is missing
    if not text:
        logging.error("No text provided for summarization.")
        return jsonify({"error": "No text provided"}), 400

    
    # For very large texts, consider processing them in a background task
    # Here, for simplicity, we continue to process synchronously
    text_chunks = chunk_text(text, max_chunk_size=1000)
    summaries = []
    
    for chunk in text_chunks:
        try:
            summary = summarizer(chunk, max_length=130, min_length=30, do_sample=False)[0]['summary_text']
            summaries.append(summary)
        except Exception as e:
            logging.error(f"Error processing chunk: {e}")
            summaries.append(f"Error processing chunk: {e}")

    final_summary = " ".join(summaries)

    # Log the final summary before returning it
    logging.info(f"Final Summary: {final_summary}")

    return jsonify({"summary": final_summary})

if __name__ == '__main__':
    app.run(debug=True)
