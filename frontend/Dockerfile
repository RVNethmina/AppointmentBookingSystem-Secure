# Build the single-page application, then serve it with an unprivileged nginx
# that also proxies /api to the backend container.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# empty backend URL = same origin (requests go to /api on this nginx)
ARG VITE_BACKEND_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
