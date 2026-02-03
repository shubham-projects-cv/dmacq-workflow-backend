FROM node:20-bullseye

WORKDIR /app

# Copy root package files (for workspaces)
COPY package.json ./
COPY services/api/package.json ./services/api/
COPY shared/package.json ./shared/

# Copy source
COPY services/api ./services/api
COPY shared ./shared

# Install deps
RUN npm install

# Build shared
RUN cd shared && npm run build

# Expose port
EXPOSE 4000

# Start API
CMD ["npm", "run", "--workspace=services/api", "dev"]
