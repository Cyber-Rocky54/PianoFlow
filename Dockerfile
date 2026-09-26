FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG AUDIVERIS_VERSION=5.11.0

# PianoFlow only needs Audiveris' application files in /opt/audiveris.
# The official .deb is a desktop installer. In a headless Docker build its
# desktop post-install hook can fail, so we resolve its declared dependencies
# with apt, then extract the official package without running maintainer hooks.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl nodejs npm dpkg-dev \
      fontconfig libasound2t64 libfreetype6 libx11-6 libxext6 libxi6 libxrender1 libxtst6 \
 && curl -fL --retry 3 \
      "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
      -o /tmp/audiveris.deb \
 && deps="$(dpkg-deb -f /tmp/audiveris.deb Depends | tr ',' ' ')" \
 && if [ -n "$deps" ]; then apt-get install -y --no-install-recommends $deps; fi \
 && dpkg-deb -x /tmp/audiveris.deb / \
 && test -x /opt/audiveris/bin/Audiveris \
 && /opt/audiveris/bin/Audiveris -version \
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
