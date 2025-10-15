FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm ci || true
RUN npm run build || true

FROM node:20 AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public 2>/dev/null || true
EXPOSE 3000
CMD ["node", "server.js"]
