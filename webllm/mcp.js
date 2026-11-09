/* mcp.js — a remote MCP server's tools for a model in the browser (WebLLM), with no SDK and no server of ours.
 *
 * WebLLM can make any model, even a 1B, emit MCP-shaped tool calls: its structural tags (response_format
 * 'structural_tag') force <tool_call>{"name": …, "arguments": …}</tool_call> blocks whose arguments match each tool's
 * JSON schema (mlc-ai/web-llm examples/structural-tag-tool-use, whose tools are stubs). This gives those calls a real
 * server. MCP over Streamable HTTP is JSON-RPC over fetch, so a page needs three requests to begin (initialize,
 * notifications/initialized, tools/list) and one per call (tools/call); a server that allows the page's origin
 * (bsp-mcp at https://bsp.hermitcrab.me/mcp/v1 allows any) is reachable straight from the browser.
 *
 *   const m = await beachMcp.connect('https://bsp.hermitcrab.me/mcp/v1');
 *   const tools = beachMcp.slim(m.tools, { bsp: ['agent_id', 'block', 'spindle', 'pscale_attention'] });
 *   const format = beachMcp.structuralTag(tools);            // response_format for WebLLM
 *   const system = beachMcp.toolPrompt(tools);               // the tools in a few hundred characters
 *   const calls = beachMcp.parse(reply);                     // [{ name, arguments }]
 *   const result = await m.call(calls[0].name, calls[0].arguments);   // text
 *
 * A small model's window is small: bsp-mcp's own tool list is about 69,000 characters, so slim() keeps a tool's first
 * sentence and only the parameters named, and a tool not named is left out. Speaks protocol 2025-06-18 (a session
 * header). A server on 2026-07-28 drops sessions and wants Mcp-Method and Mcp-Name on every POST; a browser can send
 * them only where the server's CORS preflight lists them, which bsp-mcp's does not yet. */
(function (root) {
  'use strict';
  var PROTOCOL = '2025-06-18';

  function parseBody(text, type) {
    if (/text\/event-stream/.test(type || '')) {
      var last = null;
      String(text).split(/\r?\n/).forEach(function (line) {
        if (line.indexOf('data:') === 0) { try { var j = JSON.parse(line.slice(5).trim()); if (j && (j.result || j.error)) last = j; } catch (e) {} }
      });
      return last;
    }
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function connect(url, opts) {
    var f = (opts && opts.fetch) || root.fetch.bind(root), session = null, n = 0;
    function send(method, params, notify) {
      var body = { jsonrpc: '2.0', method: method };
      if (params) body.params = params;
      if (!notify) body.id = ++n;
      // no Mcp-Method or Mcp-Name: 2025-06-18 does not ask for them, and a header the server's preflight does not list
      // (bsp-mcp's lists Content-Type, mcp-session-id, mcp-protocol-version, Accept, Authorization) fails the request
      var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'MCP-Protocol-Version': PROTOCOL };
      if (session) headers['Mcp-Session-Id'] = session;
      return f(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function (r) {
        var sid = r.headers.get('mcp-session-id');
        if (sid) session = sid;
        if (notify) return null;
        return r.text().then(function (t) {
          var j = parseBody(t, r.headers.get('content-type'));
          if (!r.ok || !j) throw new Error('the server answered ' + r.status + (j && j.error ? ': ' + j.error.message : ''));
          if (j.error) throw new Error(j.error.message || 'the server refused ' + method);
          return j.result;
        });
      });
    }
    var info = null;
    return send('initialize', { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'webllm-on-the-beach', version: '0.1' } })
      .then(function (r) { info = r; return send('notifications/initialized', null, true); })
      .then(function () { return send('tools/list', {}); })
      .then(function (r) {
        return {
          info: info, tools: (r && r.tools) || [],
          call: function (name, args) {
            return send('tools/call', { name: name, arguments: args || {} }).then(function (res) {
              var text = ((res && res.content) || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('\n');
              return res && res.isError ? 'error: ' + text : text;
            });
          }
        };
      });
  }

  /** The tools named, each cut to its first sentence and the parameters named for it; every other tool left out. */
  function slim(tools, keep) {
    return (tools || []).filter(function (t) { return keep && keep[t.name]; }).map(function (t) {
      var props = (t.inputSchema && t.inputSchema.properties) || {}, want = keep[t.name], p = {};
      want.forEach(function (k) {
        if (!props[k]) return;
        var s = JSON.parse(JSON.stringify(props[k]));
        if (s.description) s.description = firstSentence(s.description, 140);
        if (s.anyOf && !s.type) { var a = s.anyOf.filter(function (x) { return x.type !== 'null'; })[0]; delete s.anyOf; if (a) s.type = a.type; }
        if (Array.isArray(s.type)) s.type = s.type.filter(function (x) { return x !== 'null'; })[0] || 'string';
        p[k] = s;
      });
      var required = ((t.inputSchema && t.inputSchema.required) || []).filter(function (k) { return want.indexOf(k) >= 0; });
      return { name: t.name, description: firstSentence(t.description || '', 220), schema: { type: 'object', properties: p, required: required, additionalProperties: false } };
    });
  }
  function firstSentence(s, max) {
    var m = String(s).replace(/\s+/g, ' ').trim().match(/^.*?[.!?](\s|$)/);
    var out = (m ? m[0] : String(s)).trim();
    return out.length > max ? out.slice(0, max - 1) + '…' : out;
  }

  /** WebLLM's response_format forcing one or more <tool_call> blocks whose arguments match each tool's schema. */
  function structuralTag(tools) {
    return {
      type: 'structural_tag',
      structural_tag: {
        type: 'structural_tag',
        format: {
          type: 'triggered_tags',
          triggers: ['<tool_call>'],
          tags: tools.map(function (t) {
            return { begin: '<tool_call>\n{"name": "' + t.name + '", "arguments": ', content: { type: 'json_schema', json_schema: t.schema }, end: '}\n</tool_call>' };
          }),
          at_least_one: true,
          stop_after_first: false
        }
      }
    };
  }
  function toolPrompt(tools) {
    return 'Call a tool by writing one <tool_call> block per call, a JSON body {"name": ..., "arguments": ...}, and no other words. Tools:\n' +
      tools.map(function (t) { return '- ' + t.name + ': ' + t.description + ' Arguments: ' + JSON.stringify(t.schema.properties); }).join('\n');
  }
  /** The <tool_call> blocks in a reply. Given the slimmed tools, a call to any other tool is dropped and its arguments
   *  are cut to the parameters that tool was given, so a model can never pass what it was not offered (a write's
   *  content, a key). */
  function parse(content, tools) {
    var re = /<tool_call>\s*({[\s\S]*?})\s*<\/tool_call>/g, m, out = [];
    while ((m = re.exec(String(content || ''))) !== null) {
      try {
        var j = JSON.parse(m[1]);
        if (typeof j.name !== 'string' || !j.arguments || typeof j.arguments !== 'object') continue;
        if (tools) {
          var t = tools.filter(function (x) { return x.name === j.name; })[0];
          if (!t) continue;
          var args = {};
          Object.keys(t.schema.properties).forEach(function (k) { if (j.arguments[k] !== undefined) args[k] = j.arguments[k]; });
          j.arguments = args;
        }
        out.push({ name: j.name, arguments: j.arguments });
      } catch (e) {}
    }
    return out;
  }

  var api = { connect: connect, slim: slim, structuralTag: structuralTag, toolPrompt: toolPrompt, parse: parse, PROTOCOL: PROTOCOL };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.beachMcp = api;
})(typeof window !== 'undefined' ? window : globalThis);
