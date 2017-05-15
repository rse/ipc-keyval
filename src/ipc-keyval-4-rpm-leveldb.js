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

import levelup from "levelup"

/*  Key-Value for Remote-Process-Model (SPM) with LevelDB embedded database  */
export default class KeyVal {
    constructor (url) {
        this.url    = url
        this.opened = false
        try {
            this.leveldown = require("leveldown")
        }
        catch (ex) {
            throw new Error("require LevelDOWN module (NPM package \"leveldown\")")
        }
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        if (!this.url.pathname)
            throw new Error("require path in URL")
        let filename = this.url.pathname.replace(/^\//, "")
        return new Promise((resolve, reject) => {
            levelup(filename, {
                createIfMissing: true,
                compression:     true,
                keyEncoding:     "utf8",
                valueEncoding:   "json",
                db: this.leveldown
            }, (err, db) => {
                if (err)
                    reject(err)
                else {
                    this.db = db
                    this.opened = true
                    resolve(db)
                }
            })
        })
    }

    /*  retrieve all keys  */
    keys (pattern) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            let keys = []
            let regexp = (typeof pattern === "string" ?
                new RegExp(`^${pattern.replace(/([.?{}])/g, "\\$1").replace(/\*/g, ".+?")}$`) : /^.+$/)
            this.db.createKeyStream()
                .on("data",  (data) => { if (regexp.test(data)) keys.push(data) })
                .on("error", (err)  => { reject(err) })
                .on("end",   ()     => { resolve(keys) })
        })
    }

    /*  put value under key into store  */
    put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.put(key, value, {}, (err) => {
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
            this.db.get(key, {}, (err, value) => {
                if (err) {
                    if (err.notFound)
                        resolve(undefined)
                    else
                        reject(err)
                }
                else
                    resolve(value)
            })
        })
    }

    /*  delete value under key from store  */
    del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.del(key, {}, (err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err)
                    reject(err)
                else {
                    delete this.db
                    this.opened = false
                    resolve()
                }
            })
        })
    }
}

