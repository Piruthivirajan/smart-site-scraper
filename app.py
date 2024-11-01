from flask import Flask, request, jsonify
import subprocess
import os
import json

app = Flask(__name__)

@app.route('/search')
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({'error': 'Query parameter is missing'}), 400
    
    # Path to the Scrapy project directory
    scrapy_project_path = 'searchengine_scraper/searchengine_scraper'
    results_file_path = os.path.join(scrapy_project_path, 'results.json')
    
    # Change the directory to the Scrapy project directory
    os.chdir(os.path.join(os.getcwd(), scrapy_project_path))
    
    # Run Scrapy spider and output results to 'results.json'
    subprocess.run(['scrapy', 'crawl', 'duckduckgo', '-a', f'query={query}', '-o', results_file_path], check=True)
    
    # Change back to the original directory
    os.chdir('../../')
    
    # Check if 'results.json' was successfully created
    if os.path.exists(results_file_path):
        with open(results_file_path) as f:
            data = json.load(f)
            return jsonify(data)
    else:
        return jsonify({'error': 'Failed to run the scraper or no results found.'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
