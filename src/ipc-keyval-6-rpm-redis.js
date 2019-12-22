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

import redis     from "redis"
import redisLock from "redis-lock"

/*  Key-Value for Remote-Process-Model (RPM) with REDIS standalone database  */
export default class KeyVal {
    constructor (url) {
        this.url    = url
        this.opened = false
        this.lock   = null
        this.locked = false
        this.unlock = null
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        return new Promise((resolve, reject) => {
            const options = {}
            options.host = this.url.hostname
            options.port = this.url.port ? parseInt(this.url.port) : 6379
            if (this.url.password)
                options.password = this.url.password
            if (this.url.pathname) {
                options.prefix = this.url.pathname.replace(/^\/([^/]+).*/, "$1/")
                this.prefix = options.prefix
            }
            else
                this.prefix = ""
            this.client = redis.createClient(options)
            this.lock = redisLock(this.client)
            let handled = false
            this.client.on("connect", () => {
                if (handled)
                    return
                handled = true
                this.opened = true
                resolve()
            })
            this.client.on("error", (err) => {
                if (handled)
                    return
                handled = true
                reject(err)
            })
        })
    }

    /*  retrieve all keys  */
    async keys (pattern) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            if (typeof pattern !== "string")
                pattern = "*"
            this.client.keys(this.prefix + pattern, (err, keys) => {
                if (err)
                    reject(err)
                else {
                    keys = keys.map((key) => {
                        if (this.prefix !== "")
                            key = key.replace(new RegExp(`^${this.prefix}`), "")
                        return key
                    })
                    resolve(keys)
                }
            })
        })
    }

    /*  put value under key into store  */
    async put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.client.set(key, JSON.stringify(value), (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  get value under key from store  */
    async get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, value) => {
                if (err) reject(err)
                else {
                    value = JSON.parse(value)
                    if (value === null)
                        value = undefined
                    resolve(value)
                }
            })
        })
    }

    /*  delete value under key from store  */
    async del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.client.del(key, (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  acquire mutual exclusion lock  */
    async acquire () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.lock("IPC-KeyVal-rpm", (unlock) => {
                this.unlock = unlock
                this.locked = true
                resolve()
            })
        })
    }

    /*  release mutual exclusion lock  */
    async release () {
        if (!this.opened)
            throw new Error("still not opened")
        if (!this.locked)
            throw new Error("still not acquired")
        return new Promise((resolve, reject) => {
            this.unlock(() => {
                this.unlock = null
                this.locked = false
                resolve()
            })
        })
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            await this.release()
        this.client.quit()
        delete this.client
        this.opened = false
        return Promise.resolve()
    }
}

