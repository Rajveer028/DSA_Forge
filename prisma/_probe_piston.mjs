const payload = {
  language: "python",
  version: "3.10.0",
  files: [{ name: "main.py", content: "print(int(input())+1)" }],
  stdin: "41\n",
  run_timeout: 3000,
};

const res = await fetch("https://emkc.org/api/v2/piston/execute", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
const pyText = await res.text();
console.log("python status", res.status, pyText.slice(0, 800));

const c = {
  language: "c",
  version: "10.2.0",
  files: [
    {
      name: "main.c",
      content: "#include <stdio.h>\nint main(){int x; if(scanf(\"%d\",&x)!=1) return 1; printf(\"%d\",x+1); return 0;}\n",
    },
  ],
  stdin: "7\n",
  compile_timeout: 15000,
  run_timeout: 3000,
};
const res2 = await fetch("https://emkc.org/api/v2/piston/execute", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(c),
});
const cText = await res2.text();
console.log("c status", res2.status, cText.slice(0, 800));
