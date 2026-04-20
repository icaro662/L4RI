FROM node:22

WORKDIR /app

# Copy index files
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm ci

# Start index
CMD ["node", "index.js"]