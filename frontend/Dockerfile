FROM node:18
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --include=dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]