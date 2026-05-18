# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-slim

# Install system dependencies: ffmpeg, python3, pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN python3 -m pip install --break-system-packages yt-dlp curl_cffi

# Install Deno (required for YouTube JS challenge solving)
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

# Download yt-dlp EJS components
RUN yt-dlp --remote-components ejs:github --version 2>/dev/null || true

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:${PORT:-3001}/api/health || exit 1

# Start server
CMD ["node", "server/index.js"]
