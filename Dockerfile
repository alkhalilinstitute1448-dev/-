FROM node:20-alpine AS frontend
WORKDIR /app
COPY website/package*.json ./
RUN npm ci
COPY website/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
COPY --from=frontend /app/dist /app/website/dist
RUN mkdir -p uploads data
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
