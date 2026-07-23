FROM node:22

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python-is-python3 \
    libnss3 \
    libnspr4 \
    libgtk-3-0 \
    libasound2 \
    libxss1 \
    libgbm1 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libpango-1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libcups2 \
    libxshmfence1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /L4RI

COPY package*.json ./

RUN npm ci

COPY . .

CMD ["npm", "run", "start"]