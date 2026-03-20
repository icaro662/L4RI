FROM node:22

# Install ffmpeg (required for yt-dlp sometimes) and curl
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary directly (no Python needed)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install Node dependencies
RUN npm ci

# Copy bot files
COPY . .

# Start bot
CMD ["node", "bot.js"]