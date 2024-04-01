ARG NODE_VERSION

#
# Builder.
#

FROM node:${NODE_VERSION}-alpine as builder

WORKDIR /app

COPY package.json yarn.lock .
RUN yarn --frozen-lockfile && yarn cache clean

COPY src ./src
COPY tsconfig.json .
RUN yarn run build

#
# Runtime.
#

FROM node:${NODE_VERSION}-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock .
RUN yarn --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/dist ./dist
COPY entrypoint.sh .

ENTRYPOINT ["sh", "entrypoint.sh"]
