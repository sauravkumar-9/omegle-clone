FROM node:14

WORKDIR /

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3030

CMD [ "npm", "run", "start" ]
