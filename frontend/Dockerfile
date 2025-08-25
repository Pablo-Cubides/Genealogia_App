FROM node:20-alpine
WORKDIR /app

# copy package and config files
COPY package.json ./
COPY next.config.js tsconfig.json ./

# install dependencies
RUN npm install --legacy-peer-deps

# copy everything from frontend directory
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
