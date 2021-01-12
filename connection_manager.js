const Connection = require('./connection');

/**
 * Creates, manages, and closes all the websocket clients
 *
 * @type {module.ConnectionManager}
 */
module.exports = class ConnectionManager {

    /**
     * Initializes all the data that will be needed to create and use websocket clients
     *
     * @param benchmark_obj {Object} An object storing data that each client will need to connect to the benchmark
     *      server, and send requests
     * @param connection_obj {Object} An object storing websocket client connections and connection data
     * @param connection_progress_obj {Object} An object storing data on the connections currently being made each round
     * @param benchmark_progress_obj {Object} An object storing data on all the requests currently being made each round
     * @returns void
     */
    constructor(benchmark_obj, connection_obj, connection_progress_obj, benchmark_progress_obj){

        /**
         * Array tracking the number of clients connected each round to determine is the connection process has finished
         * @type {Array}
         */
        this.connected = new Array(benchmark_obj.connection_interval);

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
         * An object storing websocket client connections and connection data
         * {
         *      connection_time: {number} the total time it took for all the clients to connect each round
         *      times: {Array}, time data produces by each client for each request to the websocket server
                clients: {Array} list of all connected clients
         * }
         * @type {Object}
         */
        this.connection_obj = connection_obj;

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
    }

    /**
     * Creates new connections for each round
     *
     * @param round {number} The current round being ran in the benchmarking process
     * @returns {Promise} resolves when all the connections have been made
     */
    createConnections(round) {

        //calculate the number of existing connections
        let existing_client_count = this.benchmark_obj.connection_interval * round;

        //calculate the total number of connections that should exist after the connection process is finished
        let new_client_count = this.benchmark_obj.connection_interval * (round + 1) - 1;

        //create undefined values in the connected array for each expected new connection
        this.connected[new_client_count] = undefined;

        return new Promise((resolve, reject) => {

            //start the connection process
            let connection_start = Date.now();

            //loop for the number of new connections that should be made
            for (let i = 0; i < this.benchmark_obj.connection_interval; i++) {

                //create a new connection
                this.connection_obj.clients[existing_client_count + i] = new Connection(this.benchmark_obj, this.connection_progress_obj, this.benchmark_progress_obj);
                this.connection_obj.clients[existing_client_count + i].connect().then(() => {

                    //set the client number in the connected array as true
                    this.connected[existing_client_count + i] = 1;

                    //if all clients in the connected array have connected, end connection process and resolve
                    if (!this.connected.includes(undefined)) {
                        this.connection_obj.connection_time = Date.now() - connection_start;
                        resolve();
                    }
                });
            }
        });
    }

    /**
     * Creates requests on each client for each round
     *
     * @param round {number} The current round being ran in the benchmarking process
     * @returns {Promise} resolves when all requests have been completed/timeout
     */
     sendRequests(round) {
         // clear the times array which contains the previous rounds data
        this.connection_obj.times = new Array(this.benchmark_obj.connection_interval * (round + 1));

        return new Promise((resolve, reject) => {

            //loop through the clients array in the connection object, and start the request process
            for (let i = 0; i < this.connection_obj.clients.length; i++) {
                this.connection_obj.clients[i].sendData().then((time) => {
                    this.connection_obj.times[i] = time;

                    // resolve after all requests have been completed/timeout
                    if (!this.connection_obj.times.includes(undefined)) {
                        resolve();
                    }
                });
            }
        });
    }

    /**
     * Closes all open websocket connections
     * returns {void}
     */
    close() {

        //loop through the clients array in the connection object, and close the client connection
        for (let i = 0; i < this.connection_obj.clients.length; i++) {
            this.connection_obj.clients[i].close();
        }
    }
};
