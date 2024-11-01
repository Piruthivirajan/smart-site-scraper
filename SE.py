from flask import Flask, request, jsonify
from concurrent.futures import ProcessPoolExecutor
import asyncio
from pyppeteer import launch

app = Flask(__name__)
executor = ProcessPoolExecutor(max_workers=4)

async def fetch_search_results(query):
    browser = await launch()
    page = await browser.newPage()
    # Forming the DuckDuckGo search URL with the query
    await page.goto(f'https://duckduckgo.com/?q={query}&t=h_&ia=web')
    # Wait for the results to load
    await page.waitForSelector('.result__title', {'timeout': 90000})  # Increase timeout to 10000ms

    # Extract titles and URLs
    titles = await page.evaluate('''() => {
        const titles = Array.from(document.querySelectorAll('.result__title .result__a'));
        return titles.map(title => title.innerText);
    }''')
    
    

    urls = await page.evaluate('''() => {
        const urls = Array.from(document.querySelectorAll('.result__title .result__a'));
        return urls.map(url => url.href);
    }''')

    await browser.close()
    return [{'title': title, 'url': url} for title, url in zip(titles, urls)]

def run_async_code(query):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(fetch_search_results(query))
    loop.close()
    return result

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({'error': 'Missing query parameter'}), 400
    
    # Use executor to run the function in a separate process
    future = executor.submit(run_async_code, query)
    results = future.result()
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
