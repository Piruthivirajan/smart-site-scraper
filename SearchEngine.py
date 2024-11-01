from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query')  # Get search query from URL parameters
    if not query:
        return jsonify({'error': 'Missing query parameter'}), 400

    # Replace spaces with "+" for the URL
    formatted_query = '+'.join(query.split())
    # Ensure the URL is correctly targeting the search page
    url = f'https://html.duckduckgo.com/html/?q={formatted_query}'
    headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
    response = requests.get(url, headers=headers)
    print("Status Code:", response.status_code)
    print(response.text[:500])  # Print the first 500 characters of the response

    soup = BeautifulSoup(response.content, 'html.parser')

    results = []
    # Check if the class names have changed on DuckDuckGo's results page
    for result in soup.find_all('div', class_='result__body'):
        title_element = result.find('h2', class_='result__title')
        if title_element:
            title = title_element.text.strip()
            link = result.find('a', class_='result__url')['href']
            snippet = result.find('a', class_='result__snippet').text.strip() if result.find('a', class_='result__snippet') else "No snippet available"
            results.append({'title': title, 'url': link, 'snippet': snippet})

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
