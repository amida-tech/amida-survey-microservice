'use strict';

const _ = require('lodash');

class History {
    constructor(listFields) {
        this.clients = [];
        this.servers = [];
        this.history = [];
        this.currentIndex = [];
        this.removed = [];
        this.listFields = listFields;
    }

    push(client, server) {
        const index = this.clients.length;
        this.clients.push(client);
        this.servers.push(server);
        this.history.push(server);
        this.currentIndex.push(index);
    }

    completeLastServer(server) {
        const index = this.servers.length - 1;
        if (server.id !== this.servers[index].id) {
            throw new Error('Id\'s should be identical');
        }
        this.servers[index] = server;
    }

    pushWithId(client, id) {
        const server = Object.assign({}, client, { id });
        this.push(client, server);
    }

    remove(index) {
        const currentIndex = this.currentIndex[index];
        if (currentIndex >= 0) {
            this.clients.splice(currentIndex, 1);
            const removed = this.servers.splice(currentIndex, 1);
            this.removed.push(...removed);
            this.currentIndex[index] = -this.removed.length;
            _.range(index + 1, this.currentIndex.length).forEach(i => {
                if (this.currentIndex[i] >= 0) {
                    this.currentIndex[i] = this.currentIndex[i] - 1;
                }
            });
        }
    }

    replace(index, client, server) {
        this.push(client, server);
        this.remove(index);
    }

    id(index) {
        return this.history[index].id;
    }

    lastId() {
        return this.history[this.history.length - 1].id;
    }

    client(index) {
        const currentIndex = this.currentIndex[index];
        return this.clients[currentIndex];
    }

    server(index) {
        return this.history[index];
    }

    listClients() {
        return this.clients;
    }

    listServers(fields) {
        let result = this.servers;
        fields = fields || this.listFields;
        if (fields) {
            result = result.map(element => _.pick(element, fields));
        }
        return result;
    }

    reloadServer(server) {
        const id = server.id;
        [this.history, this.servers, this.removed].forEach(collection => {
            const index = _.findLastIndex(collection, { id });
            if (index >= 0) {
                collection[index] = server;
            }
        });
    }
}

module.exports = History;
