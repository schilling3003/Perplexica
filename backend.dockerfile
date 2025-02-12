FROM node:18-slim

WORKDIR /home/perplexica

COPY src /home/perplexica/src
COPY tsconfig.json /home/perplexica/
COPY drizzle.config.ts /home/perplexica/
COPY package.json /home/perplexica/
COPY package-lock.json /home/perplexica/

RUN mkdir /home/perplexica/data
RUN mkdir /home/perplexica/uploads

RUN npm ci --network-timeout 600000
RUN npm run build

CMD ["npm", "start"]