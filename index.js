import axios from 'axios';
import { chromium } from 'playwright';
import fs from 'fs';
import logUpdate from 'log-update';
import chalk from 'chalk';
import ora from 'ora';

// Read account credentials from account.json
const account = JSON.parse(fs.readFileSync('account.json', 'utf-8'));

let bearerToken;
let lastVerifiedDate;
let stork_signed_prices_valid_count = 0;
let stork_signed_prices_invalid_count = 0;
let validationResponseMessage = '';
let email = '';
let id = '';

// Create a spinner for animation
const spinner = ora('Loading...').start();

// Function to log in and get a new bearer token
const loginAndGetToken = async () => {
    const browser = await chromium.launch({ headless: true }); // Set headless: true for VPS
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the login page
    await page.goto('https://app.stork.network/login?redirect_uri=https://knnliglhgkmlblppdejchidfihjnockl.chromiumapp.org/');

    // Fill in the login form using credentials from account.json
    await page.fill('input[name="username"]', account.email);
    await page.fill('input[name="password"]', account.password);
    await page.click('button[type="submit"]');

    // Wait for login to complete and the token to be stored in the extension storage
    await page.waitForTimeout(5000); // Adjust the timeout as needed

    // Capture the extension storage (localStorage, sessionStorage, and cookies)
    const storageState = await context.storageState();
    fs.writeFileSync('tokens.json', JSON.stringify(storageState, null, 2));

    // Extract the Bearer token from the storage
    const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf-8'));

    // Look for the accessToken in all storage types
    const localStorageToken = tokens.origins[0]?.localStorage?.find(item =>
        item.name.includes('CognitoIdentityServiceProvider') && item.name.includes('accessToken')
    )?.value;

    const sessionStorageToken = tokens.origins[0]?.sessionStorage?.find(item =>
        item.name.includes('CognitoIdentityServiceProvider') && item.name.includes('accessToken')
    )?.value;

    const cookieToken = tokens.cookies?.find(cookie =>
        cookie.name.includes('CognitoIdentityServiceProvider') && cookie.name.includes('accessToken')
    )?.value;

    // Assign the first found token
    bearerToken = localStorageToken || sessionStorageToken || cookieToken;

    if (!bearerToken) {
        throw new Error('Access token not found in any storage type.');
    }

    // Save the token to a file for reuse
    fs.writeFileSync('bearerToken.json', JSON.stringify({ bearerToken }, null, 2));

    await browser.close();
};

// Function to check if the bearer token is expired
const isTokenExpired = (token) => {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        return Date.now() >= expirationTime;
    } catch (error) {
        console.error('Error decoding token:', error);
        return true; // Assume token is expired if there's an error
    }
};

// Function to fetch and validate prices
const fetchAndValidatePrices = async () => {
    try {
        // Check if the token is expired and refresh it if necessary
        if (!bearerToken || isTokenExpired(bearerToken)) {
            spinner.text = 'Token expired or not found. Logging in again...';
            await loginAndGetToken();
            spinner.succeed('Logged in successfully!');
        }

        // Fetch user data
        const userResponse = await axios.get('https://app-api.jp.stork-oracle.network/v1/me', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Accept': 'application/json',
            }
        });

        const { email: userEmail, id: userId, stats } = userResponse.data.data;
        email = userEmail;
        id = userId;
        stork_signed_prices_valid_count = stats.stork_signed_prices_valid_count;
        stork_signed_prices_invalid_count = stats.stork_signed_prices_invalid_count;

        // Convert timestamp to UTC+7 (Asia/Jakarta timezone)
        lastVerifiedDate = new Date(stats.stork_signed_prices_last_verified_at).toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta', // UTC+7
            hour12: false, // Use 24-hour format
        });

        // Fetch stork signed prices
        const pricesResponse = await axios.get('https://app-api.jp.stork-oracle.network/v1/stork_signed_prices', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Accept': 'application/json',
            }
        });

        // Extract the first asset key (e.g., ETHUSD)
        const assetKey = Object.keys(pricesResponse.data.data)[0];
        if (!assetKey) {
            throw new Error('No asset data found in the response.');
        }

        // Extract msg_hash from the first asset
        const msgHash = pricesResponse.data.data[assetKey].timestamped_signature.msg_hash;

        // Validate stork signed prices
        const validationResponse = await axios.post('https://app-api.jp.stork-oracle.network/v1/stork_signed_prices/validations', {
            msg_hash: msgHash,
            valid: true
        }, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            }
        });

        validationResponseMessage = validationResponse.data.message;

        // Update the log immediately after validation
        updateLog();
    } catch (error) {
        spinner.fail('Error fetching or validating data: ' + error.message);
    }
};

// Function to update the log display
const updateLog = () => {
    const output = `
${chalk.bold.green('=========User Data============')}
${chalk.blue('Email')} : ${chalk.yellow(email)}
${chalk.blue('ID')} : ${chalk.yellow(id)}
${chalk.blue('Valid')} : ${chalk.green(stork_signed_prices_valid_count)}
${chalk.blue('Invalid')} : ${chalk.red(stork_signed_prices_invalid_count)}
${chalk.bold.green('============================')}
${chalk.blue('Validation Response')} : ${chalk.yellow(validationResponseMessage)}
${chalk.blue('Last Verified At')} : ${chalk.yellow(lastVerifiedDate)}
${chalk.bold.green('============================')}
`;

    logUpdate(output);
};

// Main function
const main = async () => {
    // Initial login to get the bearer token
    await loginAndGetToken();

    // Fetch and validate prices every minute
    setInterval(fetchAndValidatePrices, 60000);

    // Update the log every second for animation
    setInterval(updateLog, 1000);

    // Initial fetch and log update
    await fetchAndValidatePrices();
    updateLog();
};

main();