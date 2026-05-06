FROM node:22

WORKDIR /L4RI

# Copy index files
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm ci

# Start index
CMD ["npm", "run", "start"]