# L4RI<br>

### L4RI is a small personal Fluxer bot i made for my friends server.<br>

It includes some general search features, such as youtube, wikipedia, image and web search, twitter and instagram embedding, inserting captions on images, user's avatar fetcher, AI features for text & image prompting and image generation, and notifying free games promotions from Steam and Epic.<br>

##  Objective and motive
This project started as a necessity when migrating from Discord to Fluxer due to dubious governmental decisions about it in Brazil. 

But what mainly motivated me to work on this project was to discover how to build a new kind of software i never used and practicing it, serving both as a real problem solution, aswell as helping me increase my programming skills and knowledge. It was also very fun.<br>

## Techologies used

The bot utilises the official Fluxer platform ```@fluxerjs/core ``` as the client library, and ```@fluxerjs/ws ``` ```@fluxerjs/rest ``` libraries for REST and WebSocket connection, running on Node and deployed through Docker.<br>

Additionaly, it uses such libraries for it features:

* `@napi-rs/canvas`: Image rendering and caption generation.
* `axios`: HTTP requests to external APIs and services.
* `groq-sdk`: Connecting to Groq for AI features.
* `playwright`: Browser automation for Instagram sessions.
* `yt-dlp-exec`: Downloading media from Instagram posts.

and some APIs and external services:

* Groq API:  AI models platform.
* YouTube Data API: Youtube search.
* IsThereAnyDeal API: Free game deal tracking.
* Brave Search API: Web and image search.
* Wikipedia REST API: Article summaries and random articles.
* Pollinations AI: Image generation.

<br>

This project was coded with AI assistance, but mainly built by my own reasoning. 
## Folder structure

I tried to keep the folder structure philosophy as basic per file responsability separation.

Instead of keeping main command algorithm and any side helper algorithm used, i aimed for keeping it as short and direct of a flow and separate them.
 * `commands/`: Commands directory.
  * `config/`: Environment configuration. 
  * `core/`:   Bot's configuration.
  * `docker/`: Docker configuration.
  * `utils/`: Utilities directory.

## Requirements

* Node.js 22 or newer and npm.
* A Fluxer bot application and bot token.
* API keys for the services you want to use: YouTube, Groq, IsThereAnyDeal, and Brave Search. (all of them have free plans)
* Instagram credentials are required only for Instagram media embedding features.
* Docker and Docker Compose are optional when running the bot in a container.

## Setup

1. Clone the repository and install the dependencies:

  ```sh
  npm install
  ```

2. Create the environment file from the provided template:

  ```sh
  cp config/.env
  ```

3. Edit `config/.env` and add your values:

  ```env
  FLUXER_BOT_TOKEN=your_fluxer_bot_token
  YOUTUBE_API_KEY=your_youtube_api_key
  GROQ_API_KEY=your_groq_api_key
  ITAD_API_KEY=your_isthereanydeal_api_key (OPTIONAL)
  BRAVE_API_KEY=your_brave_api_key
  CLIENT_ID=your_bot_client_id
  TARGET_GUILD_ID=your_fluxer_server_id
  TARGET_GAMESNOT_CHANNEL_ID=your_free_games_channel_id (OPTIONAL)
  INSTAGRAM_USERNAME=your_instagram_username
  INSTAGRAM_PASSWORD=your_instagram_password
  ```

> **Note:** Instagram login credentials are needed for Instagram media embedding. 

4. Start the bot:

  ```sh
  npm start
  ```

To run the bot with Docker, make sure `config/.env` is configured and run:

```sh
docker compose -f docker/docker-compose.yml up --build -d
```
<hr>
