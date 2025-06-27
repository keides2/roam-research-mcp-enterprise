# Use an official Node.js runtime as a parent image for building
FROM node:22.12-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Install development and production dependencies
RUN --mount=type=cache,target=/root/.npm npm install

# Build the TypeScript project
RUN npm run build


# Use a minimal Node.js runtime as the base for the release image
FROM node:22-alpine AS release

# Set environment to production
ENV NODE_ENV=production

# Set the working directory
WORKDIR /app

# Copy only the built application and production dependencies from the builder stage
COPY --from=builder /app/build /app/build
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

# Install only production dependencies
RUN npm ci --ignore-scripts --omit-dev

# Expose the ports the app runs on
EXPOSE 3000
EXPOSE 8088

# Run the application
ENTRYPOINT ["node", "build/index.js"]
