const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const app = express();
const cors = require('cors');
const fs = require('fs/promises');

// Use cors middleware
app.use(cors());
// Dynamically import node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


async function fetchSearchResults(query) {
    //const browser = await puppeteer.launch();
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
    const page = await browser.newPage();
    
    try {
        // Set a custom User-Agent header
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36');
        
        // Sanitize user input before constructing the URL
        const safeQuery = query.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;');
        await page.goto(`https://duckduckgo.com/?q=${safeQuery}&t=h_&ia=web`);
        
        // Get the raw HTML content of the page
        const rawHTML = await page.content();
        
        //return rawHTML;
        // Use cheerio to parse the HTML
        const $ = cheerio.load(rawHTML);
        //console.log(rawHTML)
        const textContent = $('body').text(); // Adjust the selector as needed
        // Assuming search results URLs can be found in a specific selector
        const urls = await page.evaluate(() => {
            // Target only organic result URLs using the specific data-testid attribute
            const links = Array.from(document.querySelectorAll('li[data-layout="organic"] a[data-testid="result-extras-url-link"]'));
            return links.map(link => link.href).slice(0, 3); // Extract href attributes of the first 3 links
          });
          
        console.log(urls)
        return { textContent, urls }; // Return both content and URLs
    } finally {
        await browser.close();
    }
}
async function fetchPageContent(url) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        const rawHTML = await page.content();
        
        const $ = cheerio.load(rawHTML);
        //console.log(rawHTML)
        const textContent = $('body').text(); // Adjust the selector as needed
        
        return {textContent} // Return both content and URLs
    } catch (error) {
        console.error('Error fetching page content:', error);
    } finally {
        await browser.close();
    }
}

async function callApi(endpoint, data) {
    const response = await fetch(`http://localhost:5000/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data), // Ensure the data argument is structured correctly
    });
    if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
    }
    return await response.json();
}

async function callApi2(endpoint, data) {
    const response = await fetch(`http://localhost:5001/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data), // Ensure the data argument is structured correctly
    });
    if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
    }
    return await response.json();
}
/*
app.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }

    try {
        const { textContent, urls } = await fetchSearchResults(query);
        // Summarize initial search result content
        const initialSummary = await callApi2('summarize', { text: textContent });

        // Scrape additional pages in parallel and summarize
        const additionalContents = await Promise.all(urls.map(url => fetchPageContent(url))); // Implement fetchPageContent

        const combinedText = additionalContents.map(item => item.textContent).join(" ");
        const additionalSummaries = await callApi2('summarize', { text: combinedText });

        console.log("additionalSummaries:"+ additionalSummaries.summary)

        return res.json({initialSummary:initialSummary.summary, additionalSummaries:additionalSummaries.summary });
    } catch (error) {
        return res.status(500).json({ error: `An error occurred: ${error.message}` });
    }
});
*/
/*
async function processUrls(urls, res,SummarytextContent) {
    let combinedText = SummarytextContent;
    for (let index = 0; index < urls.length; index++) {
        const url = urls[index];
        const { textContent } = await fetchPageContent(url);
        combinedText += textContent + " "; // Concatenate text content for combined summary
        console.log(index + " index");
        /*const filename = `textContent-${index}.json`;

        // Create an object to be written as JSON
        const dataToWrite = {
            url: url,
            content: textContent
        };
        try {
            // Use fs.writeFile to asynchronously write the JSON file
            await fs.writeFile(filename, JSON.stringify(dataToWrite, null, 2), 'utf8');
            console.log(`File written successfully: ${filename}`);
        } catch (error) {
            console.error(`Error writing file ${filename}:`, error);
        }
        
    }

    // After all URLs have been processed, call your API
    callApi2('summarize', { text: combinedText }).then(additionalSummaries => {
        console.log(additionalSummaries.summary);
        res.write(`data: ${JSON.stringify({ type: 'additionalSummaries', summary: additionalSummaries.summary })}\n\n`);
        res.end(); // Close the stream after the last summary
        console.log(new Date()+" Second one completed")
    });
}
*/
async function processUrls(urls, res, initialSummaryText) {
    let combinedText = initialSummaryText;

    // Start all fetches in parallel and handle them as soon as each completes
    const fetchPromises = urls.map((url, index) => fetchPageContent(url).then(({ textContent }) => {
        combinedText += textContent + " ";
    }));

    // Wait for all fetches (and their processing) to complete
    Promise.all(fetchPromises).then(() => {
        callApi2('summarize', { text: combinedText }).then(additionalSummaries => {
            console.log(additionalSummaries.summary);
            res.write(`data: ${JSON.stringify({ type: 'additionalSummaries', summary: additionalSummaries.summary })}\n\n`);
            res.end(); // Close the stream after the last summary
            console.log(new Date() + " Second one completed");
        });
    }).catch(error => {
        console.error(`An error occurred during processing URLs: ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: `An error occurred: ${error.message}` })}\n\n`);
        res.end();
    });
}


app.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }

    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    try {
        const { textContent, urls } = await fetchSearchResults(query);
        // Summarize initial search result conten
        let fistData = await callApi2('summarize', { text: textContent })
        // callApi2('summarize', { text: textContent }).then(initialSummary => {
        //     res.write(`data: ${JSON.stringify({ type: 'initialSummary', summary: initialSummary.summary })}\n\n`);
        //     console.log(new Date()+" First one completed")
        // });
        console.log(fistData)
        processUrls(urls, res,fistData.summary);

    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: `An error occurred: ${error.message}` })}\n\n`);
        res.end();
    }
});

const PORT = process.env.PORT || 8011;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});