FROM node:20-bookworm

ARG AUDIVERIS_VERSION=5.11.0
ARG AUDIVERIS_UBUNTU=22.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl fontconfig libasound2 libfreetype6 libx11-6 libxext6 libxi6 libxrender1 libxtst6 \
 && rm -rf /var/lib/apt/lists/*

# Official Audiveris Linux installer. It includes its Java runtime.
RUN curl -fL --retry 3 \
  "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu${AUDIVERIS_UBUNTU}-x86_64.deb" \
  -o /tmp/audiveris.deb \
 && apt-get update \
 && apt-get install -y /tmp/audiveris.deb \
 && rm -f /tmp/audiveris.deb \
 && rm -rf /var/lib/apt/lists/* \
 && /opt/audiveris/bin/Audiveris -version

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV AUDIVERIS_CMD=/opt/audiveris/bin/Audiveris
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "server.js"]
