FROM node:20-bullseye

WORKDIR /app

COPY package.json ./
COPY services/workflow/package.json ./services/workflow/

COPY services/workflow ./services/workflow

RUN npm install

CMD ["npm", "run", "--workspace=services/workflow", "dev"]
