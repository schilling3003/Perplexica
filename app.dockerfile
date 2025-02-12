FROM node:20.18.0-alpine

ARG NEXT_PUBLIC_WS_URL=ws://perplexica-backend:3001
ARG NEXT_PUBLIC_API_URL=http://perplexica-backend:3001/api
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /home/perplexica

# Copy package files first
COPY ui/package.json ui/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY ui ./

# Build the application
RUN npm run build

CMD ["npm", "start"]