FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
COPY db ./db
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","dist/src/http/server.js"]
