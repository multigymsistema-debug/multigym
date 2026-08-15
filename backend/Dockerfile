FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ ./
RUN npm run build
EXPOSE 3333
CMD ["npm", "start"]
