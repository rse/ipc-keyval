/*
**  IPC-KeyVal -- Inter-Process-Communication Key-Value Store
**  Copyright (c) 2017-2019 Dr. Ralf S. Engelschall <rse@engelschall.com>
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

import { Lock } from "lock"

/*  Key-Value for Single-Process-Model (SPM)  */
export default class KeyVal {
    constructor (/* url */) {
        this.opened = false
        this.lock   = Lock()
        this.locked = false
        this.unlock = null
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        this.store = {}
        this.opened = true
    }

    /*  retrieve all keys  */
    async keys (pattern) {
        if (!this.opened)
            throw new Error("still not opened")
        let keys = Object.keys(this.store)
        if (typeof pattern === "string") {
            pattern = new RegExp(`^${pattern.replace(/([.?{}])/g, "\\$1").replace(/\*/g, ".+?")}$`)
            keys = keys.filter((key) => pattern.test(key))
        }
        return keys
    }

    /*  put value under key into store  */
    async put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        this.store[key] = value
    }

    /*  get value under key from store  */
    async get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        let value = this.store[key]
        return value
    }

    /*  delete value under key from store  */
    async del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        delete this.store[key]
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        return new Promise((resolve /*, reject */) => {
            this.lock("IPC-KeyVal-spm", (unlock) => {
                this.unlock = unlock
                this.locked = true
                resolve()
            })
        })
    }

    /*  release mutual exclusion lock  */
    async release () {
        if (!this.locked)
            throw new Error("still not acquired")
        return new Promise((resolve, reject) => {
            this.unlock((err) => {
                if (err)
                    reject(err)
                else {
                    this.unlock = null
                    this.locked = false
                    resolve()
                }
            })()
        })
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            await this.release()
        delete this.store
        this.opened = false
    }
}

