FROM node:10

RUN apt-get update \
    && apt-get install -y libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

CMD ["npm", "start"]