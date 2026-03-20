FROM node:22

WORKDIR /app

# Copy bot files
COPY package*.json ./
COPY . .

# Make the binary executable
RUN chmod +x ./bin/yt-dlp

RUN apt-get update && apt-get install -y python3 && ln -s /usr/bin/python3 /usr/bin/python

# Install dependencies
RUN npm ci

# Start bot
CMD ["node", "bot.js"]