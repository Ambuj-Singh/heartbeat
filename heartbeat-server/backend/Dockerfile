FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY backend ./backend

EXPOSE 3002

CMD ["node", "backend/server.js"]
