# Backend Dockerfile for Node.js app

# Use the official Node.js 16 image
FROM node:16

# Set the working directory in the container to /app
WORKDIR /app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the current directory contents to the container at /app
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the backend's port (5000 in this case)
EXPOSE 5000

# Command to run the Node.js server from the built files
CMD ["node", "build/index.js"]