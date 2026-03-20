FROM node:22

# Install system deps
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    ln -s /usr/bin/python3 /usr/bin/python

# Install yt-dlp
RUN pip3 install yt-dlp

# App setup
WORKDIR /app
COPY . .

RUN npm install

CMD ["node", "bot.js"]