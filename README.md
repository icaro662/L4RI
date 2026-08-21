# <center>✦•┈๑⋅⋯ L4RI ⋯⋅๑┈•✦<br> <h6>˖ ִֶָ🐣་༘🐈‍⬛ ♡₊˚ 🐸・✨₊🦎✧ 🐺˖ ִֶָ</h6>


### <center>L4RI is a small personal Fluxer bot i made for my friends server.</center><br>

It includes some general search features, such as youtube, wikipedia, image and web search, twitter and instagram embedding, inserting captions on images, user's avatar fetcher, AI features for text & image prompting and image generation, and notifying free games promotions from Steam and Epic.<br>

## <center> Objective and motive
This project started as a necessity when migrating from Discord to Fluxer due to dubious governmental decisions about it in Brazil. It serves both a real problem aswell as helping me pratice my programming skills and knowledge.<br>

## <center>Tech stack

- **Runtime:** Node.js with native ES modules<br><br>
- **Bot platform:** Fluxer, using `@fluxerjs/core` for the client and `@discordjs/rest` plus `@discordjs/ws` for REST and WebSocket communication<br><br>
- **External services:** Groq, YouTube, Brave Search, Wikipedia, Steam, Epic Games, and Instagram/Twitter integrations<br><br>
- **HTTP and media:** Axios, Playwright, `yt-dlp-exec`, and `@napi-rs/canvas`<br><br>
- **Configuration:** Environment variables loaded with `dotenv`<br><br>
- **Development and deployment:** npm scripts, Docker, and Docker Compose<br><br>

## <center> Folder structure

I tried to keep the folder structure philosophy as basic per file responsability separation.

Instead of keeping main command algorithm and any side helper algorithm used, i aimed for keeping it as short and direct of a flow and separate them.
```text
├── commands/                       # Commands folder
│   ├── avatar.js                       # User avatar fetching
│   ├── canvas.js                       # Image caption generation
│   ├── freeGames.js                # Free game notifications
│   ├── fun.js                          # Fun 
│   ├── grok.js                         # AI text features
│   ├── imgGen.js                   # AI image generation
│   ├── imgSearch.js                # Image search
│   ├── search.js                       # Web search
│   ├── wiki.js                         # Wikipedia search
│   └── youtube.js                   # YouTube search and media features
│ 
├── config/                             # Environment files
│   ├── .env                            # Secrets and environment variables
│   └── .envexample               # .env setup helper
│ 
├── core/                               # Bot's configuration
│   └── envHelper.js              # Env configuration
│ 
├── docker/                             # Container configuration
│   ├── Dockerfile                  # Bot's docker container setup
│   └── docker-compose.yml     # Bot's docker service
│ 
├── utils/                                  # Shared handlers and integrations
│   ├── cmdFilter.js                # Command routing and filtering
│   ├── envHelper.js                # Environment setup
│   ├── instagramDownloader.js       #  Instagram media downloader
│   ├── instagramSession.js             # Instagram session connector
│   ├── uniHandler.js                   # Shared response handling
│   └── urlParser.js                        # URL parsing helpers
│ 
└──  index.js                                # Application entry point and bot startup
```

## <center> Requirements

## <center> Setup

