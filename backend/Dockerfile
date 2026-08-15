FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --include=dev
COPY . ./
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3333
CMD ["node", "dist/server.js"]
