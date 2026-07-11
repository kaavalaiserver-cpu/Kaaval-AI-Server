FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN apk add --no-cache postgresql-client && npm install

COPY . .

RUN npm run build

EXPOSE 8003

CMD ["npm", "run", "start:prod"]
