const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const app = express();
const cors = require('cors');
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
        const textContent = $('body').text(); // Adjust the selector as needed
        
        return textContent; // Return extracted text content instead of raw HTML
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

app.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }

    try {
        const rawHTML = await fetchSearchResults(query);
        //res.setHeader('Content-disposition', 'attachment; filename=search_results.html');
        //res.set('Content-Type', 'text/html');
        //return res.send(rawHTML);
          // Execute callApi and callApi2 in parallel
          console.log(rawHTML)
          const [summary] = await Promise.all([
            //callApi('answer', {"context": rawHTML, "question": query}),
            callApi2('summarize', {text: rawHTML})
        ]);
        
        //console.log(answer);
        console.log(summary);
        console.log("------------------------")
        //return res.json(answer['answer']+", \n"+summary['summary'])
        return res.json(summary['summary'])
    } catch (error) {
        return res.status(500).json({ error: `An error occurred: ${error.message}` });
    }
});

const PORT = process.env.PORT || 8011;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});