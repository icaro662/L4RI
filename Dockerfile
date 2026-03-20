FROM node:22

WORKDIR /app

# Copy bot files
COPY package*.json ./
COPY . .

# Install Python and make yt-dlp available in PATH
RUN apt-get update && apt-get install -y python3 \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && cp ./bin/yt-dlp /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# Install dependencies
RUN npm ci

# Start bot
CMD ["node", "bot.js"]