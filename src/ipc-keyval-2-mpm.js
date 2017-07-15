/*
**  IPC-KeyVal -- Inter-Process-Communication Key-Value Store
**  Copyright (c) 2017 Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import Bluebird from "bluebird"
import cluster  from "cluster"
import Lock     from "lock"

/*  internal Key-Value store  */
class Store {
    constructor (id) {
        this.id = id
        this.store = {}
        this.lock = Lock()
        this.unlock = null
    }
    keys (pattern, cb) {
        let keys = Object.keys(this.store)
        if (typeof pattern === "string") {
            pattern = new RegExp(`^${pattern.replace(/([.?{}])/g, "\\$1").replace(/\*/g, ".+?")}$`)
            keys = keys.filter((key) => pattern.test(key))
        }
        cb(null, keys)
    }
    put (key, value, cb) {
        this.store[key] = value
        cb(null)
    }
    get (key, cb) {
        let value = this.store[key]
        if (value === undefined)
            value = { "undefined": "undefined" }
        cb(null, value)
    }
    del (key, cb) {
        delete this.store[key]
        cb(null)
    }
    acquire (cb) {
        this.lock(`KeyVal-mpm:${this.id}:lock`, (unlock) => {
            this.unlock = unlock
            cb(null)
        })
    }
    release (cb) {
        this.unlock((err) => {
            if (err)
                cb(err)
            else {
                this.unlock = null
                cb(null)
            }
        })()
    }
    destroy (cb) {
        if (this.unlock !== null)
            this.release(cb)
        else
            cb(null)
    }
}

/*  Key-Value for Multi-Process-Model (MPM)  */
export default class KeyVal {
    constructor (url) {
        this.url    = url
        this.opened = false
        this.lock   = Lock()
        this.locked = false
        this.unlock = null
        this.id     = this.url.hostname
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        let methods = [ "keys", "put", "get", "del", "acquire", "release", "destroy" ]
        if (cluster.isMaster) {
            let store = new Store(this.id)
            this.crpc = require("cluster-rpc/master").create({
                debug:     false,
                addOnFork: true,
                instance:  store,
                methods:   methods,
                name:      `KeyVal-mpm:${this.id}`
            })
            for (const id in cluster.workers)
                this.crpc.addWorker(cluster.workers[id])
        }
        else {
            this.crpc = require("cluster-rpc/worker").create({
                debug: false,
                name:  `KeyVal-mpm:${this.id}`
            })
        }
        return this.crpc.then((store) => {
            methods.forEach((method) => {
                store[method] = Bluebird.promisify(store[method], { context: store })
            })
            this.store = store
            this.opened = true
        })
    }

    /*  retrieve all keys  */
    async keys (pattern = "*") {
        if (!this.opened)
            throw new Error("still not opened")
        return this.store.keys(pattern)
    }

    /*  put value under key into store  */
    async put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return this.store.put(key, value)
    }

    /*  get value under key from store  */
    async get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        let value = await this.store.get(key)
        if (typeof value === "object" && value["undefined"] === "undefined")
            value = undefined
        return value
    }

    /*  delete value under key from store  */
    async del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return this.store.del(key)
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        return this.store.acquire()
    }

    /*  release mutual exclusion lock  */
    async release () {
        return this.store.release()
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        await this.store.destroy()
        delete this.store
        delete this.crpc
        this.opened = false
    }
}

