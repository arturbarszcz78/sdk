# 1. Your first wallet

**You will:** install the SDK, create a wallet, keep its recovery phrase safe, connect to a
node and read a balance.

**Time:** 5 minutes · **Needs:** Node.js 20 or newer · **Costs:** nothing

## Install

The SDK is not on npm yet. Install it straight from GitHub; npm builds it on
install.

```sh
mkdir xe-hello && cd xe-hello
npm init -y
npm pkg set type=module
npm install github:xeprotocol/sdk
npm install --save-dev typescript @types/node
```

Node 22.18 and newer runs `.ts` files directly (`node wallet.ts`). On older Node,
compile with `npx tsc` or use a runner such as `tsx`.

## Create a wallet

A wallet is a single 32-byte **seed**. Everything else — the public key, the
address — is derived from it.

```ts
import { Wallet } from '@xeprotocol/sdk'

const phrase = Wallet.generatePhrase() // 24 words: save securely; never log them
const wallet = Wallet.fromPhrase(phrase)
console.log(wallet.address)   // your account: hand this out to receive funds
console.log(wallet.publicKey) // the key that signs for it
```

> **The seed is the money.** Anyone holding it controls the account, and there
> is no recovery if you lose it. The SDK keeps it in a private field, never puts
> it in an error message or a log line (`String(wallet)` is `Wallet(<address>)`,
> and `JSON.stringify(wallet)` holds only the address and public key), and never
> sends it anywhere. Your keys stay in your process; nodes only ever see signed
> blocks.

The phrase is standard BIP39 + SLIP-0010 ed25519 at `m/44'/1'/account'`.
Coin type 1 is provisional; account defaults to 0. Import accepts 12, 15, 18, 21
or 24 words. The phrase is your only backup unless you save the signing seed
separately. It cannot be recovered from the signing seed.

To keep a wallet between runs, save the phrase securely and load it back:

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { Wallet } from '@xeprotocol/sdk'

writeFileSync('wallet.phrase', Wallet.generatePhrase() + '\n', { mode: 0o600, flag: 'wx' })
const wallet = Wallet.fromPhrase(readFileSync('wallet.phrase', 'utf8'))
```

`Wallet.fromPhrase(phrase, { passphrase, account })` supports an explicitly
chosen BIP39 passphrase and account index. A wrong passphrase opens a different,
empty account. Keep it separately; the SDK never stores it. Never put the words
or passphrase on argv or in logs. `Wallet.validatePhrase` throws typed
`PhraseError` codes for word count, unknown word (1-based position), and checksum.

Wallets made before v2 restore from their hex seed using `Wallet.fromSeedHex`.
Old #1005 words derive a different account under v2. `Wallet.create()` remains a
raw-seed API and does not create a phrase.

## Address is not public key

They are both 64 hex characters, and they are **not** interchangeable:

| | What it is | Where it goes |
|---|---|---|
| `wallet.address` | `sha256("xe/account/v1" ‖ public key)` — the account's identity | sending funds, balance lookups, anything you share |
| `wallet.publicKey` | the ed25519 key — the credential | verifying signatures |

The types keep them apart too: `Address` and `PublicKey` are distinct, so passing
one where the other belongs is a compile error.

## Connect to a node

You do not run a node. Point the SDK at any public one:

```ts
import { Wallet, Xe, fromMicro } from '@xeprotocol/sdk'

const xe = new Xe({ client: 'https://ldn.core.test.network', wallet: Wallet.create() })
console.log(await xe.networkId()) // e.g. testnet-0004
console.log(fromMicro(await xe.balance('XE')))
```

`Xe` binds one wallet to one node. It reads your balance and chain position
before every write, signs locally, solves the proof of work and submits.

## Amounts are integers

XE and XUSD both have six decimal places, and every amount in the SDK is an
integer number of **micro-units** held in a `bigint`:

```ts
import { fromMicro, toMicro } from '@xeprotocol/sdk'

toMicro('1.5')        // 1_500_000n
fromMicro(1_500_000n) // '1.500000'
```

Never use `number` for amounts or timestamps. Timestamps are nanoseconds
(~1.8 × 10¹⁸) and balances can exceed 2⁵³; a `number` silently rounds them.

## The complete program

```ts title="first-wallet.ts"
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { Wallet, Xe, fromMicro } from '@xeprotocol/sdk'

const PHRASE_FILE = 'wallet.phrase'
const NODE = process.env['XE_NODE'] ?? 'https://ldn.core.test.network'

// Reuse the backup or create one without overwriting any existing file.
if (!existsSync(PHRASE_FILE)) {
  writeFileSync(PHRASE_FILE, Wallet.generatePhrase() + '\n', { mode: 0o600, flag: 'wx' })
  console.log(`created a wallet; back up ${PHRASE_FILE} securely`)
}
const wallet = Wallet.fromPhrase(readFileSync(PHRASE_FILE, 'utf8'))

const xe = new Xe({ client: NODE, wallet })
console.log(`network  ${await xe.networkId()}`)
console.log(`address  ${xe.address}`)
console.log(`XE       ${fromMicro(await xe.balance('XE'))}`)
console.log(`XUSD     ${fromMicro(await xe.balance('XUSD'))}`)
```

```sh
node first-wallet.ts
```

A new wallet shows a zero balance — it does not exist on the ledger yet. The
next tutorial fixes that.

**Next:** [2. Getting testnet funds](02-getting-testnet-funds.md)
