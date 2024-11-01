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
        headless: false, // Run browser in headful mode
        slowMo: 50, // Slow down operations by 50ms to better observe interactions
        devtools: true,
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
        $('script, style').remove();
       /* $('*').contents().filter(function() { return this.type === 'comment'; }).remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('form').remove();
        $('[class*="ad"], [id*="ad"]').remove(); // Example selector, might need adjustment
        $('.sidebar, aside').remove();
        $('.modal, .popup').remove();
        $('.social, .share').remove();
        $('iframe').remove();*/
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
       /* const filename = `textContent-00.json`;
    
        const dataToWrite = {
        
            content: textContent
        };
        try {
            // Use fs.writeFile to asynchronously write the JSON file
            await fs.writeFile(filename, JSON.stringify(dataToWrite, null, 2), 'utf8');
            console.log(`File written successfully: ${filename}`);
        } catch (error) {
            console.error(`Error writing file ${filename}:`, error);
        }
        */
        return { textContent, urls };
    }catch (error) {
        console.error(error);
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}
async function perplexity(query) {
    const localBrowser = await getBrowserInstance();
    const page = await localBrowser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36');
        await page.setCookie({
            domain: 'www.perplexity.ai',
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'Lax', // Use 'None' for cross-site cookies and set 'secure: true'.
          });
        
        await page.goto('https://www.perplexity.ai', { waitUntil: 'networkidle2' });
        

         // Wait for the textarea to be available
         await page.waitForSelector('textarea[placeholder="Ask anything..."]', { visible: true });
      
        
         // Type the query into the textarea

         //await page.evaluate(() => document.activeElement.blur());
         //const isFocused = await page.evaluate(selector => document.activeElement === document.querySelector(selector), 'textarea[placeholder="Ask anything..."]');
         await page.evaluate(() => {
            const textarea = document.querySelector('textarea[placeholder="Ask anything..."]');
            // Set value
            const newValue = 'what is java';
            textarea.value = newValue;
        
            // Create and dispatch an 'input' event for frameworks that rely on it
            const event = new Event('input', { bubbles: true });
            // Optionally, add more properties to the event object if the web app checks them
            // event.simulated = true; // Example, if needed
            textarea.dispatchEvent(event);
            
            // If the application uses React, Vue, or similar frameworks, you might need to trigger additional events
            // or use specific techniques to ensure the change is detected.
        });
        
        
        


    //     if (!isFocused) {
        //    await page.focus('textarea[placeholder="Ask anything..."]');
      //  }

        // await page.keyboard.type(query);
 
         await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const rawHTML = await page.content();
        const $ = cheerio.load(rawHTML);
        $('script, style').remove();
        const textContent = $('body').text(); 
        console.log(textContent)

        await page.close();
        return { textContent };
    } catch (error) {
        console.error(error);
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}

var index=0
async function fetchPageContent( url) {
   
    const localBrowser = await getBrowserInstance();
    const page = await localBrowser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2' });
        const rawHTML = await page.content();
        const $ = cheerio.load(rawHTML);
        $('script, style').remove();
       /* $('*').contents().filter(function() { return this.type === 'comment'; }).remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('form').remove();
        $('[class*="ad"], [id*="ad"]').remove(); // Example selector, might need adjustment
        $('.sidebar, aside').remove();
        $('.modal, .popup').remove();
        $('.social, .share').remove();
        $('iframe').remove();
        */
        const textContent = $('body').text();
        /*
        const filename = `textContent-${index}.json`;
        index++;
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

        */
        return  {textContent} ;
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
        

        const { PtextContent } = await perplexity(query);
        return;
        const { textContent, urls } = await fetchSearchResults(query);
        console.log(urls)
        const initialSummary = await callApi2('summarize', { text: textContent });
        console.log("fist one completed")
        
        //const contents = await Promise.all(urls.map(url => fetchPageContent( url)));
        //const combinedText = contents.join(" ");
        //const additionalSummaries = await callApi2('summarize', { text: contents });
        //let combinedText = initialSummary.summary;

        // Start all fetches in parallel and handle them as soon as each completes
        //const fetchPromises = urls.map(url => fetchPageContent(url));

        let combinedText =  " ";

        // Fetch page content sequentially using a for loop
        for (let i = 0; i < urls.length; i++) {
            const { textContent } = await fetchPageContent(urls[i]);
            const sum = await callApi2('summarize', { text: textContent });
            console.log("sum")
            console.log(sum)
            combinedText += sum.summary + " "; // Append each page's content
        }
        const finalSummary = await callApi2('summarize', { text: combinedText });

        res.send({
            initialSummary: initialSummary.summary,
            additionalSummaries: finalSummary.summary
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