FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG AUDIVERIS_VERSION=5.11.0

# Use the Ubuntu 24.04 Audiveris package on an Ubuntu 24.04 base.
# This avoids mixing Ubuntu .deb dependencies with Debian Bookworm.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl nodejs npm \
      fontconfig libasound2t64 libfreetype6 libx11-6 libxext6 libxi6 libxrender1 libxtst6 \
 && curl -fL --retry 3 \
      "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
      -o /tmp/audiveris.deb \
 && apt-get install -y /tmp/audiveris.deb \
 && rm -f /tmp/audiveris.deb \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV AUDIVERIS_CMD=/opt/audiveris/bin/Audiveris
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.js"]
