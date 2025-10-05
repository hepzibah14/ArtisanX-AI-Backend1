# Use official Node.js image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Expose app port (match your app)
EXPOSE 10000

# Start your app
CMD [ "npm", "start" ]