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

import cluster from "cluster"

/*  internal Key-Value store  */
class Store {
    constructor ()   { this.store = {} }
    keys ()          { return Object.keys(this.store) }
    put (key, value) { this.store[key] = value }
    get (key)        { return this.store[key] }
    del (key)        { delete this.store[key] }
}

/*  Key-Value for Multi-Process-Model (MPM)  */
export default class KeyVal {
    constructor (/* url */) {
        this.opened = false
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        if (cluster.isMaster) {
            let store = new Store()
            this.crpc = require("cluster-rpc/master").create({
                debug: true,
                addOnFork: true,
                instance:  store,
                methods:   [ "keys", "put", "get", "del" ],
                name:      "KeyVal-mpm"
            })
        }
        else {
            this.crpc = require("cluster-rpc/worker").create({
                debug: true,
                name: "KeyVal-mpm"
            })
        }
        return this.crpc.then((store) => {
            this.store = store
            this.opened = true
        })
    }

    /*  retrieve all keys  */
    keys () {
        if (!this.opened)
            throw new Error("still not opened")
        let keys = this.store.keys()
        return Promise.resolve(keys)
    }

    /*  put value under key into store  */
    put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        let result = this.store.put(key, value)
        return Promise.resolve(result)
    }

    /*  get value under key from store  */
    get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        let value = this.store.get(key)
        return Promise.resolve(value)
    }

    /*  delete value under key from store  */
    del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        let result = this.store.del(key)
        return Promise.resolve(result)
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        delete this.store
        delete this.crpc
        this.opened = false
        return Promise.resolve()
    }
}

