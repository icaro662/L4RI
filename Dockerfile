FROM node:22

WORKDIR /app

# Copy bot files
COPY package*.json ./
COPY . .

# Make the binary executable
RUN chmod +x ./bin/yt-dlp

# Install dependencies
RUN npm ci

# Start bot
CMD ["node", "bot.js"]