# NodeJS Websocket Benchmark Client

This is a NodeJS websocket client designed to 
benchmark the performance of both reliability and speed of various 
websocket implementations.

The other server variations can be found at the links below
 
## Quick Set-Up
```
docker run mtomasetti/nodejs_websocket-benchmark-client
```
That's it! The websocket server will automatically start
####Optional Environment Variables
* <b>BENCHMARK_FOLDER</b> - The base directory where all benchmark results are stored
    * Default: "./benchmarks"
    * Type: string
* <b>BENCHMARK_LANGUAGE</b> - The language which is being benchmarked
    * Default: manual user input
    * Type: string
* <b>WEBSOCKET_ADDRESS</b> - IP address of the websocket server to connect to
    * Default: "127.0.0.1"
    * Type: string
* <b>WEBSOCKET_PORT</b>  - Port number of the websocket to connect to
    * Default: 8080
    * Type: integer
* <b>ADD_CONNECTIONS</b>  - The number of websocket connections to add each round
    * Default: 100
    * Type: integer
* <b>REQUESTS</b> - The number of requests to sound out per connected client per round
    * Default: 50
    * Type: integer
* <b>ROUNDS</b> - The number of rounds to perform per test
    * Default: 25
    * Type: integer


## Dockerfile Set-Up
```
docker build . -t websocket_benchmark/client
docker run websocket_benchmark/client
```

## Manual Set-up
#### Requirements
In order for this websocket server to compile and run, it requires:
* Node
* Yarn

It is recommended that you use the ready-made environment via the
included Dockerfile

#### Install & Run
```
yarn install
node main.js
```

## Links

#### GitHub
* [Benchmarking Client (NodeJS)](https://github.com/matttomasetti/NodeJS_Websocket-Benchmark-Client)
* [C (LWS)](https://github.com/matttomasetti/C-LWS_Websocket-Benchmark-Server)
* [C++ (uWS)](https://github.com/matttomasetti/CPP-uWS_Websocket-Benchmark-Server)
* [C#](https://github.com/matttomasetti/CS_Websocket-Benchmark-Server)
* [Go (Gorilla)](https://github.com/matttomasetti/Go-Gorilla_Websocket-Benchmark-Server)
* [Java (WebSocket)](https://github.com/matttomasetti/Java-WebSocket_Websocket-Benchmark-Server)
* [NodeJS (uWS)](https://github.com/matttomasetti/NodeJS-uWS_Websocket-Benchmark-Server)
* [PHP (Ratchet)](https://github.com/matttomasetti/PHP-Ratchet_Websocket-Benchmark-Server)
* [Python (Websockets)](https://github.com/matttomasetti/Python-Websockets_Websocket-Benchmark-Server)
* [Rust (WebSocket)](https://github.com/matttomasetti/Rust-WebSocket_Websocket-Benchmark-Server)

#### Docker Hub
* [Benchmarking Client (NodeJS)](https://hub.docker.com/r/mtomasetti/nodejs_websocket-benchmark-client)
* [C (LWS)](https://hub.docker.com/r/mtomasetti/c-lws_websocket-benchmark-server)
* [C++ (uWS)](https://hub.docker.com/r/mtomasetti/cpp-uws_websocket-benchmark-server)
* [C#](https://hub.docker.com/r/mtomasetti/cs_websocket-benchmark-server)
* [Go (Gorilla)](https://hub.docker.com/r/mtomasetti/go-gorilla_websocket-benchmark-server)
* [Java (WebSocket)](https://hub.docker.com/r/mtomasetti/java-websocket_websocket-benchmark-server)
* [NodeJS (uWS)](https://hub.docker.com/r/mtomasetti/nodejs-uws_websocket-benchmark-server)
* [PHP (Ratchet)](https://hub.docker.com/r/mtomasetti/php-ratchet_websocket-benchmark-server)
* [Python (Websockets)](https://hub.docker.com/r/mtomasetti/python-websockets_websocket-benchmark-server)
* [Rust (WebSocket)](https://hub.docker.com/r/mtomasetti/rust-websocket_websocket-benchmark-server)
