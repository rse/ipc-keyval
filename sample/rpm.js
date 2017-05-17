
const suite = require("./suite")

;(async () => {
    await suite("rpm+sqlite:///test.db?table=kv&key=key&val=val")
    await suite("rpm+pgsql://postgresql:postgresql@127.0.0.1:5432/example?table=kv&key=key&val=val")
    await suite("rpm+redis://x:local-secret@127.0.0.1:6379/test")
})()

