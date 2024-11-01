from flask import Flask, request, jsonify
from pyppeteer import launch
import asyncio


app = Flask(__name__)

async def fetch_search_results(query):
    browser = await launch()
    page = await browser.newPage()
    
    try:
        # Sanitize user input before constructing the URL
        safe_query = query.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
        await page.goto(f'https://duckduckgo.com/?q={safe_query}&t=h_&ia=web')
        
        # Wait for the results to load with a reasonable timeout
        await page.waitForSelector('.result__title', timeout=10000)  # 10 seconds timeout
        
        # Extract titles and URLs
        titles = await page.evaluate('''() => {
            const titles = Array.from(document.querySelectorAll('.result__title .result__a'));
            return titles.map(title => title.innerText);
        }''')
        urls = await page.evaluate('''() => {
            const urls = Array.from(document.querySelectorAll('.result__title .result__a'));
            return urls.map(url => url.href);
        }''')
        
        return [{'title': title, 'url': url} for title, url in zip(titles, urls)]

    except Exception as e:
        # Handle specific exceptions (optional)
        if isinstance(e, asyncio.TimeoutError):
            return {'error': 'Search timed out'}
        # ...

        # Generic error message
        return {'error': f'An error occurred: {str(e)}'}

    
    finally:
        await browser.close()

@app.route('/search', methods=['GET'])
async def search_route():
    query = request.args.get('query')
    if not query:
        return jsonify({'error': 'Missing query parameter'}), 400

    # Use await directly within the route
    try:
        results = await fetch_search_results(query)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
