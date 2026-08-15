FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install --include=dev
COPY backend/ ./
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3333
CMD ["node", "dist/server.js"]
