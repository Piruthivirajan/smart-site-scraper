from flask import Flask, request, jsonify
from transformers import T5Tokenizer, T5ForConditionalGeneration

app = Flask(__name__)

tokenizer = T5Tokenizer.from_pretrained("t5-small")
model = T5ForConditionalGeneration.from_pretrained("t5-small")

@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    text = data["text"]
    inputs = tokenizer.encode("summarize: " + text, return_tensors="pt", max_length=512, truncation=True)
    summary_ids = model.generate(inputs, max_length=150, min_length=40, length_penalty=2.0, num_beams=4, early_stopping=True)
    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return jsonify(summary=summary)

@app.route("/answer", methods=["POST"])
def answer():
    data = request.get_json()
    context = data["context"]
    question = data["question"]
    input_text = f"question: {question} context: {context}"
    inputs = tokenizer.encode(input_text, return_tensors="pt", max_length=512, truncation=True)
    answer_ids = model.generate(inputs, max_length=50, num_beams=4, early_stopping=True)
    answer = tokenizer.decode(answer_ids[0], skip_special_tokens=True)
    return jsonify(answer=answer)

if __name__ == "__main__":
    app.run(debug=True)
