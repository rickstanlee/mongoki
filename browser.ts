import * as puppeteer from 'puppeteer';

export let browser: puppeteer.Browser | null = null;

export async function initBrowser(): Promise<void> {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}

export async function closeBrowser(): Promise<void> {
    if (browser !== null) {
        await browser.close();
    }
}

// Function to perform Google search using the query in the URL
export async function googleSearchLinks(query: string): Promise<{ title: string, link: string, snippet: string }[]> {
    if (!browser) {
        throw new Error('Browser not initialized');
    }

    const page = await browser.newPage();
    try {
        // Encode the query and construct the URL
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await page.goto(url);

        // Wait for the search results to be loaded
        await page.waitForSelector('div.g', { visible: true });

        const results = await page.evaluate(() => {
            let items: { title: string, link: string, snippet: string }[] = [];
            document.querySelectorAll('div.g').forEach(item => {
                const title = item.querySelector('h3') ? (item.querySelector('h3') as HTMLElement).innerText : '';
                const link = item.querySelector('a') ? (item.querySelector('a') as HTMLAnchorElement).href : '';
                const snippet = item.querySelector('span.aCOpRe') ? (item.querySelector('span.aCOpRe') as HTMLElement).innerText : '';
                items.push({ title, link, snippet });
            });
            return items;
        });

        return results;
    } finally {
        await page.close();
    }
}

// Function to extract detailed textual content from Google search results
export async function googleSearchExtractInfo(query: string): Promise<string[]> {
    if (!browser) {
        throw new Error('Browser not initialized');
    }

    const page = await browser.newPage();
    try {
        // Encode the query and construct the URL
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await page.goto(url);

        // Wait for the search results to be loaded
        await page.waitForSelector('div.g', { visible: true });

        // Evaluate the page to extract texts from key elements
        const infoTexts = await page.evaluate(() => {
            const texts = [];
            // Extract text from search result titles and snippets
            document.querySelectorAll('div.g').forEach(item => {
                const title = item.querySelector('h3') ? item.querySelector('h3').innerText : '';
                const snippet = item.querySelector('span.aCOpRe') ? (item.querySelector('span.aCOpRe') as HTMLElement).innerText : '';
                if (title) texts.push(title);
                if (snippet) texts.push(snippet);
            });

            // Extract text from other potential informative elements
            document.querySelectorAll('.obcontainer').forEach((kp: HTMLElement) => {
                const kpText = kp.innerText; // Grabs all text within the knowledge panel
                if (kpText) texts.push(kpText);
            });
            return texts;
        });

        return infoTexts;
    } finally {
        await page.close();
    }
}

// Function to extract detailed textual content from Google search results
export async function googleSearchWholeText(query: string): Promise<string> {
    if (!browser) {
        throw new Error('Browser not initialized');
    }

    const page = await browser.newPage();
    try {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await page.goto(url);

        try{
            await page.waitForSelector('.QS5gu.sy4vM', { visible: true , timeout: 5000});
            await page.click('.QS5gu.sy4vM');
        }catch(error){}

        await page.waitForSelector('div.g', { visible: true });
        const websiteText = await page.evaluate(() => document.documentElement.innerText);

        return websiteText;
    } finally {
        await page.close();
    }
}


async function test(){
    await initBrowser()
    let loSearchResult = await googleSearchWholeText("Wetter Sigmaringen heute")
    console.log(JSON.stringify(loSearchResult))
}
