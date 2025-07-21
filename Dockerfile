FROM node:18-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  libnss3 \
  libxss1 \
  libglib2.0-0 \
  chromium \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm install

CMD ["npm", "start"]
