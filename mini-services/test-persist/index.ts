const server = Bun.serve({
  port: 3999,
  fetch(req) {
    return new Response("HELLO from persistent service at " + new Date().toISOString());
  },
});
console.log("Test persist service running on port 3999");
