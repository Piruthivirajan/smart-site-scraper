const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs/promises');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
let browser;

async function getBrowserInstance() {
    if (browser && browser.isConnected()) {
        console.log("Using existing browser instance");
        return browser;
    }
    
    console.log("Initializing new browser instance");
    if (browser) {
        await browser.close();
    }
    browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return browser;
}

async function fetchSearchResults(query) {
    const localBrowser = await getBrowserInstance();
    const page = await localBrowser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36');
        const safeQuery = query.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;');
        await page.goto(`https://duckduckgo.com/?q=${safeQuery}&t=h_&ia=web`);
        const rawHTML = await page.content();
        const $ = cheerio.load(rawHTML);
        const textContent = $('body').text(); 
        
        const urls = await page.evaluate(() => {
            // Target only organic result URLs using the specific data-testid attribute
            //const links = Array.from(document.querySelectorAll('li[data-layout="organic"] a[data-testid="result-extras-url-link"]'));
            //return links.map(link => link.href).slice(0, 3); // Extract href attributes of the first 3 links
            // Target only organic result URLs using the specific data-testid attribute
            const links = Array.from(document.querySelectorAll('li[data-layout="organic"] a[data-testid="result-extras-url-link"]'));
            // Filter out Wikipedia links and then take the first 3 links
             const filteredLinks = links.filter(link => !link.href.includes('wikipedia.org')).slice(0, 3);
             return filteredLinks.map(link => link.href); // Extract href attributes of the filtered links
          });
        await page.close();
        return { textContent, urls };
    }catch (error) {
        console.error(error);
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}

async function fetchPageContent(browser, url) {
   
    const localBrowser = await getBrowserInstance();
    const page = await localBrowser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2' });
        const rawHTML = await page.content();
        const $ = cheerio.load(rawHTML);
        const textContent = $('body').text();
        return  textContent ;
    } catch (error) {
        console.error('Error fetching page content:', error);
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}


async function callApi2(endpoint, data) {
    const response = await fetch(`http://localhost:5001/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
    }
    return await response.json();
}

app.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).send({ error: 'Missing query parameter' });
    }

    try {

        const { textContent, urls } = await fetchSearchResults(query);
        console.log(urls)
        const initialSummary = await callApi2('summarize', { text: textContent });
        console.log("fist one completed")
        
        const contents = await Promise.all(urls.map(url => fetchPageContent(browser, url)));
        const combinedText = contents.join(" ");
        const additionalSummaries = await callApi2('summarize', { text: combinedText });

        res.send({
            initialSummary: initialSummary.summary,
            additionalSummaries: additionalSummaries.summary
        });
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        res.status(500).send({ error: `An error occurred: ${error.message}` });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 8012;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGINT', async () => {
    console.log('Closing browser before shutdown');
    if (browser) await browser.close();
    process.exit();
});