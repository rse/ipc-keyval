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

import redis from "redis"

/*  Key-Value for Remote-Process-Model (RPM) with REDIS standalone database  */
export default class KeyVal {
    constructor (url) {
        this.url = url
        this.opened = false
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        return new Promise((resolve, reject) => {
            let options = {}
            options.host = this.url.hostname
            options.port = this.url.port ? parseInt(this.url.port) : 6379
            if (this.url.auth)
                options.password = this.url.auth.split(":")[1]
            if (this.url.pathname) {
                options.prefix = this.url.pathname.replace(/^\/([^/]+).*/, "$1/")
                this.prefix = options.prefix
            }
            else
                this.prefix = ""
            this.client = redis.createClient(options)
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
    keys () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.client.keys("*", (err, keys) => {
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
    put (key, value) {
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
    get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, value) => {
                if (err) reject(err)
                else     resolve(JSON.parse(value))
            })
        })
    }

    /*  delete value under key from store  */
    del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.client.del(key, (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        this.client.quit()
        delete this.client
        this.opened = false
        return Promise.resolve()
    }
}

