# OpenRoads API
[![Build Status](https://magnum.travis-ci.com/developmentseed/openroads-api.svg?token=tqZJSdEbKcpsuN9Fxqua&branch=develop)](https://magnum.travis-ci.com/developmentseed/openroads-api)

The OpenRoads API is part of the [OpenRoads project](https://github.com/developmentseed/openroads).

## Contributing

### Installing dependencies
```sh
git clone git@github.com:opengovt/openroads-api.git
cd openroads
npm install
```

### Local configuration

Before running the server, you will need to add `local.js` in your root directory to include directions to the postgresql database. Add your own values to the url where you're hosting the OSM databse.


```javascript
module.exports.connection = {
    url: 'postgres://USER:PASSWORD@HOST:POST/DATABASE',
}
```

### Installing a database with docker

The `db-server` directory contains instructions on running your own postgresql database with the appropriate table schema using Docker. For Mac OS X users you might need [docker-machine](https://github.com/docker/machine) or [Kitematic](https://kitematic.com/)


### Running

To run the server, use the following command:

```sh
npm start
```

To test the bounding box query:

```sh
curl http://localhost:1337/xml/map?bbox=123.81042480468751,9.584500864717155,123.81591796875,9.58991730708743
```

### Building the documentation locally

```sh
npm run gendoc
```

When deploying, Heroku builds the documentation. The .js and .json files that are built by `npm run gendoc`, should not be committed to Github.