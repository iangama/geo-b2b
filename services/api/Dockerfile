FROM node:20-alpine
WORKDIR /app

# OpenSSL para binários do Prisma
RUN apk add --no-cache openssl

COPY package.json ./
RUN npm install

# Copia schema e gera o Prisma Client no build
COPY prisma ./prisma
RUN npx prisma generate

# Copia o código
COPY src ./src

EXPOSE 4000

# Por segurança, gera novamente no start e sobe o server
CMD ["sh","-lc","npx prisma generate && node src/server.js"]
