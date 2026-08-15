FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY schema ./schema
COPY src ./src
RUN npm run build
EXPOSE 3000
CMD ["npm","start"]
