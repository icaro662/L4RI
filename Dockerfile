FROM node:22

WORKDIR /app

# Copy bot files
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm ci

# Start bot
CMD ["node", "bot.js"]