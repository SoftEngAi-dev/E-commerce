FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json next-env.d.ts next.config.ts ./
RUN npm install
COPY app ./app
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","start"]
