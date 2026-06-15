FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.5.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./src

# Expose port 8080 (AgentBase contract requirement)
EXPOSE 8080

# Configure PORT env variable for Express server
ENV PORT=8080

# Start Express server
CMD ["npx", "tsx", "src/server.ts"]

