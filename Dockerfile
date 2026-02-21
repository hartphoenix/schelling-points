FROM oven/bun AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run build

FROM oven/bun
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/dist dist
COPY --from=build /app/src src
COPY --from=build /app/scripts scripts
COPY --from=build /app/data data
COPY --from=build /app/static static
COPY --from=build /app/package.json .
EXPOSE 8000
ENTRYPOINT ["scripts/entrypoint.sh"]
