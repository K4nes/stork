# Stork Oracle Auto Bot

Automated validation bot for the Stork Oracle network. This bot helps you automate the verification process to earn rewards through the Stork Oracle system.

## Features

- Automated login and token management
- Fetches and validates stork signed prices
- Displays user data and validation statistics in real-time
- Logs validation responses and updates the log display dynamically

## Requirements

- Node.js 16 or higher
- Playwright
- A Stork Oracle account

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/stork-oracle-auto-bot.git
   cd stork-oracle-auto-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npx playwright install
   npx playwright install-deps
   ```

## Configuration

Create an `account.json` file in the root directory with your Stork Oracle account credentials:
   ```json
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```

## Usage

1. Run the bot:
   ```bash
   node index.js
   ```

2. The bot will log in, fetch and validate stork signed prices, and display the user data and validation statistics in real-time.

## Troubleshooting

- If you see authentication errors, check that your username and password in `account.json` are correct.
- If the bot fails to start, ensure your `account.json` file is properly formatted JSON.
- If you see token-related errors after successful authentication, the `tokens.json` file may be corrupted - delete it and let the bot regenerate it.
- For connection issues, check your internet connection and verify the Stork Oracle API is accessible.


## Disclaimer

This bot is provided for educational purposes only. Use at your own risk. The authors are not responsible for any consequences that may arise from using this bot, including but not limited to account termination or loss of rewards.

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.