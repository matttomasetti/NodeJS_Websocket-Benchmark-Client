FROM ubuntu

ENV TZ=America/New_York
ENV PATH=$PATH:/usr/bin/node
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ADD .	/home/client

RUN apt-get -y update \
    && apt-get -y upgrade \
    #install dependencies
    && apt-get -y install curl git nodejs npm \
    && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update && apt-get -y install yarn \
    && cd /home/client \
    && yarn install
    
WORKDIR /home/client
CMD ["node", "main.js"]
