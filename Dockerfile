FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node backend/ ./
COPY --from=frontend-build --chown=node:node /app/frontend/dist/ /app/frontend/dist/
USER node
EXPOSE 3000
CMD ["npm", "start"]
