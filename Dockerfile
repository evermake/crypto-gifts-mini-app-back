FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY ./src ./src
COPY ./tsconfig.json ./
CMD ["echo", "need to specify script"]
