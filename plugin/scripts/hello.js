#!/usr/bin/env node

// src/hello.ts
function hello() {
  return "Hello from plugin-scripts!";
}
console.log(hello());
export {
  hello
};
