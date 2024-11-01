
from transformers import BertTokenizerFast, BertForQuestionAnswering, TrainingArguments, Trainer
from datasets import Dataset, load_metric
import torch

# Dummy data - replace this with your actual dataset loading
data = [
    {"context": "Roche Products India Pvt Ltd", "question": "What is the marketer of Avastin 100mg Injection?", "answers": {"text": ["Roche Products India Pvt Ltd"], "answer_start": [0]}},
    # Add more records...
]
# Convert to Hugging Face Dataset
# Use first element as key, rest as data
data_dict = {k: [dic[k] for dic in data] for k in data[0]}
datasets = Dataset.from_dict(data_dict)


# Initialize the tokenizer
tokenizer = BertTokenizerFast.from_pretrained('bert-large-uncased-whole-word-masking')

# Function to tokenize the dataset and adjust answer positions
def tokenize_and_compute_answers(examples):
    tokenized_inputs = tokenizer(examples["question"], examples["context"], truncation=True, padding="max_length", max_length=512, return_offsets_mapping=True)
    offset_mapping = tokenized_inputs.pop("offset_mapping")

    start_positions = []
    end_positions = []

    for i, offsets in enumerate(offset_mapping):
        answer = examples["answers"][i]
        start_char = answer["answer_start"][0]
        end_char = start_char + len(answer["text"][0])

        sequence_ids = tokenized_inputs.sequence_ids(i)

        # Find start and end token index for the answer
        start_index = sequence_ids.index(1)  # skip the first one [CLS]
        end_index = len(sequence_ids) - sequence_ids[::-1].index(1) - 1  # skip the last one [SEP]

        for idx, (offset_start, offset_end) in enumerate(offsets):
            if (start_char >= offset_start) and (start_char < offset_end):
                start_index = idx
            if (end_char > offset_start) and (end_char <= offset_end):
                end_index = idx
                break

        start_positions.append(start_index)
        end_positions.append(end_index)

    tokenized_inputs["start_positions"] = start_positions
    tokenized_inputs["end_positions"] = end_positions
    return tokenized_inputs

# Tokenize the dataset
tokenized_datasets = datasets.map(tokenize_and_compute_answers, batched=True, remove_columns=datasets.column_names)

# Load the model
model = BertForQuestionAnswering.from_pretrained('bert-large-uncased-whole-word-masking')

# Training arguments
training_args = TrainingArguments(
    
    output_dir='./results/my_fine_tuned_bert',
    evaluation_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=8,
    num_train_epochs=3,
    weight_decay=0.01,
)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets,
    # eval_dataset=tokenized_eval_dataset,  # Add your evaluation dataset if you have one
)

# Train the model
trainer.train()
