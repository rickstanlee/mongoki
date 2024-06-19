"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSearchWholeText = exports.googleSearchExtractInfo = exports.googleSearchLinks = exports.closeBrowser = exports.initBrowser = exports.browser = void 0;
const puppeteer = __importStar(require("puppeteer"));
exports.browser = null;
async function initBrowser() {
    exports.browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}
exports.initBrowser = initBrowser;
async function closeBrowser() {
    if (exports.browser !== null) {
        await exports.browser.close();
    }
}
exports.closeBrowser = closeBrowser;
// Function to perform Google search using the query in the URL
async function googleSearchLinks(query) {
    if (!exports.browser) {
        throw new Error('Browser not initialized');
    }
    const page = await exports.browser.newPage();
    try {
        // Encode the query and construct the URL
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await page.goto(url);
        // Wait for the search results to be loaded
        await page.waitForSelector('div.g', { visible: true });
        const results = await page.evaluate(() => {
            let items = [];
            document.querySelectorAll('div.g').forEach(item => {
                const title = item.querySelector('h3') ? item.querySelector('h3').innerText : '';
                const link = item.querySelector('a') ? item.querySelector('a').href : '';
                const snippet = item.querySelector('span.aCOpRe') ? item.querySelector('span.aCOpRe').innerText : '';
                items.push({ title, link, snippet });
            });
            return items;
        });
        return results;
    }
    finally {
        await page.close();
    }
}
exports.googleSearchLinks = googleSearchLinks;
// Function to extract detailed textual content from Google search results
async function googleSearchExtractInfo(query) {
    if (!exports.browser) {
        throw new Error('Browser not initialized');
    }
    const page = await exports.browser.newPage();
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
                const snippet = item.querySelector('span.aCOpRe') ? item.querySelector('span.aCOpRe').innerText : '';
                if (title)
                    texts.push(title);
                if (snippet)
                    texts.push(snippet);
            });
            // Extract text from other potential informative elements
            document.querySelectorAll('.obcontainer').forEach((kp) => {
                const kpText = kp.innerText; // Grabs all text within the knowledge panel
                if (kpText)
                    texts.push(kpText);
            });
            return texts;
        });
        return infoTexts;
    }
    finally {
        await page.close();
    }
}
exports.googleSearchExtractInfo = googleSearchExtractInfo;
// Function to extract detailed textual content from Google search results
async function googleSearchWholeText(query) {
    if (!exports.browser) {
        throw new Error('Browser not initialized');
    }
    const page = await exports.browser.newPage();
    try {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await page.goto(url);
        try {
            await page.waitForSelector('.QS5gu.sy4vM', { visible: true, timeout: 5000 });
            await page.click('.QS5gu.sy4vM');
        }
        catch (error) { }
        await page.waitForSelector('div.g', { visible: true });
        const websiteText = await page.evaluate(() => document.documentElement.innerText);
        return websiteText;
    }
    finally {
        await page.close();
    }
}
exports.googleSearchWholeText = googleSearchWholeText;
async function test() {
    await initBrowser();
    let loSearchResult = await googleSearchWholeText("Wetter Sigmaringen heute");
    console.log(JSON.stringify(loSearchResult));
}
