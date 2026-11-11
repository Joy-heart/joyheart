FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts=false

COPY src ./src
USER node
EXPOSE 8080

CMD ["npm", "start"]
