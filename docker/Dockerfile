FROM node:24

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /L4RI

COPY package*.json ./

RUN npm ci

COPY . .

CMD ["npm", "run", "start"]