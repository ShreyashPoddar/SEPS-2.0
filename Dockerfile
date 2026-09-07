# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

COPY Frontend/package*.json ./
RUN npm install

COPY Frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Unified Production Runner
# ==========================================
FROM node:20-slim

# Install OpenSSL required by Prisma engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires running with UID 1000
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# Copy backend source files and Prisma schema
COPY backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Copy built frontend from Stage 1 to both locations for full compatibility
COPY --from=frontend-builder /app/frontend/dist /app/Frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/backend/public

# Set proper permissions for the Hugging Face user
RUN chown -R 1000:1000 /app

# Switch to non-root Hugging Face user
USER 1000

# Hugging Face Spaces expects port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "index.js"]
