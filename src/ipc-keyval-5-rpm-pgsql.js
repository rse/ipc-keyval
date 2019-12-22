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

import fs       from "fs"
import pg       from "pg"
import { Lock } from "lock"

/*  Key-Value for Remote-Process-Model (RPM) with PostgreSQL standalone database  */
export default class KeyVal {
    constructor (url) {
        this.url    = url
        this.opened = false
        this.lock   = Lock()
        this.locked = false
        this.unlock = null
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
        Object.keys(this.options).forEach((name) => {
            if (this.url.searchParams !== undefined && this.url.searchParams.get("name") !== null)
                this.options[name] = this.url.searchParams.get("name")
        })
    }

    /*  open connection  */
    async open () {
        if (this.opened)
            throw new Error("already opened")
        const config = {
            database: this.options.database,
            host: this.url.hostname,
            port: this.url.port ? parseInt(this.url.port) : 5432
        }
        if (this.url.username)
            config.user = this.url.username
        if (this.url.password)
            config.password = this.url.password
        if (   this.url.searchParams !== undefined
            && (   this.url.searchParams.get("tls")
                || this.url.searchParams.get("ca")
                || this.url.searchParams.get("key")
                || this.url.searchParams.get("crt"))) {
            config.ssl = { rejectUnauthorized: false }
            if (this.url.searchParams.get("ca")) {
                config.ssl.ca = fs.readFileSync(this.url.searchParams.get("ca")).toString()
                config.ssl.rejectUnauthorized = true
            }
            if (this.url.searchParams.get("key"))
                config.ssl.key = fs.readFileSync(this.url.searchParams.get("key")).toString()
            if (this.url.searchParams.get("crt"))
                config.ssl.cert = fs.readFileSync(this.url.searchParams.get("crt")).toString()
        }
        await new Promise((resolve, reject) => {
            this.db = new pg.Client(config)
            this.db.connect((err) => {
                if (err) reject(err)
                else     resolve()
            })
        })
        return new Promise((resolve, reject) => {
            this.db.query(`CREATE TABLE IF NOT EXISTS ${this.options.table} ` +
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
    }

    /*  retrieve all keys  */
    async keys (pattern) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            let sql = `SELECT ${this.options.colKey} FROM ${this.options.table}`
            if (typeof pattern === "string") {
                pattern = `^${pattern.replace(/([.?{}])/g, "\\$1").replace(/\*/g, ".+?").replace(/'/g, "''")}$`
                sql += ` WHERE ${this.options.colKey} ~ '${pattern}'`
            }
            sql += ";"
            this.db.query(sql, [],
                (err, result) => {
                    if (err)
                        reject(err)
                    else {
                        const keys = result.rows.map((row) => row[this.options.colKey])
                        resolve(keys)
                    }
                }
            )
        })
    }

    /*  put value under key into store  */
    async put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.query(`INSERT INTO ${this.options.table} ` +
                `(${this.options.colKey}, ${this.options.colVal}) VALUES ($1, $2) ` +
                `ON CONFLICT (${this.options.colKey}) ` +
                `DO UPDATE SET ${this.options.colVal} = EXCLUDED.${this.options.colVal};`,
                [ key, JSON.stringify(value) ],
                (err) => {
                    if (err) reject(err)
                    else     resolve()
                }
            )
        })
    }

    /*  get value under key from store  */
    async get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT ${this.options.colVal} FROM ${this.options.table} ` +
                `WHERE ${this.options.colKey} = $1;`,
                [ key ],
                (err, result) => {
                    if (err)
                        reject(err)
                    else {
                        let value
                        if (result.rowCount === 1)
                            value = JSON.parse(result.rows[0][this.options.colVal])
                        resolve(value)
                    }
                }
            )
        })
    }

    /*  delete value under key from store  */
    async del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.query(`DELETE FROM ${this.options.table} ` +
                `WHERE ${this.options.colKey} = $1;`,
                [ key ],
                (err) => {
                    if (err) reject(err)
                    else     resolve()
                }
            )
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
                this.db.query("BEGIN TRANSACTION;", [],
                    (err) => {
                        if (err) reject(err)
                        else     resolve()
                    }
                )
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
            this.db.query("COMMIT;", [],
                (err) => {
                    if (err) reject(err)
                    else {
                        this.unlock((err) => {
                            if (err)
                                reject(err)
                            else {
                                this.unlock = null
                                this.locked = false
                                resolve()
                            }
                        })()
                    }
                }
            )
        })
    }

    /*  close connection  */
    async close () {
        if (!this.opened)
            throw new Error("still not opened")
        if (this.locked)
            await this.release()
        return new Promise((resolve, reject) => {
            this.db.end((err) => {
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

