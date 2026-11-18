FROM node:24-alpine

WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

# Using tsx to run TypeScript directly with watch mode for hot-reloading
CMD ["npx", "tsx", "watch", "src/index.ts"]
