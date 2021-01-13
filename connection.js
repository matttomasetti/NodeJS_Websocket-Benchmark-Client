const WebSocketClient = require('websocket').client;

module.exports = class Connection {

    /**
     * Initializes all the data that will be needed to create and use the websocket client
     *
     * @param benchmark_obj {Object} An object storing data that each client will need to connect to the benchmark
     *      server, and send requests
     * @param connection_progress_obj {Object} An object storing data on the connections currently being made each round
     * @param benchmark_progress_obj {Object} An object storing data on all the requests currently being made each round
     * @returns void
     */
    constructor(benchmark_obj, connection_progress_obj, benchmark_progress_obj) {

        /**
         * Signifies whether the connection should be kept alive, and therefore reconnected if closed
         * @type {boolean}
         */
        this.keep_alive = true;

        /**
         * Client connection to the websocket server
         * @type {WebSocketClient}
         */
        this.client = null;

        /**
         * List of requests made for the round for this client with the requests corresponding timestamps
         * @type {Array}
         */
        this.times = [];

        /**
         * The number of connections that have failed
         * @type {number}
         */
        this.connection_fails = 0;

        /**
         * The number of errors that have occurred
         * @type {number}
         */
        this.connection_errors = 0;

        /**
         * The number of successfully completed requests for a given round
         * @type {number}
         */
        this.count = 0;

        /**
         * An array storing the last 20 count readings
         * @type {Array}
         */
        this.last_count = new Array(20);

        /**
         * An object storing data that each client will need to connect to the benchmark server, and send requests
         * {
         *      websocket_address {string} IP address of the websocket server to connect to
         *      websocket_port: {number} Port number of the websocket to connect to
         *      connection_interval: {number} The number of websocket connections to add each round
         *      request_interval: {number} The number of requests to sound out per connected client per round
         *      request_timeout: {number} The number of minutes to wait before abandoning a request
         * }
         * @type {Object}
         */
        this.benchmark_obj = benchmark_obj;

        /**
         * An object storing data on the connections currently being made each round
         * {
         *      counter: {number} the number of clients currently created each round,
         *      total: {number} the total number of clients expected to me created each round,
         *      message: {string} the message to output before starting the connection process
         * }
         * @type {Object}
         */
        this.connection_progress_obj = connection_progress_obj;

        /**
         * An object storing data on all the requests currently being made each round
         * {
         *      counter: {number} the number of requests currently completed each round,
         *      total: {number} the total number of requests expected to me completed each round,
         *      message: {string} the message to output before starting the benchmarking process
         * }
         * @type {Object}
         */
        this.benchmark_progress_obj = benchmark_progress_obj;

        // redefine the push function for the last_count array to shift the data with each entry
        this.last_count.push = function (){
            if (this.length >= 20) {
                this.shift();
            }
            return Array.prototype.push.apply(this, arguments);
        };
    }

    /**
     * Sends the requests from the websocket clients to the server
     *
     * @returns {Promise} resolves once all requests have been completed, or the process times out
     */
    sendData(){

        // track the number of successful requests
        this.count = 0;

        // empty array which will hold timestamp data for each request made
        this.times = [];

        return new Promise((resolve, reject) => {

            // send a total number of requests equal to the specified request interval
            for (let i = 0; i < this.benchmark_obj.request_interval; i++) {

                // ensure the connection is defines before sending, otherwise resolve

                if (this.connection !== undefined) {

                    // create a JSON string containing the current request number
                    let data = JSON.stringify({'c': i});

                    // set the starting timestamp for the request to now
                    this.times[i] = {'start':Date.now()};

                    // send the request to the websocket server
                    this.connection.sendUTF(data);

                } else {
                    resolve();
                }

                // if the request being sent is that last in the loop..
                if(i === this.benchmark_obj.request_interval - 1) {
                    const self = this;
                    var timer = 0;

                    // ... check once per second if the function should resolve
                    const finishCount = setInterval(function () {

                        // The function should resolve if:
                        // 1. There are no requests with a "finish" index which is undefined
                        let readyToResolve = self.times.every(function (time, message_index) {
                            return time['finish'] !== undefined;
                        });

                        // 2. The count tracker of successful requests is equal to the number of requests sent
                        // 3. The number of successful requests is the same as the number of successful requests from
                        //    20 seconds ago AND more than 90% of requests were successful or the request process has
                        //    been running for 5 minutes
                        if ( readyToResolve
                            || ((self.count / self.benchmark_obj.request_interval) === 1)
                            || (self.count === self.last_count[0]
                                && (((self.count / self.benchmark_obj.request_interval) > .9)
                                    || (timer++ >= 100)
                            ))) {

                            // stop checking if the request process has finished, and resolve with the times array
                            clearInterval(finishCount);
                            resolve(self.times);
                        }

                        // Track the count of successful request.
                        // The array stores the last 20 checks (20 seconds).
                        // If the number of successful requests is not changing, we can assume no more
                        // will be coming in.
                        self.last_count.push(self.count);

                    }, 1000);
                }
            }
        });
    }

    /**
     * Sets up a connection to the websocket server
     * and defines event actions
     *
     * @returns {Promise} resolves once connected
     */
    connect() {
        return new Promise((resolve, reject) => {

            // allows this to be used inside nested functions
            const self = this;

            // initialize websocket client
            this.client = new WebSocketClient();

            /**
             *
             * WEBSOCKET CLIENT EVENT FUNCTION
             *
             */

            /**
             * Failed Connection Event
             */
            this.client.on('connectFailed', function (error) {

                // increment failed connection tracker by 1
                self.connection_fails++;

                // retry connection (wrapped in an async function)
                let connect = async function() { self.connect(); };
                connect().then(() => {
                    //self.connection_progress_obj.counter++;
                    resolve();
                });
            });

            /**
             * Successful Connection Event
             */
            this.client.on('connect', function (connection) {

                // assign connection variable to member property
                self.connection = connection;

                // increment connection counter by 1
                self.connection_progress_obj.counter++;

                self.ping();

                /**
                 * Connection Error Event
                 */
                connection.on('error', function (error) {

                    // increment error tacker by 1
                    self.connection_errors++;
                    self.connection_progress_obj.counter--;
                    //console.log("Connection Error: " + error.toString());

                    // try to reconnect
                    self.connect();
                });

                /**
                 * Message Received Event
                 */
                connection.on('message', function (message) {

                    // convert the incoming JSON string to an Object
                    let data = JSON.parse(message.utf8Data);

                    // ensure incoming message has an already existing corresponding request in the times array
                    if(self.times[data['c']] !== undefined) {

                        // ensure the corresponding request in the times array does not already contain any data from
                        // the websocket server.
                        // This can happen if the server sends the 0 response twice, once when the client connects,
                        // and again each round. For the sake of simple math, we just keep the first one.
                        if (self.times[data['c']]['received'] === undefined
                            && self.times[data['c']]['finish'] === undefined) {

                            // store the corresponding timestamps in the times array
                            self.times[data['c']]['received'] = data['ts'];
                            self.times[data['c']]['finish'] = Date.now();

                            // increment the successful request counters by 1
                            self.benchmark_progress_obj.counter++;
                            self.count++;

                        }
                    }
                });

                /**
                 * Connection Close Event
                 */
                connection.on('close', function () {
                    self.connection_progress_obj.counter--;
                    if (self.keep_alive) {
                        self.connect();
                    }
                });



                /**
                 *
                 * END OF WEBSOCKET CLIENT EVENT FUNCTION
                 *
                 */

                resolve();
            });

            // define the websocket server url. Ex: ws://127.0.0.1:8080
            let url = "ws://"+this.benchmark_obj.websocket_address+":"+this.benchmark_obj.websocket_port;

            // set the first timestamp request in the times array to now, as we will be expecting a response from the
            // server once connected
            this.times[0] = {'start':Date.now()};

            // connect to the websocket server
            this.client.connect(url);

        });
    }

    ping(){
        let self = this
        this.pingTimer = setInterval(function () {
            // create a JSON string containing the current request number
            let data = JSON.stringify({'c': 0});

            // send the request to the websocket server
            self.connection.sendUTF(data);

        }, 5000);
    }

    /**
     * Closes the connection to the websocket server
     */
    close(){
        this.keep_alive = false;
        clearInterval(this.pingTimer);
        this.connection.close();
    }
};
