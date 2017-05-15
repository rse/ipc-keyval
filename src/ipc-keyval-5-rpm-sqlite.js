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

import URI from "urijs"

/*  Key-Value for Remote-Process-Model (RPM) with SQLite embedded database  */
export default class KeyVal {
    constructor (url) {
        this.url    = url
        this.opened = false
        this.options = {
            database: null,
            table:    "KeyVal",
            colKey:   "key",
            colVal:   "val"
        }
        if (this.url.pathname)
            this.options.database = this.url.pathname.replace(/^\//, "")
        else
            throw new Error("require path in URL")
        if (this.url.query)
            this.options = Object.assign(this.options, URI.parseQuery(this.url.query))
        try {
            this.sqlite = require("sqlite3")
        }
        catch (ex) {
            throw new Error("require SQLite module (NPM package \"sqlite3\")")
        }
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        return new Promise((resolve, reject) => {
            this.db = new this.sqlite.Database(
                this.options.database,
                this.sqlite.OPEN_READWRITE | this.sqlite.OPEN_CREATE,
                (err) => {
                    if (err) reject(err)
                    else     resolve()
                }
            )
        }).then(() => {
            return new Promise((resolve, reject) => {
                this.db.run(`CREATE TABLE IF NOT EXISTS ${this.options.table} ` +
                    `(${this.options.colKey} VARCHAR(128) PRIMARY KEY, ` +
                    ` ${this.options.colVal} TEXT);`, [],
                    (err) => {
                        if (err)
                            reject(err)
                        else {
                            this.opened = true
                            resolve()
                        }
                    }
                )
            })
        })
    }

    /*  retrieve all keys  */
    keys (pattern) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            let sql = `SELECT ${this.options.colKey} FROM ${this.options.table}`
            if (typeof pattern === "string") {
                pattern = pattern.replace(/'/g, "''")
                sql += ` WHERE ${this.options.colKey} GLOB '${pattern}'`
            }
            sql += ";"
            this.db.all(sql, [],
                (err, result) => {
                    if (err)
                        reject(err)
                    else {
                        let keys = result.map((row) => row[this.options.colKey])
                        resolve(keys)
                    }
                }
            )
        })
    }

    /*  put value under key into store  */
    put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR REPLACE INTO ${this.options.table}` +
                `(${this.options.colKey}, ${this.options.colVal}) VALUES (?, ?);`,
                [ key, JSON.stringify(value) ],
                (err) => {
                    if (err) reject(err)
                    else     resolve()
                }
            )
        })
    }

    /*  get value under key from store  */
    get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT ${this.options.colVal} FROM ${this.options.table} ` +
                `WHERE ${this.options.colKey} = ?`,
                [ key ],
                (err, result) => {
                    if (err)
                        reject(err)
                    else {
                        let value
                        if (result)
                            value = JSON.parse(result[this.options.colVal])
                        resolve(value)
                    }
                }
            )
        })
    }

    /*  delete value under key from store  */
    del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM ${this.options.table} ` +
                `WHERE ${this.options.colKey} = ?`,
                [ key ],
                (err) => {
                    if (err) reject(err)
                    else     resolve()
                }
            )
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
                }
            })
        })
    }
}

