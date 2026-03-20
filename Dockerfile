FROM node:22

# Install dependencies
RUN apt-get update && \
    apt-get install -y python3 ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package.json / package-lock.json
COPY package*.json ./

# Install node deps
RUN npm ci

# Copy bot files
COPY . .

# Start bot
CMD ["node", "bot.js"]