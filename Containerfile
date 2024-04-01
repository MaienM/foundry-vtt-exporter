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
# Base runtime.
#

FROM node:${NODE_VERSION}-alpine as runtime

WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock .
RUN yarn --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/dist ./dist
COPY container/entrypoint-base.sh /app

ENTRYPOINT ["sh", "entrypoint.sh"]

#
# Regular variant.
#

FROM runtime as variant-regular

COPY container/entrypoint-regular.sh /app/entrypoint.sh

#
# Git variant.
#

FROM runtime as variant-git

RUN apk add --no-cache git

COPY container/entrypoint-git.sh /app/entrypoint.sh
