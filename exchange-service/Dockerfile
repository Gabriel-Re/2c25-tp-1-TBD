FROM node:22
WORKDIR /opt/exchange-service
COPY package.json ./
RUN npm install --only=production
COPY src ./src
COPY state ./state
ENV PORT=3001
EXPOSE 3001
ENTRYPOINT ["node", "src/index.js"]


