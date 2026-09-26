FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG AUDIVERIS_VERSION=5.11.0

# V7 keeps every important operation in its own Docker layer.
# If Render fails, the build log will identify the exact failing stage.
RUN apt-get update
RUN apt-get install -y --no-install-recommends \
    ca-certificates curl nodejs npm dpkg-dev \
    fontconfig libasound2t64 libfreetype6 libx11-6 libxext6 libxi6 libxrender1 libxtst6 \
    libgomp1 libstdc++6 zlib1g libgcc-s1 libc6 libglib2.0-0t64 libsm6 libice6 \
    libxfixes3 libxrandr2 libxinerama1 libxcursor1 libgtk-3-0t64 xvfb

RUN curl -fL --retry 3 \
    "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
    -o /tmp/audiveris.deb

# Show package metadata in Render logs, including its declared dependencies.
RUN dpkg-deb -I /tmp/audiveris.deb | sed -n '1,120p'

# Install the dependencies declared by the official package, without running
# Audiveris' own desktop-oriented maintainer scripts.
RUN deps="$(dpkg-deb -f /tmp/audiveris.deb Depends | sed 's/,/ /g' | sed 's/([^)]*)//g')"; \
    echo "Audiveris dependencies: $deps"; \
    if [ -n "$deps" ]; then apt-get update && apt-get install -y --no-install-recommends $deps; fi

RUN mkdir -p /tmp/audiveris-root && dpkg-deb -x /tmp/audiveris.deb /tmp/audiveris-root
RUN echo "Audiveris files:" && find /tmp/audiveris-root -maxdepth 4 -type f | head -80
RUN cp -a /tmp/audiveris-root/. /
RUN test -x /opt/audiveris/bin/Audiveris && echo "Audiveris launcher found"
RUN find /opt/audiveris -type f \( -name '*.so' -o -name '*.so.*' \) -print | head -80
RUN xvfb-run -a /opt/audiveris/bin/Audiveris -version

RUN rm -rf /tmp/audiveris.deb /tmp/audiveris-root /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV AUDIVERIS_CMD=/opt/audiveris/bin/Audiveris
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.js"]
