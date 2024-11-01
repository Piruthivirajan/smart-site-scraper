from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

app = Flask(__name__)

# Initialize the tokenizer and model
tokenizer = AutoTokenizer.from_pretrained("sshleifer/distilbart-cnn-12-6")
model = AutoModelForSeq2SeqLM.from_pretrained("sshleifer/distilbart-cnn-12-6")

# Create summarization pipeline
summarizer = pipeline("summarization", model=model, tokenizer=tokenizer, framework="pt")

@app.route('/summarize', methods=['POST'])
def summarize_text():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided for summarization'}), 400

    try:
        # Ensure the text is truncated to the model's max input size
        inputs = tokenizer(data['text'], return_tensors="pt", truncation=True, max_length=1024)
        #inputs = tokenizer([item['textContent'] for item in data] if isinstance(data, list) else data['textContent'], return_tensors="pt", truncation=True, max_length=1024)
        summary_ids = model.generate(inputs['input_ids'], num_beams=4, max_length=150, early_stopping=True)
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return jsonify({'summary': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
