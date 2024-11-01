const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const app = express();
const cors = require('cors');
// Use cors middleware
app.use(cors());
// Dynamically import node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
app.use(express.json());


async function fetchFirstProductData(query) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    
    try {
        const safeQuery = encodeURIComponent(query);
        await page.goto(`https://www.1mg.com/search/all?filter=true&name=${safeQuery}`);
        
        // Wait for the product list to be loaded
        await page.waitForSelector('.style__grid-container___3OfcL');

        // Extract the first product URL
        const firstProductUrl = await page.evaluate(() => {
            const anchor = document.querySelector('.style__grid-container___3OfcL .style__container___cTDz0 .style__horizontal-card___1Zwmt a');
            return anchor ? anchor.href : null;
        });

        if (!firstProductUrl) {
            console.log("Product URL not found");
            return null;
        }
        console.log("First Product linke----------------")
        console.log(firstProductUrl)

        // Navigate to the first product page
        await page.goto(firstProductUrl, {waitUntil: 'networkidle0'});
        const sectionData = await page.evaluate(() => {
            const section = document.querySelector('#drug-main-header');
            return section ? section.innerText : null; // or use .innerHTML if you need the HTML content
        });

        return sectionData;
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

app.post('/search', async (req, res) => {
    console.log(req.body)
    const query = req.body.query;
    const previousQuestion = req.body.rawHTML;
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }
    try {
        var rawHTML;
        if(!previousQuestion){
            rawHTML = await fetchFirstProductData(query);
            console.log(rawHTML)
            const [summary] = await Promise.all([
                //callApi('answer', {"context": rawHTML, "question": query}),
                callApi2('summarize', {text: rawHTML})
            ]);

          return res.json({summary:summary['summary'],rawHTML:rawHTML})
          
        }else{
        
        const [answer] = await Promise.all([
            callApi('answer', {"context": previousQuestion, "question": query}),
        ]);

        console.log("------------------------")
        return res.json(answer['answer'])
        }
    } catch (error) {
        return res.status(500).json({ error: `An error occurred: ${error.message}` });
    }
});

const PORT = process.env.PORT || 8012;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});