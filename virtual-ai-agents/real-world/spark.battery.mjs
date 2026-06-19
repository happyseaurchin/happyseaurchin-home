// spark.battery.mjs — conformance battery for spark.js, ported 1:1 from
// pscale-biome/src/spark/test-battery/spark-battery.py (genome v5).
//
// Run (spark.js uses ESM `export`, so load it as a module):
//   mkdir -p /tmp/sb && cp spark.js /tmp/sb/ && cp spark.battery.mjs /tmp/sb/ \
//     && printf '{"type":"module"}' > /tmp/sb/package.json && node /tmp/sb/spark.battery.mjs
// Exits nonzero on any failure.

import { parse, floor, spark, fold, parseReference, AddressError } from "./spark.js";

let P = 0, F = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function ok(label, got, exp) {
  if (eq(got, exp)) { P++; console.log("  pass", label); }
  else { F++; console.log("  FAIL", label, "\n    got", JSON.stringify(got), "\n    exp", JSON.stringify(exp)); }
}
function raises(label, fn) {
  try { fn(); F++; console.log("  FAIL", label, "(no error raised)"); }
  catch (e) {
    if (e instanceof AddressError) { P++; console.log("  pass", label); }
    else { F++; console.log("  FAIL", label, "(wrong error:", e.message + ")"); }
  }
}

console.log("address parsing");
ok("bare >= floor", parse("305", 2), ["3", "0", "5"]);
ok("bare < floor", parse("3", 2), ["0", "3"]);
ok("bare == floor", parse("35", 2), ["3", "5"]);
ok("dotted left==floor", parse("30.5", 2), ["3", "0", "5"]);
ok("dotted left<floor", parse("34.5", 4), ["0", "0", "3", "4", "5"]);
ok("empty", parse("", 1), []);
raises("multi-dot rejected", () => parse("1.2.3", 1));
raises("non-digit rejected", () => parse("1a", 1));
raises("exceeds-floor rejected", () => parse("12.3", 1));
raises("ring write refuses non-object content",
  () => spark({ "0": "r", "1": "a" }, "1.1", 0, { content: "a string" }));

console.log("floor");
ok("floor 1", floor({ "0": "r" }), 1);
ok("floor 2", floor({ "0": { "0": "r" } }), 2);
ok("floor 3", floor({ "0": { "0": { "0": "r" } } }), 3);

const F1 = { "0": "root", "1": { "0": "A", "2": { "0": "A2", "3": "A23" } } };
console.log("read shapes (floor 1)");
ok("point 1@0", spark(F1, "1", 0).text, "A");
ok("point absent", spark(F1, "5", 0).status, "absent");
ok("directory 1@-1", spark(F1, "1", -1).subtree, { "0": "A", "2": "A2" });
ok("spindle 1.2 texts", spark(F1, "1.2").entries.map(e => e.text), ["A", "A2"]);
ok("disc @0", spark(F1, null, 0).nodes.map(n => [n.address, n.text]), [["0", "root"], ["1", "A"]]);
ok("disc @-1", spark(F1, null, -1).nodes.map(n => [n.address, n.text]).sort(), [["10", "A"], ["12", "A2"]]);

const RNG = { "0": "place", "1": "north", "2": "east", "3": "south" };
const r = spark(RNG, "2.5", 0);
ok("ring head (0 is the head)", r.head, "place");
ok("ring digits (1-9 only)", r.siblings.map(s => s.digit), ["1", "2", "3"]);
ok("ring walked", r.siblings.filter(s => s.is_walked).map(s => s.digit), ["2"]);

console.log("clean geometry (floor 2: 0,1 is an ordinary point)");
const F2 = { "0": { "0": "deep", "1": "at01" }, "1": "top" };
ok("floor(F2)", floor(F2), 2);
ok("bare 1 -> position 0,1", spark(F2, "1", 0).text, "at01");

console.log("supernest invariance");
ok("1.2 @ floor 1", spark(F1, "1.2", -1).text, "A2");
const SUP = { "0": { "0": "root", "1": { "0": "A", "2": { "0": "A2", "3": "A23" } } } };
ok("floor(SUP)", floor(SUP), 2);
ok("1.2 @ floor 2 (same semantic)", spark(SUP, "1.2", -1).text, "A2");

console.log("writes (conjugate of reads)");
const W = { "0": "root", "1": "branch one" };
spark(W, "1.234", null, { content: "deep" });
ok("point-write + lift", W, { "0": "root", "1": { "0": "branch one", "2": { "3": { "4": "deep" } } } });
const RW = { "0": "p", "1": "a", "2": "b" };
spark(RW, "1.5", 0, { content: { "1": "x", "3": "z" } });
ok("ring-write (0 kept as head)", RW, { "0": "p", "1": "x", "3": "z" });
const DW = { "0": "x", "1": "y" };
spark(DW, "1", -1, { content: { "0": "new", "3": "q" } });
ok("directory-write", DW, { "0": "x", "1": { "0": "new", "3": "q" } });
const WW = { "0": "old", "5": "gone" };
spark(WW, null, null, { content: { "0": "new", "1": "leaf" } });
ok("whole-write", WW, { "0": "new", "1": "leaf" });

console.log("fold");
const B1 = { "0": "spatial", "1": "taproom" }, B2 = { "0": "caris", "1": "too loud" };
ok("fold @0", fold([B1, B2], 0).blocks.map(b => b.nodes.map(n => [n.address, n.text])),
  [[["0", "spatial"], ["1", "taproom"]], [["0", "caris"], ["1", "too loud"]]]);

console.log("reference parsing");
ok("bare name", parseReference("kindling"), ["kindling", null, null]);
ok("name:address", parseReference("kindling:5"), ["kindling", "5", null]);
ok("name:address:attention", parseReference("kindling:5.1:-3"), ["kindling", "5.1", -3]);
ok("namespaced", parseReference("sed:commons:13:-1"), ["sed:commons", "13", -1]);
ok("prose -> none", parseReference("this is just text"), null);
ok("digit-led -> none", parseReference("123"), null);

console.log("star resolution");
const TGT = { "0": "the target", "1": "deep value" };
const loader = n => ({ tgt: TGT }[n] ?? null);
const REF = { "0": "idx", "1": "tgt:1:0", "2": "plain text here", "3": "missing:1:0" };
ok("star follows reference", spark(REF, "1", 0, { star: true, loader }).text, "deep value");
ok("no star -> verbatim", spark(REF, "1", 0).text, "tgt:1:0");
ok("prose leaf verbatim", spark(REF, "2", 0, { star: true, loader }).text, "plain text here");
ok("missing block verbatim", spark(REF, "3", 0, { star: true, loader }).text, "missing:1:0");
const A = { "0": "a", "1": "bref:1:0" }, B = { "0": "b", "1": "cref:1:0" }, C = { "0": "c", "1": "final" };
const chain = n => ({ bref: B, cref: C }[n] ?? null);
ok("star chain A->B->C", spark(A, "1", 0, { star: true, loader: chain }).text, "final");

console.log("\nTOTAL: " + P + " passed, " + F + " failed");
process.exit(F ? 1 : 0);
