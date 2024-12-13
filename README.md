# Serialized Executor

Have you ever tired of spamming awaits or using for-await to ensure executions are serialized?

Then this library is for you! It does help you...something.

## Install

`no, this package is not uploaded to anywhere yet (I heard there are some ways to use packages on github but idk)`

## Usage

```ts
import { SerializedExecutor } from "serialiezd-executor";

// You can specify timeout to make sure broken function do not stop entire queue
const exec = new SerializedExecutor({ timeout: 1000 });

const n = async () => {
  // do some async things here
};

// (Todo: some example text here)
const result = await exec.execute(n);
```

Todo

- serialization example
- debounce example
