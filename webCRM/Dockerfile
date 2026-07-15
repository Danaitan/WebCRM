FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]

FROM base AS lint
RUN npm ci
COPY . .
CMD ["npm", "run", "lint"]

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
