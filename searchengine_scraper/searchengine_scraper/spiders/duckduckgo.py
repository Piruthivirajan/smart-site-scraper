import scrapy

class DuckDuckGoSpider(scrapy.Spider):
    name = 'duckduckgo'
    allowed_domains = ['duckduckgo.com']
    
    def start_requests(self):
        query = getattr(self, 'query', None)
        if query is not None:
            url = f'https://duckduckgo.com/?q={query}&t=h_&ia=web'
            print(f"Constructed URL: {url}")
            yield scrapy.Request(url, self.parse)

    def parse(self, response):
        print(f"Downloaded response: {response.url}")
        for result in response.css('.result__title'):
            title = result.css('a.result__a::text').get()
            url = result.css('a.result__a::attr(href)').get()
            print(f"Extracted result: {title}, {url}")
            yield {
                'title': title,
                'url': url
            }
