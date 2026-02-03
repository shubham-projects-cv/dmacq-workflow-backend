FROM node:20-bullseye

WORKDIR /app

# Root + workspace packages
COPY package.json ./
COPY services/email/package.json ./services/email/

COPY services/email ./services/email

RUN npm install

EXPOSE 5000

CMD ["npm", "run", "--workspace=services/email", "dev"]
