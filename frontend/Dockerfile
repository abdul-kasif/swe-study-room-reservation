FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# The --host flag exposes the Vite dev server to the Docker network
CMD ["npm", "run", "dev", "--", "--host"]
