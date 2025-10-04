FROM node:20-alpine
WORKDIR /app

# deps
COPY package.json ./
RUN npm install

# código
COPY . .

# Passe as variáveis VITE_* no build (recebidas via --build-arg)
ARG VITE_MAPTILER_KEY
ARG VITE_API_BASE=/api
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY
ENV VITE_API_BASE=$VITE_API_BASE

# build de produção
RUN npm run build

# serve o build com vite preview (estático, sem HMR)
EXPOSE 5173
CMD ["npm","run","preview","--","--host"]
