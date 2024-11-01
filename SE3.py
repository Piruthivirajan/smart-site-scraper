import asyncio
from pyppeteer import launch
from bs4 import BeautifulSoup

async def fetch_page_html(url):
    browser = await launch()
    page = await browser.newPage()
    await page.goto(url)
    content = await page.content()
    await browser.close()
    return content

def extract_data(html):
    soup = BeautifulSoup(html, 'html.parser')
    # Example: Extract and return the page title
    title = soup.find('title').get_text()
    return title

async def main():
    query = "Python web scraping"
    url = f"https://duckduckgo.com/?q={query}&t=h_&ia=web"
    html = await fetch_page_html(url)
    
    # Depending on the HTML structure, this might need adjustment
    if "You are being redirected" in html:
        print("Encountered a JavaScript redirection.")
    else:
        data = extract_data(html)
        print(data)

if __name__ == '__main__':
    asyncio.get_event_loop().run_until_complete(main())
