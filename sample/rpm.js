
const suite = require("./suite")

;(async () => {
    // await suite("rpm+sqlite:///test.db?table=kv&key=colKey&colVal=val")
    // await suite("rpm+pgsql://postgresql:postgresql@127.0.0.1:5432/example?table=kv&colKey=key&colVal=val")
    await suite("rpm+mysql://example:example@127.0.0.1:3306/example?table=kv&colKey=name&colVal=val")
    // await suite("rpm+redis://x:local-secret@127.0.0.1:6379/test")
})().catch((err) => {
    console.log(`ERROR: ${err}`)
})

