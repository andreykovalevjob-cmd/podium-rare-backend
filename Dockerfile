FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# SQLite будет храниться в /data (Railway Volume)
ENV DB_PATH=/tmp/podium.db
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]
