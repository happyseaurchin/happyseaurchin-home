# The beach button: moved onto the beach

The beach button is served by the beach itself: **https://beach.happyseaurchin.com/button/button.js**. Its source, security case and hostile-page test live in [`pscale-commons/pscale-beach`](https://github.com/pscale-commons/pscale-beach) (`button/`, `npm run smoke:button`), mirrored into the clone that deploys the beach.

This folder keeps only `button.js`, a forwarding shim. A page that still carries `https://happyseaurchin.com/button/button.js` gets the beach's own loader, with its `data-` attributes passed along.
