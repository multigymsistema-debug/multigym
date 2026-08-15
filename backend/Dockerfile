FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY schema ./schema
COPY src ./src
RUN npm install --include=dev && npm run build
ENV NODE_ENV=production
EXPOSE 3333
CMD ["node","dist/server.js"]
