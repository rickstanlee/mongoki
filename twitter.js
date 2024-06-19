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
exports.TwitterBot = void 0;
const browser = __importStar(require("./browser"));
const bt = __importStar(require("./basictools"));
const ai = __importStar(require("./aitools"));
class TwitterBot {
    credentials;
    browser;
    page;
    name;
    type;
    status;
    loops;
    log;
    constructor(credentials) {
        this.credentials = credentials;
        this.browser = null;
        this.page = null;
        this.name = `Twitter Bot ${credentials.userhandle}`;
        this.type = "Twitter";
        this.status = "status";
        this.loops = [];
        this.log = [];
        this.initialize();
    }
    async initialize() {
        this.browser = browser.browser;
        this.page = await this.browser.newPage();
    }
    async login() {
        const { username, password, userhandle } = this.credentials;
        try {
            await this.page.goto('https://x.com/i/flow/login', { waitUntil: 'networkidle2' });
            await this.page.waitForSelector('input[name="text"]', { visible: true });
            await this.page.type('input[name="text"]', username, { delay: 100 });
            const nextButtonSelector = 'button[role="button"][class*="r-1qi8awa"][style*="background-color: rgb(239, 243, 244);"]';
            await this.page.waitForSelector(nextButtonSelector);
            await this.page.click(nextButtonSelector);
            // Check if a user handle input field appears
            try {
                await this.page.waitForSelector('input[name="text"][data-testid="ocfEnterTextTextInput"]', { visible: true, timeout: 5000 }); // Short timeout for quick check
                await this.page.type('input[name="text"]', userhandle, { delay: 100 });
                await this.page.keyboard.press('Enter');
            }
            catch (error) {
                console.log("ERROR: " + error.message);
                console.log("No user handle input required, proceeding with password.");
            }
            await this.page.waitForSelector('input[name="password"]', { visible: true });
            await this.page.type('input[name="password"]', password, { delay: 100 });
            await this.page.keyboard.press('Enter');
            console.log("Login successful, proceed to tweet or further actions");
            await bt.delay(5000);
            try {
                await this.page.waitForSelector('button.css-175oi2r', { visible: true });
                await this.page.click('button.css-175oi2r');
                console.log("COOKiES SUCCESSFULLY HANDLED");
            }
            catch (error) {
                console.log(`ERROR HANDLING COOKIES: ${error.message}`);
            }
        }
        catch (err) {
            console.error('Login failed:', err);
            throw err;
        }
    }
    async searchLatest(searchText, tweetCount = 10) {
        const encodedSearchText = encodeURIComponent(searchText);
        const url = `https://x.com/search?q=${encodedSearchText}&src=typed_query&f=live`;
        try {
            await this.page.goto(url, { waitUntil: 'networkidle2' });
            console.log(`Navigated to search page with query: ${searchText}`);
            await this.page.waitForSelector('article[data-testid="tweet"]');
            let tweets = new Map(); // Use a Map to store tweets by tweetId to avoid duplicates
            while (tweets.size < tweetCount) {
                // Scroll down in increments to load new tweets
                await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await bt.delay(2000); // Wait for tweets to load
                const newTweets = await this.page.evaluate(() => {
                    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
                    return Array.from(tweetElements).map(el => {
                        const statusLink = el.querySelector('a[href*="/status/"]');
                        const tweetId = statusLink ? statusLink.href.split('/').pop() : 'ID not found';
                        const tweetText = el.querySelector('[data-testid="tweetText"]').innerText;
                        const userName = el.querySelector('[data-testid="User-Name"] div').innerText;
                        const userHandleLink = el.querySelector('a[href^="/"][role="link"]');
                        const userHandle = userHandleLink ? userHandleLink.href.split('/').pop() : 'Handle not found';
                        const tweetTime = el.querySelector('time').getAttribute('datetime');
                        return { tweetId, tweetText, userName, userHandle, tweetTime };
                    });
                });
                // Filter tweets for cryptocurrency content and check for duplicates
                for (const tweet of newTweets) {
                    if (!tweets.has(tweet.tweetId) && await ai.decideIfCrypto(tweet.tweetText)) {
                        tweets.set(tweet.tweetId, tweet);
                        if (tweets.size >= tweetCount)
                            break;
                    }
                }
                // Break if no new crypto-related tweets are found in the last scroll
                if (newTweets.length === 0 || tweets.size >= tweetCount) {
                    console.log("No more relevant tweets to load or required count reached.");
                    break;
                }
            }
            console.log(tweets);
            // Convert Map values to array to return
            return Array.from(tweets.values()).slice(0, tweetCount);
        }
        catch (error) {
            console.error('Error navigating to search page or extracting data:', error);
            throw error;
        }
    }
    async openTweet(userName, tweetId) {
        console.log(`Opening tweet from ${userName} with ID ${tweetId}`);
        const tweetUrl = `https://twitter.com/${userName}/status/${tweetId}`;
        const page = await this.browser.newPage();
        await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
        console.log(`Tweet is opened: ${tweetUrl}`);
        return page;
    }
    async commentTweet(tweet, promptType) {
        let page;
        try {
            console.log(`Start Comment tweet from ${tweet.userName} with ID ${tweet.tweetId}`);
            const tweetUrl = `https://twitter.com/${tweet.userHandle}/status/${tweet.tweetId}`;
            page = await this.browser.newPage();
            await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
            console.log(`Tweet is opened: ${tweetUrl}`);
            let prompt = "";
            if (promptType === "hype-realdaddy") {
                let aspect = Math.floor(Math.random() * 5); // Adjust the range based on how many aspects you have
                const aspects = [
                    `Mention the CA please and focus on the potential for quick growth, since Marketcap is only 2.5k and supply is mostly pooled.`,
                    `Mention the CA please and Emphasis the power and importance of real father figures.`,
                    `Mention the CA please and make clear this may be the next 1000X Coin on Solana`,
                    `Mention the CA please and Emphasis the high potential, due to most tokens pooled its low marketcap of only 2.5k at the moment`
                ];
                let chosenAspect = aspects[aspect];
                prompt = `You are an amazing AI that helps to boost the Crypto Token $Realdaddy from the Solana Blockchain on Twitter.
                    The CA is "FxQoVn7C9SrGAWjYFR8hxCfDKE3bYtT4Rb23kZcKoY2S". The Ticker is $REALDADDY.
                    Your task is to create a very short but engaging text to comment on this tweet on X.com. 
                    ${chosenAspect}
    
                    Be cautious and make the text appear like it was written by a normal Twitter User and not an AI please!
                    Dont make it too cheesy, keep it classy and professional.
                    The Tweet we need an answer to is: ${tweet.tweetText} 
                    `;
            }
            let answer = await ai.prompt(prompt);
            console.log(`AI COMMENT: ${answer}`);
            await page.waitForSelector('[data-testid="tweetTextarea_0"]');
            await page.click('[data-testid="tweetTextarea_0"]');
            await page.keyboard.type(answer, { delay: 50 });
            await page.keyboard.down('Control');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Control');
            console.log(`SUCCESSFULLY COMMENTED ON TWEET: ${JSON.stringify(tweet)}`);
            console.log(`COMMENT: ${answer}`);
            await bt.delay(5000);
        }
        catch (error) {
            console.log(`ERROR COMMENTING ON ${tweet.tweetText}: ${error.message}`);
        }
        finally {
            if (page) {
                try {
                    await page.close();
                    console.log(`Page closed successfully`);
                }
                catch (error) {
                    console.log(`Error closing page: ${error.message}`);
                }
            }
        }
    }
    async tweet(message) {
        try {
            await this.page.waitForSelector('div[contenteditable="true"]', { visible: true });
            await this.page.click('div[contenteditable="true"]');
            await this.page.keyboard.type(message, { delay: 50 });
            await bt.delay(1000);
            await this.page.waitForSelector('[data-testid="tweetButtonInline"]', { visible: true });
            await this.page.click('[data-testid="tweetButtonInline"]');
            console.log("Tweet sent successfully!");
        }
        catch (err) {
            console.error('Failed to send tweet:', err);
            throw err;
        }
    }
    async close() {
        await this.browser.close();
    }
}
exports.TwitterBot = TwitterBot;
