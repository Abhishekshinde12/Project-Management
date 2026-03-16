# Stage1: Building the code
# naming this stage as builder
FROM node:24.14.0-alpine AS builder 

WORKDIR /app 

COPY package*.json ./

# clean install. command designed for automated env (CI/CD) to install depend. quickly and reliably
RUN npm ci 

COPY . .

# build the react app. when we run, we get a dist/ which contains entire project that was built
RUN npm run build 



# Stage2: Production stage
FROM nginx:alpine 

# --from=previous stage name source_file_path destination_file_path.
# Whether docker image has a default /app folder depends on specific image config. Generally some specific application images may use WORKDIR /app in dockerfiles eg. node, python. While many fundamental or base OS images don't have a /app dir by default, so no need for WORKDIR /app instruction, they work directly in the root dir
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config to handle React Router (SPA fallback)
# copy the nginx.conf file and place it  inside default.conf which is the default config for nginx server
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 

# This Command used when running nginx inside Docker container
# -g = global directive, daemon off = not to run in background (daemon)
# Normally NGINX runs as background process, but in containers, main process should stay in foreground
CMD ["nginx", "-g", "daemon off;"]