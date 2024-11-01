from flask import Flask, request, jsonify
from transformers import pipeline, AutoModelForQuestionAnswering, AutoTokenizer

# Correct model identifier
#model_name = "allenai/longformer-large-4096-finetuned-triviaqa"

# Initialize the question-answering pipeline with the correct model
#qa_pipeline = pipeline("question-answering", model=model_name)
app = Flask(__name__)

# Initialize the question-answering pipeline
qa_pipeline = pipeline("question-answering", model="distilbert-base-uncased-distilled-squad")
#qa_pipeline = pipeline("question-answering", model="allenai/longformer-base-4096-finetuned-triviaqa")

@app.route('/answer', methods=['POST'])
def answer_question():
    # Extract question and context from the request
    data = request.json
    question = data.get('question')
    context = data.get('context')
    
    if not question or not context:
        return jsonify({"error": "Please provide both a question and a context."}), 400

    # Use the model to find the answer
    answer = qa_pipeline({
        'question': question,
        'context': context
    })

    # Return the answer
    # return jsonify({"answer": answer['answer']})
     # Return the answer and its score
    return jsonify({"answer": answer['answer'], "score": answer['score']})

if __name__ == '__main__':
    app.run(debug=True)
